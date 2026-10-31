import { ValidationError } from '@repo/error-handler';
import prisma from '@repo/lib/prisma/prisma';
import redis from '@repo/lib/redis';
import { clearUnseenCount, incrementUnseenCount } from '@repo/lib/redis/message.redis';
import { NextFunction, Request, Response } from 'express';
import { emitToIdentity } from '../websocket';

type ChatRole = 'user' | 'seller';
type ChatRequest = Request & {
  user?: { id: string } | null;
  seller?: { id: string } | null;
  role?: string;
  body: {
    sellerId?: unknown;
    shopId?: unknown;
    conversationId?: unknown;
    clientTempId?: unknown;
    content?: unknown;
  };
};

const presenceKey = (role: ChatRole, id: string) => `online:${role}:${id}`;
const firstPageCacheKey = (conversationId: string) =>
  `chat:messages:${conversationId}:first`;

const getRequester = (req: ChatRequest): { id: string; role: ChatRole } | null => {
  if (req.role === 'user' && req.user?.id) {
    return { id: req.user.id, role: 'user' };
  }
  if (req.role === 'seller' && req.seller?.id) {
    return { id: req.seller.id, role: 'seller' };
  }
  return null;
};

const getCounterparty = (
  participants: Array<{ userId: string | null; sellerId: string | null }>,
  role: ChatRole,
) => {
  const participant = participants.find((item) =>
    role === 'user' ? item.sellerId : item.userId,
  );
  return role === 'user'
    ? { id: participant?.sellerId ?? null, role: 'seller' as const }
    : { id: participant?.userId ?? null, role: 'user' as const };
};

const conversationParticipantWhere = (
  conversationId: string,
  requester: { id: string; role: ChatRole },
) => ({
  conversationId,
  ...(requester.role === 'user'
    ? { userId: requester.id }
    : { sellerId: requester.id }),
});

// Create or reuse a direct user/seller conversation.
export const newConversation = async (
  req: ChatRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requester = getRequester(req);
    if (!requester || requester.role !== 'user') {
      return res.status(403).json({ message: 'Only users can start a conversation.' });
    }

    const requestedSellerId = req.body?.sellerId ?? req.body?.shopId;
    if (typeof requestedSellerId !== 'string' || !requestedSellerId.trim()) {
      return next(new ValidationError('Seller Id is required!'));
    }

    let seller = await prisma.sellers.findUnique({
      where: { id: requestedSellerId },
      select: { id: true },
    });
    if (!seller) {
      const shop = await prisma.shops.findUnique({
        where: { id: requestedSellerId },
        select: { sellerId: true },
      });
      if (shop) {
        seller = { id: shop.sellerId };
      }
    }
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found.' });
    }

    const existingGroup = await prisma.conversationGroup.findFirst({
      where: {
        isGroup: false,
        participantIds: { hasEvery: [requester.id, seller.id] },
      },
    });
    if (existingGroup) {
      return res.status(200).json({ conversation: existingGroup, isNew: false });
    }

    const conversation = await prisma.conversationGroup.create({
      data: {
        isGroup: false,
        creatorId: requester.id,
        participantIds: [requester.id, seller.id],
      },
    });
    await prisma.participant.createMany({
      data: [
        { conversationId: conversation.id, userId: requester.id },
        { conversationId: conversation.id, sellerId: seller.id },
      ],
    });

    return res.status(201).json({ conversation, isNew: true });
  } catch (error) {
    return next(error);
  }
};

