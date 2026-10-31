'use client';

import {
  ChatSocketProvider,
  useChatSocket,
} from '@repo/components/chat/socket-context';

export const WebSocketProvider = ({
  children,
  seller,
}: {
  children: React.ReactNode;
  seller: { id: string };
}) => (
  <ChatSocketProvider
    identityId={seller.id}
    role="seller"
    url={process.env.NEXT_PUBLIC_CHATTING_WEBSOCKET_URI}
  >
    {children}
  </ChatSocketProvider>
);

export const useWebSocket = useChatSocket;
