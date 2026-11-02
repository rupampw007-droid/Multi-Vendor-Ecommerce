'use client';

import { ChatInbox } from '@repo/components/chat/chat-inbox';
import useRequireAuth from '@/hooks/useRequiredAuth';
import axiosInstance from '@/utils/axiosInstance';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const InboxShell = ({ children }: { children: React.ReactNode }) => (
  <main className="relative min-h-screen bg-[#d1d7db]">
    {/* WhatsApp Web style green band behind the card */}
    <div className="absolute inset-x-0 top-0 h-32 bg-[#00a884]" />
    <div className="relative mx-auto h-screen w-full max-w-[1600px] p-0 sm:px-5 sm:py-5">
      <div className="h-full w-full overflow-hidden bg-white shadow-[0_6px_18px_rgba(11,20,26,0.15)] sm:rounded-lg">
        {children}
      </div>
    </div>
  </main>
);

const InboxSkeleton = () => (
  <InboxShell>
    <div className="flex h-full animate-pulse">
      {/* Left pane */}
      <div className="flex w-full flex-col border-r border-[#e9edef] bg-white md:w-[380px] md:min-w-[320px]">
        <div className="flex h-[60px] items-center justify-between bg-[#f0f2f5] px-4">
          <div className="h-10 w-10 rounded-full bg-[#d9dde0]" />
          <div className="h-5 w-24 rounded bg-[#d9dde0]" />
        </div>
        <div className="px-3 py-2">
          <div className="h-9 rounded-lg bg-[#f0f2f5]" />
        </div>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-12 w-12 shrink-0 rounded-full bg-[#e9edef]" />
              <div className="flex-1 space-y-2 border-b border-[#f0f2f5] pb-3">
                <div className="h-3.5 w-1/2 rounded bg-[#e9edef]" />
                <div className="h-3 w-3/4 rounded bg-[#f0f2f5]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right pane */}
      <div className="hidden flex-1 flex-col bg-[#efeae2] md:flex">
        <div className="flex h-[60px] items-center gap-3 bg-[#f0f2f5] px-4">
          <div className="h-10 w-10 rounded-full bg-[#d9dde0]" />
          <div className="h-4 w-32 rounded bg-[#d9dde0]" />
        </div>
        <div className="flex-1" />
        <div className="h-[62px] bg-[#f0f2f5]" />
      </div>
    </div>
  </InboxShell>
);

const InboxContent = () => {
  const searchParams = useSearchParams();
  const { user, isLoading } = useRequireAuth();

  if (isLoading || !user) return <InboxSkeleton />;

  return (
    <InboxShell>
      <ChatInbox
        role="user"
        api={axiosInstance}
        initialConversationId={searchParams.get('conversationId')}
      />
    </InboxShell>
  );
};

const InboxPage = () => (
  <Suspense fallback={<InboxSkeleton />}>
    <InboxContent />
  </Suspense>
);

export default InboxPage;