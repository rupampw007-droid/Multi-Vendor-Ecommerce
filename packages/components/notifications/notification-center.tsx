'use client';

import type { AxiosInstance } from 'axios';
import { isAxiosError } from 'axios';
import { Bell, Check, CheckCheck, ExternalLink, LoaderCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export type NotificationRole = 'user' | 'seller' | 'admin';

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  redirect_link: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationPageResult {
  notifications: NotificationRecord[];
  unreadCount: number;
  nextCursor: string | null;
}

interface NotificationCountResult {
  unreadCount: number;
}

const notificationPath = (role: NotificationRole) =>
  `/notification/api/${role}/notifications`;

const notificationsPagePath = (role: NotificationRole) =>
  role === 'admin' ? '/dashboard/notifications' : '/notifications';

const isAudience = (
  value: string,
): value is 'user' | 'seller' | 'admin' | 'all' =>
  value === 'user' ||
  value === 'seller' ||
  value === 'admin' ||
  value === 'all';

const getErrorMessage = (error: unknown, fallback: string) =>
  isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? error.message
    : error instanceof Error
      ? error.message
      : fallback;

const getInternalLink = (path: string, role: NotificationRole) =>
  path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
    ? path
    : notificationsPagePath(role);

export function NotificationUnreadBadge({
  api,
  role,
}: {
  api: AxiosInstance;
  role: NotificationRole;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void api
        .get<NotificationCountResult>(`${notificationPath(role)}/unread-count`)
        .then(({ data }) => {
          if (active) setUnreadCount(data.unreadCount);
        })
        .catch((error: unknown) => {
          if (active) {
            console.error('Unable to load notification unread count:', error);
          }
        });
    };

    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [api, role]);

  if (!unreadCount) return null;
  return (
    <span
      aria-label={`${unreadCount} unread notifications`}
      className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}

export function NotificationBell({
  api,
  role,
  className = '',
}: {
  api: AxiosInstance;
  role: NotificationRole;
  className?: string;
}) {
  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className={`relative inline-flex ${className}`}
    >
      <Bell size={22} />
      <NotificationUnreadBadge api={api} role={role} />
    </Link>
  );
}