const listConversations = async (role: ChatRole, id: string) => {
  const conversations = await prisma.conversationGroup.findMany({
    where: { participantIds: { has: id } },
    orderBy: { updatedAt: 'desc' },
  });
  if (!conversations.length) return [];

  const conversationIds = conversations.map(({ id: conversationId }) => conversationId);
  const [participants, messages] = await Promise.all([
    prisma.participant.findMany({
      where: { conversationId: { in: conversationIds } },
    }),
    prisma.message.findMany({
      where: { conversationId: { in: conversationIds } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
  ]);

  const otherIds = new Set<string>();
  const unreadByConversation = new Map<string, number>();
  const participantByConversation = new Map<
    string,
    { userId: string | null; sellerId: string | null; unreadCount: number }
  >();

  for (const participant of participants) {
    if (role === 'user' && participant.userId === id) {
      unreadByConversation.set(participant.conversationId, participant.unreadCount);
    } else if (role === 'seller' && participant.sellerId === id) {
      unreadByConversation.set(participant.conversationId, participant.unreadCount);
    }
    if (participant.userId !== id && participant.sellerId !== id) {
      participantByConversation.set(participant.conversationId, participant);
      const otherId = role === 'user' ? participant.sellerId : participant.userId;
      if (otherId) otherIds.add(otherId);
    }
  }

  const [sellers, users] = await Promise.all([
    role === 'user' && otherIds.size
      ? prisma.sellers.findMany({
          where: { id: { in: [...otherIds] } },
          include: { shop: { include: { avatars: true } } },
        })
      : Promise.resolve([]),
    role === 'seller' && otherIds.size
      ? prisma.users.findMany({
          where: { id: { in: [...otherIds] } },
          include: { avatars: true },
        })
      : Promise.resolve([]),
  ]);

  const profilesById = new Map<
    string,
    { name: string; avatar: string | null }
  >();
  for (const seller of sellers) {
    profilesById.set(seller.id, {
      name: seller.shop?.name || seller.name || 'Seller',
      avatar: seller.shop?.avatars?.[0]?.url ?? null,
    });
  }
  for (const user of users) {
    profilesById.set(user.id, {
      name: user.name || 'User',
      avatar: user.avatars?.[0]?.url ?? null,
    });
  }

  const lastMessageByConversation = new Map<
    string,
    (typeof messages)[number]
  >();
  for (const message of messages) {
    if (!lastMessageByConversation.has(message.conversationId)) {
      lastMessageByConversation.set(message.conversationId, message);
    }
  }

  const statusIds = [...otherIds];
  const statusKeys = statusIds.map((otherId) =>
    presenceKey(role === 'user' ? 'seller' : 'user', otherId),
  );
  const presenceValues = statusKeys.length ? await redis.mget(...statusKeys) : [];
  const onlineById = new Map(
    statusIds.map((otherId, index) => [otherId, Boolean(presenceValues[index])]),
  );

  return conversations.map((conversation) => {
    const participant = participantByConversation.get(conversation.id);
    const otherId = role === 'user' ? participant?.sellerId : participant?.userId;
    const profile = otherId ? profilesById.get(otherId) : undefined;
    const lastMessage = lastMessageByConversation.get(conversation.id);
    const otherParty = {
      id: otherId ?? null,
      name: profile?.name ?? (role === 'user' ? 'Seller' : 'User'),
      avatar: profile?.avatar ?? null,
      isOnline: otherId ? onlineById.get(otherId) ?? false : false,
    };

    return {
      conversationId: conversation.id,
      ...(role === 'user' ? { seller: otherParty } : { user: otherParty }),
      lastMessage:
        lastMessage?.content ?? 'Say something to start the conversation',
      lastMessageAt: lastMessage?.createdAt ?? conversation.updatedAt,
      unreadCount: unreadByConversation.get(conversation.id) ?? 0,
    };
  });
};

export const getUserConversations = async (
  req: ChatRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requester = getRequester(req);
    if (!requester || requester.role !== 'user') {
      return res.status(403).json({ message: 'User access required.' });
    }
    const responseData = await listConversations('user', requester.id);
    return res.status(200).json({ conversations: responseData });
  } catch (error) {
    return next(error);
  }
};

export const getSellerConversations = async (
  req: ChatRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requester = getRequester(req);
    if (!requester || requester.role !== 'seller') {
      return res.status(403).json({ message: 'Seller access required.' });
    }
    const responseData = await listConversations('seller', requester.id);
    return res.status(200).json({ conversations: responseData });
  } catch (error) {
    return next(error);
  }
};

const fetchConversationMessages = async (
  req: ChatRequest,
  res: Response,
  next: NextFunction,
  role: ChatRole,
) => {
  try {
    const requester = getRequester(req);
    if (!requester || requester.role !== role) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { conversationId } = req.params;
    const conversation = await prisma.conversationGroup.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const participantWhere = conversationParticipantWhere(conversationId, requester);
    const isParticipant = await prisma.participant.findFirst({
      where: participantWhere,
      select: { id: true },
    });
    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const rawCursor = req.query.cursor;
    const cursor = typeof rawCursor === 'string' ? rawCursor : undefined;
    if (cursor) {
      const cursorMessage = await prisma.message.findFirst({
        where: { id: cursor, conversationId },
        select: { id: true },
      });
      if (!cursorMessage) {
        return res.status(400).json({ message: 'Invalid message cursor.' });
      }
    }

    const unseenMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderType: { not: role },
        status: { not: 'seen' },
      },
      select: { id: true, senderId: true, senderType: true },
    });
    const seenAt = new Date();
    if (unseenMessages.length) {
      await prisma.message.updateMany({
        where: { id: { in: unseenMessages.map(({ id }) => id) } },
        data: { status: 'seen' },
      });
    }
    await prisma.participant.updateMany({
      where: participantWhere,
      data: { unreadCount: 0, lastSeenAt: seenAt },
    });
    await clearUnseenCount(role, conversationId);

    if (unseenMessages.length) {
      await redis.del(firstPageCacheKey(conversationId));
      const messagesBySender = new Map<string, string[]>();
      for (const message of unseenMessages) {
        const key = `${message.senderType}:${message.senderId}`;
        const senderMessages = messagesBySender.get(key) ?? [];
        senderMessages.push(message.id);
        messagesBySender.set(key, senderMessages);
      }
      for (const [key, messageIds] of messagesBySender) {
        const [senderRole, senderId] = key.split(':');
        if (senderRole === 'user' || senderRole === 'seller') {
          emitToIdentity(senderRole, senderId, {
            type: 'messages_seen',
            payload: { conversationId, messageIds, seenAt: seenAt.toISOString() },
          });
        }
      }
    }
    emitToIdentity(role, requester.id, {
      type: 'unread_count',
      payload: { conversationId, count: 0 },
    });

    const cacheKey = firstPageCacheKey(conversationId);
    if (!cursor) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }
    }

    const page = await prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 26,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = page.length > 25;
    const messages = page.slice(0, 25);
    const responseData = {
      messages,
      nextCursor: hasMore ? messages[messages.length - 1]?.id ?? null : null,
      hasMore,
    };
    if (!cursor) {
      await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 60);
    }
    return res.status(200).json(responseData);
  } catch (error) {
    return next(error);
  }
};

