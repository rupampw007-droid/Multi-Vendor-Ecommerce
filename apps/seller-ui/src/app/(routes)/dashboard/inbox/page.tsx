'use client';

import { ChatInbox } from '@repo/components/chat/chat-inbox';
import useSeller from '@/hooks/useSeller';
import axiosInstance from '@/utils/axiosInstance';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const SellerInboxPage = () => {
  const { seller, isLoading, isError, refetch } = useSeller();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isError && !seller) router.replace('/login');
  }, [isError, isLoading, router, seller]);

  if (isLoading) {
    return (
      <div className="m-4 h-[min(82vh,900px)] min-h-[560px] animate-pulse rounded-xl bg-slate-800" />
    );
  }

  if (isError) {
    return (
      <div className="m-4 flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl bg-slate-900 p-6 text-center text-white">
        <p>We couldn&apos;t verify your seller session. Please try again.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!seller) return null;

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-5">
      <ChatInbox role="seller" api={axiosInstance} />
    </div>
  );
};

export default SellerInboxPage;
