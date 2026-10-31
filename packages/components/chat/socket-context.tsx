'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

type ChatSocketContextValue = {
  socket: WebSocket | null;
  connected: boolean;
};

const ChatSocketContext = createContext<ChatSocketContextValue>({
  socket: null,
  connected: false,
});

export const ChatSocketProvider = ({
  children,
  identityId,
  role,
  url,
}: {
  children: ReactNode;
  identityId: string;
  role: 'user' | 'seller';
  url?: string;
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!identityId || !url) return;

    let active = true;
    let currentSocket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (!active) return;
      currentSocket = new WebSocket(url);
      setSocket(currentSocket);

      currentSocket.onopen = () => {
        if (!active) return;
        setConnected(true);
        currentSocket?.send(JSON.stringify({ type: 'register', role }));
        heartbeatTimer = setInterval(() => {
          if (currentSocket?.readyState === WebSocket.OPEN) {
            currentSocket.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 60_000);
      };
      currentSocket.onclose = () => {
        if (!active) return;
        setConnected(false);
        setSocket(null);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        reconnectTimer = setTimeout(connect, 2_000);
      };
      currentSocket.onerror = () => currentSocket?.close();
    };

    connect();
    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      currentSocket?.close();
      setSocket(null);
      setConnected(false);
    };
  }, [identityId, role, url]);

  return (
    <ChatSocketContext.Provider value={{ socket, connected }}>
      {children}
    </ChatSocketContext.Provider>
  );
};

export const useChatSocket = () => useContext(ChatSocketContext);
