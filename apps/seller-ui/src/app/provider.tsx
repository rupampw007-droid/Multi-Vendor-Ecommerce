'use client'; // Mark this as a Client Component

import { WebSocketProvider } from '@/context/websocket-context';
import useSeller from '@/hooks/useSeller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProvidersWithWebSocket>{children}</ProvidersWithWebSocket>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

const ProvidersWithWebSocket = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { seller } = useSeller();
  return (
    <>
      {seller && (
        <WebSocketProvider seller={seller}>{children}</WebSocketProvider>
      )}
      {!seller && children}
    </>
  );
};