export function NotificationCenter({
  api,
  role,
}: {
  api: AxiosInstance;
  role: NotificationRole;
}) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'user' | 'seller' | 'admin' | 'all'>('all');
  const [redirectLink, setRedirectLink] = useState(() =>
    notificationsPagePath(role),
  );
  const [sending, setSending] = useState(false);
  const path = notificationPath(role);

  const loadNotifications = useCallback(
    async (cursor?: string, silent = false) => {
      if (cursor) setLoadingMore(true);
      else if (!silent) setLoading(true);
      if (!silent) setError('');
      try {
        const { data } = await api.get<NotificationPageResult>(path, {
          params: { limit: 30, ...(cursor ? { cursor } : {}) },
        });
        setNotifications((current) => {
          if (cursor) return [...current, ...data.notifications];
          if (!silent) return data.notifications;
          const refreshedIds = new Set(
            data.notifications.map(({ id }) => id),
          );
          return [
            ...data.notifications,
            ...current.filter(({ id }) => !refreshedIds.has(id)),
          ];
        });
        setUnreadCount(data.unreadCount);
        setNextCursor(data.nextCursor);
      } catch (requestError) {
        setError(
          getErrorMessage(requestError, 'Could not load notifications.'),
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [api, path],
  );

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications(undefined, true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    setBusyId(id);
    setActionMessage('');
    try {
      await api.patch(`${path}/${id}/read`);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      setActionMessage(
        getErrorMessage(requestError, 'Could not mark notification as read.'),
      );
    } finally {
      setBusyId('');
    }
  };

  const markAllRead = async () => {
    setBusyId('all');
    setActionMessage('');
    try {
      await api.patch(`${path}/read-all`);
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, isRead: true })),
      );
      setUnreadCount(0);
    } catch (requestError) {
      setActionMessage(
        getErrorMessage(requestError, 'Could not mark notifications as read.'),
      );
    } finally {
      setBusyId('');
    }
  };

  const removeNotification = async (id: string) => {
    setBusyId(id);
    setActionMessage('');
    try {
      await api.delete(`${path}/${id}`);
      const removed = notifications.find((notification) => notification.id === id);
      setNotifications((current) =>
        current.filter((notification) => notification.id !== id),
      );
      if (removed && !removed.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (requestError) {
      setActionMessage(
        getErrorMessage(requestError, 'Could not dismiss notification.'),
      );
    } finally {
      setBusyId('');
    }
  };

  const sendBroadcast = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setActionMessage('');
    try {
      const { data } = await api.post<{ createdCount: number }>(
        `${path}/broadcast`,
        { title, message, audience, redirectLink },
      );
      setActionMessage(`Notification sent to ${data.createdCount} accounts.`);
      setTitle('');
      setMessage('');
      await loadNotifications();
    } catch (requestError) {
      setActionMessage(
        getErrorMessage(requestError, 'Could not send the announcement.'),
      );
    } finally {
      setSending(false);
    }
  };

  const visibleNotifications = notifications.filter(
    (notification) => !unreadOnly || !notification.isRead,
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Activity
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount
              ? `You have ${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}.`
              : 'You’re all caught up.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Unread only
          </label>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0 || busyId === 'all'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        </div>
      </header>

      {role === 'admin' && (
        <form
          onSubmit={(event) => void sendBroadcast(event)}
          className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <h2 className="font-semibold text-slate-900">Send announcement</h2>
            <p className="mt-1 text-xs text-slate-500">
              Deliver a platform notice to selected account types.
            </p>
          </div>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Title
            <input
              required
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-400"
              placeholder="Marketplace update"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Audience
            <select
              value={audience}
              onChange={(event) =>
                setAudience(isAudience(event.target.value) ? event.target.value : 'all')
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-400"
            >
              <option value="all">Everyone</option>
              <option value="user">Customers</option>
              <option value="seller">Sellers</option>
              <option value="admin">Administrators</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
            Message
            <textarea
              required
              maxLength={2000}
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-400"
              placeholder="Write the announcement for your audience."
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Destination (optional)
            <input
              value={redirectLink}
              onChange={(event) => setRedirectLink(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-400"
              placeholder="/notifications"
            />
          </label>
          <div className="flex items-end sm:justify-end">
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {sending && <LoaderCircle size={16} className="animate-spin" />}
              {sending ? 'Sending…' : 'Send announcement'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadNotifications()}
            className="shrink-0 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}
      {actionMessage && (
        <p role="status" className="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {actionMessage}
        </p>
      )}

      <section aria-label="Notification history" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" />
            Loading notifications…
          </div>
        ) : visibleNotifications.length ? (
          <ul className="divide-y divide-slate-100">
            {visibleNotifications.map((notification) => (
              <li
                key={notification.id}
                className={`flex gap-3 p-4 sm:gap-4 ${notification.isRead ? '' : 'bg-blue-50/50'}`}
              >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                  <Bell size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h2 className={`text-sm ${notification.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                      {notification.title}
                    </h2>
                    <time
                      dateTime={notification.createdAt}
                      className="text-xs text-slate-400"
                    >
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {notification.message}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link
                      href={getInternalLink(notification.redirect_link, role)}
                      onClick={() => {
                        if (!notification.isRead) void markRead(notification.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      View details <ExternalLink size={13} />
                    </Link>
                    {!notification.isRead && (
                      <button
                        type="button"
                        disabled={busyId === notification.id}
                        onClick={() => void markRead(notification.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
                      >
                        <Check size={13} /> Mark read
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === notification.id}
                      onClick={() => void removeNotification(notification.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Dismiss
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
            <Bell size={24} className="mb-3 text-slate-300" />
            <h2 className="text-sm font-semibold text-slate-700">
              {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              New order and marketplace updates will show up here.
            </p>
          </div>
        )}
        {nextCursor && !unreadOnly && (
          <div className="border-t border-slate-100 p-3 text-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadNotifications(nextCursor)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              {loadingMore && <LoaderCircle size={14} className="animate-spin" />}
              Load older notifications
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