export const fetchMessages = (req: ChatRequest, res: Response, next: NextFunction) =>
  fetchConversationMessages(req, res, next, 'user');

export const fetchSellerMessages = (
  req: ChatRequest,
  res: Response,
  next: NextFunction,
) => fetchConversationMessages(req, res, next, 'seller');

export const sendMessage = async (
  req: ChatRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requester = getRequester(req);
    if (!requester) return res.status(403).json({ message: 'Access denied.' });

    const { conversationId, clientTempId } = req.body ?? {};
    const content =
      typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (
      typeof conversationId !== 'string' ||
      !conversationId ||
      !content ||
      content.length > 5000
    ) {
      return next(
        new ValidationError('A conversation and a message of 1-5000 characters are required.'),
      );
    }

    const participants = await prisma.participant.findMany({
      where: { conversationId },
      select: { userId: true, sellerId: true },
    });
    const senderIsParticipant = participants.some((participant) =>
      requester.role === 'user'
        ? participant.userId === requester.id
        : participant.sellerId === requester.id,
    );
    if (!senderIsParticipant) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }
    const counterparty = getCounterparty(participants, requester.role);
    if (!counterparty.id) {
      return res.status(400).json({ message: 'Conversation has no other participant.' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: requester.id,
        senderType: requester.role,
        content,
        attatchments: [],
        status: 'sent',
      },
    });
    await Promise.all([
      prisma.conversationGroup.update({
        where: { id: conversationId },
        data: { updatedAt: message.createdAt },
      }),
      prisma.participant.updateMany({
        where: {
          conversationId,
          ...(counterparty.role === 'user'
            ? { userId: counterparty.id }
            : { sellerId: counterparty.id }),
        },
        data: { unreadCount: { increment: 1 } },
      }),
      redis.del(firstPageCacheKey(conversationId)),
      incrementUnseenCount(counterparty.role, conversationId),
    ]);

    const unreadParticipant = await prisma.participant.findFirst({
      where: {
        conversationId,
        ...(counterparty.role === 'user'
          ? { userId: counterparty.id }
          : { sellerId: counterparty.id }),
      },
      select: { unreadCount: true },
    });
    const payload = {
      ...message,
      clientTempId:
        typeof clientTempId === 'string' ? clientTempId.slice(0, 100) : undefined,
    };
    emitToIdentity(counterparty.role, counterparty.id, {
      type: 'new_message',
      payload,
    });
    emitToIdentity(requester.role, requester.id, {
      type: 'new_message',
      payload,
    });
    emitToIdentity(counterparty.role, counterparty.id, {
      type: 'unread_count',
      payload: { conversationId, count: unreadParticipant?.unreadCount ?? 1 },
    });

    return res.status(201).json({ message: payload });
  } catch (error) {
    return next(error);
  }
};
