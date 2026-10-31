'use client';

import { ChatInbox } from '@repo/components/chat/chat-inbox';
import useSeller from '@/hooks/useSeller';
import axiosInstance from '@/utils/axiosInstance';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const SellerInboxPage = () => {
  const { seller, isLoading } = useSeller();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !seller) router.replace('/login');
  }, [isLoading, router, seller]);

  if (isLoading || !seller) {
    return (
      <div className="m-4 h-[min(82vh,900px)] min-h-[560px] animate-pulse rounded-xl bg-slate-800" />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-5">
      <ChatInbox role="seller" api={axiosInstance} />
    </div>
  );
};

export default SellerInboxPage;
