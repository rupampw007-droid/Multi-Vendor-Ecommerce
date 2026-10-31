'use client';

import { ChatInbox } from '@repo/components/chat/chat-inbox';
import useRequireAuth from '@/hooks/useRequiredAuth';
import axiosInstance from '@/utils/axiosInstance';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const InboxContent = () => {
  const searchParams = useSearchParams();
  const { user, isLoading } = useRequireAuth();
  if (isLoading || !user) {
    return (
      <div className="mx-auto mt-8 h-[min(82vh,900px)] min-h-[560px] max-w-[1500px] animate-pulse rounded-xl bg-slate-200" />
    );
  }

  return (
    <main className="min-h-[calc(100vh-150px)] bg-slate-100 px-2 py-4 sm:px-5 sm:py-6">
      <ChatInbox
        role="user"
        api={axiosInstance}
        initialConversationId={searchParams.get('conversationId')}
      />
    </main>
  );
};

const InboxPage = () => (
  <Suspense
    fallback={
      <div className="mx-auto mt-8 h-[min(82vh,900px)] min-h-[560px] max-w-[1500px] animate-pulse rounded-xl bg-slate-200" />
    }
  >
    <InboxContent />
  </Suspense>
);

export default InboxPage;
