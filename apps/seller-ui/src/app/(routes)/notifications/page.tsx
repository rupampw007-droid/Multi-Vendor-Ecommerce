'use client';

import { NotificationCenter } from '@repo/components/notifications/notification-center';
import axiosInstance from '@/utils/axiosInstance';

export default function NotificationsPage() {
  return <NotificationCenter api={axiosInstance} role="seller" />;
}
