'use client';

import type { AxiosInstance } from 'axios';
import { useChatSocket } from './socket-context';
import { useEffect, useState } from 'react';

export const ChatUnreadBadge = ({
  role,
  api,
}: {
  role: 'user' | 'seller';
  api: AxiosInstance;
}) => {
  const { socket } = useChatSocket();
  const [unreadByConversation, setUnreadByConversation] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    let active = true;
    const refresh = () => {
      const path =
        role === 'user'
          ? '/chatting/api/get-user-conversation'
          : '/chatting/api/get-seller-conversations';
      void api
        .get<{ conversations: Array<{ conversationId: string; unreadCount: number }> }>(
          path,
        )
        .then(({ data }) => {
          if (!active) return;
          setUnreadByConversation(
            Object.fromEntries(
              (data.conversations ?? []).map(({ conversationId, unreadCount }) => [
                conversationId,
                Number(unreadCount) || 0,
              ]),
            ),
          );
        })
        .catch((error: unknown) => {
          console.error('Unable to load chat unread count:', error);
        });
    };

    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [api, role]);

  useEffect(() => {
    if (!socket) return;
    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'unread_count' || !data.payload?.conversationId) return;
        setUnreadByConversation((current) => ({
          ...current,
          [data.payload.conversationId]: Math.max(0, Number(data.payload.count) || 0),
        }));
      } catch {
        return;
      }
    };
    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  const unreadCount = Object.values(unreadByConversation).reduce(
    (total, count) => total + count,
    0,
  );
  if (!unreadCount) return null;

  return (
    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold leading-none text-white">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
};
