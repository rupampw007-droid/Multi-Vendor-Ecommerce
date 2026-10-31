'use client';

import {
  ChatSocketProvider,
  useChatSocket,
} from '@repo/components/chat/socket-context';

export const WebSocketProvider = ({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { id: string };
}) => (
  <ChatSocketProvider
    identityId={user.id}
    role="user"
    url={process.env.NEXT_PUBLIC_CHATTING_WEBSOCKET_URI}
  >
    {children}
  </ChatSocketProvider>
);

export const useWebSocket = useChatSocket;
