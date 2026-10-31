import prisma from '@repo/lib/prisma/prisma';
import redis from '@repo/lib/redis';
import jwt from 'jsonwebtoken';
import { IncomingMessage, Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

type ChatRole = 'user' | 'seller';
type ChatIdentity = { role: ChatRole; id: string };
type ClientEvent = {
  type?: string;
  role?: ChatRole;
  conversationId?: string;
  messageId?: string;
  isTyping?: boolean;
};

const connectedSockets = new Map<string, Set<WebSocket>>();
const identityKey = ({ role, id }: ChatIdentity) => `${role}:${id}`;
const presenceKey = ({ role, id }: ChatIdentity) => `online:${role}:${id}`;

const send = (socket: WebSocket, event: unknown) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  }
};

export const emitToIdentity = (
  role: ChatRole,
  id: string,
  event: unknown,
): boolean => {
  const sockets = connectedSockets.get(identityKey({ role, id }));
  if (!sockets?.size) return false;
  for (const socket of sockets) send(socket, event);
  return true;
};

const getCookie = (request: IncomingMessage, name: string) => {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.trim().slice(name.length + 1));
  } catch {
    return null;
  }
};

const authenticateSocket = (
  request: IncomingMessage,
  role: ChatRole,
): ChatIdentity | null => {
  const token = getCookie(
    request,
    role === 'user' ? 'access_token' : 'seller-access-token',
  );
  if (!token || !process.env.ACCESS_TOKEN_SECRET) return null;

  try {
    const claims = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as {
      id?: string;
      role?: string;
    };
    if (
      typeof claims.id !== 'string' ||
      claims.role !== role
    ) {
      return null;
    }
    return { id: claims.id, role: claims.role };
  } catch {
    return null;
  }
};

const getCounterparty = async (
  conversationId: string,
  identity: ChatIdentity,
): Promise<ChatIdentity | null> => {
  const participants = await prisma.participant.findMany({
    where: { conversationId },
    select: { userId: true, sellerId: true },
  });
  const otherParticipant = participants.find((participant) =>
    identity.role === 'user'
      ? participant.sellerId
      : participant.userId,
  );
  const id =
    identity.role === 'user'
      ? otherParticipant?.sellerId
      : otherParticipant?.userId;
  return id
    ? { id, role: identity.role === 'user' ? 'seller' : 'user' }
    : null;
};

const isParticipant = async (
  conversationId: string,
  identity: ChatIdentity,
) => {
  const participant = await prisma.participant.findFirst({
    where: {
      conversationId,
      ...(identity.role === 'user'
        ? { userId: identity.id }
        : { sellerId: identity.id }),
    },
    select: { id: true },
  });
  return Boolean(participant);
};

const notifyPresence = async (
  identity: ChatIdentity,
  isOnline: boolean,
) => {
  const memberships = await prisma.participant.findMany({
    where:
      identity.role === 'user'
        ? { userId: identity.id }
        : { sellerId: identity.id },
    select: { conversationId: true },
  });
  if (!memberships.length) return;

  const peers = await prisma.participant.findMany({
    where: {
      conversationId: { in: memberships.map(({ conversationId }) => conversationId) },
      ...(identity.role === 'user'
        ? { sellerId: { not: null } }
        : { userId: { not: null } }),
    },
    select: { userId: true, sellerId: true },
  });
  const peerIds = new Set(
    peers
      .map((participant) =>
        identity.role === 'user' ? participant.sellerId : participant.userId,
      )
      .filter((id): id is string => Boolean(id)),
  );
  for (const peerId of peerIds) {
    emitToIdentity(identity.role === 'user' ? 'seller' : 'user', peerId, {
      type: 'presence_update',
      payload: { role: identity.role, id: identity.id, isOnline },
    });
  }
};

const handleClientEvent = async (
  socket: WebSocket,
  identity: ChatIdentity,
  event: ClientEvent,
) => {
  if (event.type === 'heartbeat') {
    await redis.expire(presenceKey(identity), 300);
    return;
  }

  if (
    event.type !== 'typing' &&
    event.type !== 'delivered'
  ) {
    return;
  }
  if (!event.conversationId || !(await isParticipant(event.conversationId, identity))) {
    send(socket, { type: 'error', payload: { message: 'Conversation access denied.' } });
    return;
  }

  const counterparty = await getCounterparty(event.conversationId, identity);
  if (!counterparty) return;

  if (event.type === 'typing') {
    emitToIdentity(counterparty.role, counterparty.id, {
      type: 'typing',
      payload: {
        conversationId: event.conversationId,
        role: identity.role,
        isTyping: Boolean(event.isTyping),
      },
    });
    return;
  }

  if (!event.messageId) return;
  const message = await prisma.message.findFirst({
    where: {
      id: event.messageId,
      conversationId: event.conversationId,
      senderType: counterparty.role,
    },
    select: { id: true, senderId: true },
  });
  if (!message) return;

  await prisma.message.updateMany({
    where: { id: message.id, status: { not: 'seen' } },
    data: { status: 'delivered' },
  });
  emitToIdentity(counterparty.role, message.senderId, {
    type: 'message_status',
    payload: {
      conversationId: event.conversationId,
      messageId: message.id,
      status: 'delivered',
    },
  });
};

export async function createWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (socket, request) => {
    let identity: ChatIdentity | null = null;

    socket.on('message', (rawMessage) => {
      try {
        const event = JSON.parse(rawMessage.toString()) as ClientEvent;
        if (!identity) {
          if (event.type !== 'register' || !event.role) {
            socket.close(1008, 'Chat role registration required');
            return;
          }
          const authenticatedIdentity = authenticateSocket(request, event.role);
          if (!authenticatedIdentity) {
            socket.close(1008, 'Authentication required');
            return;
          }
          identity = authenticatedIdentity;
          const key = identityKey(identity);
          const sockets = connectedSockets.get(key) ?? new Set<WebSocket>();
          sockets.add(socket);
          connectedSockets.set(key, sockets);
          void redis
            .set(presenceKey(identity), '1', 'EX', 300)
            .then(() => notifyPresence(authenticatedIdentity, true))
            .catch((error) => console.error('Unable to publish chat presence:', error));
          send(socket, {
            type: 'ready',
            payload: { role: identity.role, id: identity.id },
          });
          return;
        }

        const authenticatedIdentity = identity;
        void handleClientEvent(socket, authenticatedIdentity, event).catch((error) => {
          console.error('Unable to handle chat websocket event:', error);
          send(socket, { type: 'error', payload: { message: 'Chat event failed.' } });
        });
      } catch (error) {
        console.error('Invalid chat websocket event:', error);
        send(socket, { type: 'error', payload: { message: 'Invalid event format.' } });
      }
    });

    socket.on('close', () => {
      if (!identity) return;
      const currentIdentity = identity;
      const key = identityKey(currentIdentity);
      const currentSockets = connectedSockets.get(key);
      currentSockets?.delete(socket);
      if (currentSockets?.size) return;

      connectedSockets.delete(key);
      void redis
        .del(presenceKey(currentIdentity))
        .then(() => notifyPresence(currentIdentity, false))
        .catch((error) => console.error('Unable to clear chat presence:', error));
    });

    socket.on('error', (error) => {
      console.error('Chat websocket error:', error);
    });
  });
}
