'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useUser from './useUser';
import axiosInstance from '@/utils/axiosInstance';

const useStartChat = () => {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const startChat = async (sellerIdOrShopId?: string) => {
    if (isLoading) return;
    if (!sellerIdOrShopId) {
      setError('This shop is not available for chat.');
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }

    setError('');
    setIsStarting(true);
    try {
      const { data } = await axiosInstance.post(
        '/chatting/api/create-user-conversationGroup',
        { sellerId: sellerIdOrShopId },
      );
      const conversationId = data.conversation?.id;
      if (!conversationId) throw new Error('Conversation could not be opened.');
      router.push(`/inbox?conversationId=${encodeURIComponent(conversationId)}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to start a conversation. Please try again.',
      );
    } finally {
      setIsStarting(false);
    }
  };

  return { startChat, isStarting: isStarting || isLoading, error };
};

export default useStartChat;
