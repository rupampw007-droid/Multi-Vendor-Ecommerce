'use client';

import type { AxiosInstance } from 'axios';
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  LoaderCircle,
  MessageCircle,
  Moon,
  Search,
  Send,
  Smile,
  Sun,
  X,
} from 'lucide-react';
import {
  FormEvent,
  KeyboardEvent,
  UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useChatSocket } from './socket-context';

type ChatRole = 'user' | 'seller';

type Conversation = {
  conversationId: string;
  other: {
    id: string | null;
    name: string;
    avatar: string | null;
    isOnline: boolean;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: ChatRole;
  content: string | null;
  status: 'sent' | 'delivered' | 'seen' | string;
  createdAt: string;
  clientTempId?: string;
  localStatus?: 'sending' | 'failed';
};

type ApiMessagePage = {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

type ApiChatParty = {
  id?: string | null;
  name?: string | null;
  avatar?: string | null;
  isOnline?: boolean;
};

type ApiConversation = {
  conversationId: string;
  seller?: ApiChatParty;
  user?: ApiChatParty;
  lastMessage?: string | null;
  lastMessageAt?: string;
  unreadCount?: number;
};

type ChatSocketEvent =
  | { type: 'new_message'; payload: ChatMessage }
  | { type: 'unread_count'; payload: { conversationId: string; count: number } }
  | {
      type: 'presence_update';
      payload: { id: string; isOnline: boolean; role: ChatRole };
    }
  | {
      type: 'typing';
      payload: { conversationId: string; isTyping: boolean; role: ChatRole };
    }
  | {
      type: 'message_status';
      payload: { conversationId: string; messageId: string; status: string };
    }
  | {
      type: 'messages_seen';
      payload: { conversationId: string; messageIds: string[] };
    }
  | { type: 'ready'; payload: { role: ChatRole; id: string } }
  | { type: 'error'; payload: { message: string } };

const conversationsPath = (role: ChatRole) =>
  role === 'user'
    ? '/chatting/api/get-user-conversation'
    : '/chatting/api/get-seller-conversations';
const messagesPath = (role: ChatRole, conversationId: string) =>
  `/chatting/api/${role === 'user' ? 'get-messages' : 'get-seller-messages'}/${conversationId}`;

const formatTime = (date: string) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(date),
  );

const dayLabel = (date: string) => {
  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(value, today)) return 'Today';
  if (sameDay(value, yesterday)) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: value.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }).format(value);
};

const sameDay = (left: string, right: string) => {
  const a = new Date(left);
  const b = new Date(right);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const normalizeConversation = (item: ApiConversation, role: ChatRole): Conversation => {
  const other = role === 'user' ? item.seller : item.user;
  return {
    conversationId: item.conversationId,
    other: {
      id: other?.id ?? null,
      name: other?.name ?? (role === 'user' ? 'Seller' : 'User'),
      avatar: other?.avatar ?? null,
      isOnline: Boolean(other?.isOnline),
    },
    lastMessage: item.lastMessage ?? '',
    lastMessageAt: item.lastMessageAt ?? new Date().toISOString(),
    unreadCount: Number(item.unreadCount ?? 0),
  };
};

const uniqueMessages = (messages: ChatMessage[]) => {
  const seen = new Set<string>();
  return messages.filter((message) => {
    const key = message.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mergeServerMessage = (
  current: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] => {
  const withoutTemp = message.clientTempId
    ? current.filter((entry) => entry.id !== `temp:${message.clientTempId}`)
    : current;
  return uniqueMessages([...withoutTemp.filter((entry) => entry.id !== message.id), message]);
};

const Avatar = ({
  name,
  src,
  online,
  size = 'h-11 w-11',
}: {
  name: string;
  src: string | null;
  online?: boolean;
  size?: string;
}) => (
  <div className={`relative shrink-0 ${size}`}>
    {src ? (
      <img
        src={src}
        alt=""
        className="h-full w-full rounded-full object-cover"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
        {name.slice(0, 1).toUpperCase()}
      </div>
    )}
    {online && (
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[#202c33]" />
    )}
  </div>
);

export const ChatInbox = ({
  role,
  api,
  initialConversationId,
}: {
  role: ChatRole;
  api: AxiosInstance;
  initialConversationId?: string | null;
}) => {
  const { socket } = useChatSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isMobileList, setIsMobileList] = useState(!initialConversationId);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [loadError, setLoadError] = useState('');
  const messagePaneRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSent = useRef(false);
  const loadingOlderRef = useRef(false);
  const nearBottomRef = useRef(true);
  const selectedConversation = conversations.find(
    (conversation) => conversation.conversationId === selectedId,
  );

  const refreshConversations = useCallback(async () => {
    const response = await api.get<{ conversations: ApiConversation[] }>(
      conversationsPath(role),
    );
    setConversations(
      (response.data.conversations ?? []).map((item) =>
        normalizeConversation(item, role),
      ),
    );
  }, [api, role]);

  useEffect(() => {
    let active = true;
    setLoadingConversations(true);
    api
      .get<{ conversations: ApiConversation[] }>(conversationsPath(role))
      .then(({ data }) => {
        if (!active) return;
        const result = (data.conversations ?? []).map((item) =>
          normalizeConversation(item, role),
        );
        setConversations(result);
        if (initialConversationId) {
          setSelectedId(initialConversationId);
          setIsMobileList(false);
        } else if (result[0]) {
          setSelectedId(result[0].conversationId);
        }
      })
      .catch(() => {
        if (active) setLoadError('Unable to load conversations. Please retry.');
      })
      .finally(() => {
        if (active) setLoadingConversations(false);
      });
    return () => {
      active = false;
    };
  }, [api, initialConversationId, role]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      return;
    }

    let active = true;
    setLoadingMessages(true);
    setLoadError('');
    setMessages([]);
    setShowNewMessages(false);
    setHasMore(false);
    setNextCursor(null);
    api
      .get<ApiMessagePage>(messagesPath(role, selectedId))
      .then(({ data }) => {
        if (!active) return;
        setMessages(uniqueMessages([...(data.messages ?? [])].reverse()));
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.conversationId === selectedId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
        nearBottomRef.current = true;
        requestAnimationFrame(() => {
          const pane = messagePaneRef.current;
          if (pane) pane.scrollTop = pane.scrollHeight;
        });
      })
      .catch(() => {
        if (active) setLoadError('Unable to load messages. Please retry.');
      })
      .finally(() => {
        if (active) setLoadingMessages(false);
      });
    return () => {
      active = false;
    };
  }, [api, role, selectedId]);

  const markMessagesRead = useCallback(
    (conversationId: string) => {
      void api
        .get<ApiMessagePage>(messagesPath(role, conversationId))
        .then(({ data }) => {
          setMessages((current) => {
            if (conversationId !== selectedId) return current;
            const serverMessages = new Map(
              data.messages.map((message) => [message.id, message]),
            );
            return current.map((message) => serverMessages.get(message.id) ?? message);
          });
          setConversations((current) =>
            current.map((conversation) =>
              conversation.conversationId === conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation,
            ),
          );
        })
        .catch((error: unknown) => {
          console.error('Unable to mark chat messages as read:', error);
          setLoadError('Unable to mark messages as read.');
        });
    },
    [api, role, selectedId],
  );

  useEffect(() => {
    if (!socket) return;
    const handleSocketMessage = (event: MessageEvent<string>) => {
      let data: ChatSocketEvent;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === 'new_message') {
        const incoming = data.payload;
        setConversations((current) => {
          const exists = current.some(
            (conversation) =>
              conversation.conversationId === incoming.conversationId,
          );
          if (!exists) {
            void refreshConversations().catch((error: unknown) => {
              console.error('Unable to refresh chat conversations:', error);
              setLoadError('Unable to refresh conversations.');
            });
            return current;
          }
          return current
            .map((conversation) =>
              conversation.conversationId === incoming.conversationId
                ? {
                    ...conversation,
                    lastMessage: incoming.content ?? '',
                    lastMessageAt: incoming.createdAt,
                    unreadCount:
                      incoming.senderType === role ||
                      incoming.conversationId === selectedId
                        ? 0
                        : conversation.unreadCount + 1,
                  }
                : conversation,
            )
            .sort(
              (left, right) =>
                new Date(right.lastMessageAt).getTime() -
                new Date(left.lastMessageAt).getTime(),
            );
        });
        if (incoming.conversationId === selectedId) {
          setMessages((current) => mergeServerMessage(current, incoming));
          if (incoming.senderType !== role) {
            socket.send(
              JSON.stringify({
                type: 'delivered',
                conversationId: incoming.conversationId,
                messageId: incoming.id,
              }),
            );
            markMessagesRead(incoming.conversationId);
            if (nearBottomRef.current) {
              requestAnimationFrame(() => {
                const pane = messagePaneRef.current;
                if (pane) pane.scrollTop = pane.scrollHeight;
              });
            } else {
              setShowNewMessages(true);
            }
          } else if (nearBottomRef.current) {
            requestAnimationFrame(() => {
              const pane = messagePaneRef.current;
              if (pane) pane.scrollTop = pane.scrollHeight;
            });
          }
        }
        return;
      }

      if (data.type === 'unread_count') {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.conversationId === data.payload.conversationId
              ? { ...conversation, unreadCount: Number(data.payload.count ?? 0) }
              : conversation,
          ),
        );
      } else if (data.type === 'presence_update') {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.other.id === data.payload.id
              ? {
                  ...conversation,
                  other: { ...conversation.other, isOnline: data.payload.isOnline },
                }
              : conversation,
          ),
        );
      } else if (
        data.type === 'typing' &&
        data.payload.conversationId === selectedId
      ) {
        setTyping(Boolean(data.payload.isTyping));
        if (typingTimer.current) clearTimeout(typingTimer.current);
        if (data.payload.isTyping) {
          typingTimer.current = setTimeout(() => setTyping(false), 3_000);
        }
      } else if (
        data.type === 'message_status' &&
        data.payload.conversationId === selectedId
      ) {
        setMessages((current) =>
          current.map((message) =>
            message.id === data.payload.messageId
              ? { ...message, status: data.payload.status }
              : message,
          ),
        );
      } else if (
        data.type === 'messages_seen' &&
        data.payload.conversationId === selectedId
      ) {
        const seenIds = new Set<string>(data.payload.messageIds ?? []);
        setMessages((current) =>
          current.map((message) =>
            seenIds.has(message.id) ? { ...message, status: 'seen' } : message,
          ),
        );
      }
    };

    socket.addEventListener('message', handleSocketMessage);
    return () => socket.removeEventListener('message', handleSocketMessage);
  }, [markMessagesRead, refreshConversations, role, selectedId, socket]);

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return conversations;
    return conversations.filter(
      (conversation) =>
        conversation.other.name.toLowerCase().includes(normalizedSearch) ||
        conversation.lastMessage.toLowerCase().includes(normalizedSearch),
    );
  }, [conversations, search]);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedId || !hasMore || !nextCursor || loadingOlderRef.current) return;
    const pane = messagePaneRef.current;
    const oldHeight = pane?.scrollHeight ?? 0;
    const oldTop = pane?.scrollTop ?? 0;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const { data } = await api.get<ApiMessagePage>(
        messagesPath(role, selectedId),
        { params: { cursor: nextCursor } },
      );
      setMessages((current) =>
        uniqueMessages([...[...(data.messages ?? [])].reverse(), ...current]),
      );
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
      requestAnimationFrame(() => {
        const currentPane = messagePaneRef.current;
        if (currentPane) {
          currentPane.scrollTop = oldTop + (currentPane.scrollHeight - oldHeight);
        }
      });
    } catch {
      setLoadError('Unable to load older messages.');
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [api, hasMore, nextCursor, role, selectedId]);

  const performSend = useCallback(
    async (content: string, tempId: string) => {
      if (!selectedId || !content.trim()) return;
      const optimistic: ChatMessage = {
        id: `temp:${tempId}`,
        conversationId: selectedId,
        senderId: '',
        senderType: role,
        content,
        status: 'sent',
        createdAt: new Date().toISOString(),
        clientTempId: tempId,
        localStatus: 'sending',
      };
      setMessages((current) => mergeServerMessage(current, optimistic));
      setDraft('');
      if (composerRef.current) composerRef.current.style.height = 'auto';
      setEmojiOpen(false);
      nearBottomRef.current = true;
      requestAnimationFrame(() => {
        const pane = messagePaneRef.current;
        if (pane) pane.scrollTop = pane.scrollHeight;
      });
      if (typingSent.current && socket?.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'typing',
            conversationId: selectedId,
            isTyping: false,
          }),
        );
        typingSent.current = false;
      }
      try {
        const { data } = await api.post<{ message: ChatMessage }>(
          `/chatting/api/${role === 'user' ? 'messages' : 'seller-messages'}`,
          { conversationId: selectedId, content: content.trim(), clientTempId: tempId },
        );
        setMessages((current) =>
          mergeServerMessage(current, {
            ...data.message,
            localStatus: undefined,
          }),
        );
        setConversations((current) =>
          current
            .map((conversation) =>
              conversation.conversationId === selectedId
                ? {
                    ...conversation,
                    lastMessage: content.trim(),
                    lastMessageAt: data.message.createdAt,
                  }
                : conversation,
            )
            .sort(
              (left, right) =>
                new Date(right.lastMessageAt).getTime() -
                new Date(left.lastMessageAt).getTime(),
            ),
        );
      } catch {
        setMessages((current) =>
          current.map((message) =>
            message.id === `temp:${tempId}`
              ? { ...message, localStatus: 'failed' }
              : message,
          ),
        );
      }
    },
    [api, role, selectedId, socket],
  );

  const submitMessage = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      const content = draft.trim();
      if (!content || !selectedId) return;
      const tempId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      void performSend(content, tempId);
    },
    [draft, performSend, selectedId],
  );

  const handleComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!selectedId || socket?.readyState !== WebSocket.OPEN) return;
    if (!typingSent.current) {
      socket.send(
        JSON.stringify({
          type: 'typing',
          conversationId: selectedId,
          isTyping: true,
        }),
      );
      typingSent.current = true;
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'typing',
            conversationId: selectedId,
            isTyping: false,
          }),
        );
      }
      typingSent.current = false;
    }, 1_200);
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const pane = event.currentTarget;
    nearBottomRef.current =
      pane.scrollHeight - pane.scrollTop - pane.clientHeight < 120;
    if (nearBottomRef.current) setShowNewMessages(false);
    if (pane.scrollTop < 50) void loadOlderMessages();
  };

  const selectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setIsMobileList(false);
    setTyping(false);
    setShowNewMessages(false);
  };

  const visibleMessages = messages;

  return (
    <section
      className={`mx-auto flex h-[min(82vh,900px)] min-h-[560px] w-full max-w-[1500px] overflow-hidden rounded-xl border shadow-xl ${
        isDark
          ? 'border-[#313d45] bg-[#111b21] text-[#e9edef]'
          : 'border-slate-200 bg-white text-slate-900'
      }`}
    >
      <aside
        className={`w-full shrink-0 flex-col border-r md:flex md:w-[360px] lg:w-[400px] ${
          isDark ? 'border-[#313d45] bg-[#111b21]' : 'border-slate-200 bg-white'
        } ${isMobileList ? 'flex' : 'hidden'}`}
      >
        <div
          className={`flex h-[70px] items-center justify-between border-b px-4 ${
            isDark ? 'border-[#313d45]' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-white">
              <MessageCircle size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Chats</h1>
              <p className={`text-xs ${isDark ? 'text-[#8696a0]' : 'text-slate-500'}`}>
                Your conversations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDark((current) => !current)}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`rounded-full p-2 ${
              isDark ? 'text-[#aebac1] hover:bg-[#202c33]' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
        <label
          className={`mx-3 my-3 flex items-center gap-3 rounded-lg px-3 py-2 ${
            isDark ? 'bg-[#202c33] text-[#aebac1]' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search or start a new chat"
            className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-70 ${
              isDark ? 'text-[#e9edef]' : 'text-slate-900'
            }`}
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => setSearch('')}>
              <X size={15} />
            </button>
          )}
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="space-y-1 px-3">
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className="flex animate-pulse items-center gap-3 p-3">
                  <div className={`h-12 w-12 rounded-full ${isDark ? 'bg-[#26343b]' : 'bg-slate-200'}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-3 w-2/3 rounded ${isDark ? 'bg-[#26343b]' : 'bg-slate-200'}`} />
                    <div className={`h-3 w-full rounded ${isDark ? 'bg-[#26343b]' : 'bg-slate-200'}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError && !conversations.length ? (
            <p className="p-5 text-sm text-rose-400">{loadError}</p>
          ) : filteredConversations.length ? (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.conversationId}
                type="button"
                onClick={() => selectConversation(conversation.conversationId)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                  selectedId === conversation.conversationId
                    ? isDark
                      ? 'bg-[#2a3942]'
                      : 'bg-emerald-50'
                    : isDark
                      ? 'hover:bg-[#202c33]'
                      : 'hover:bg-slate-50'
                }`}
              >
                <Avatar
                  name={conversation.other.name}
                  src={conversation.other.avatar}
                  online={conversation.other.isOnline}
                  size="h-12 w-12"
                />
                <span className={`min-w-0 flex-1 border-b pb-3 ${
                  isDark ? 'border-[#26343b]' : 'border-slate-100'
                }`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[15px] font-medium">
                      {conversation.other.name}
                    </span>
                    <span className={`shrink-0 text-[11px] ${
                      conversation.unreadCount
                        ? 'text-emerald-500'
                        : isDark
                          ? 'text-[#8696a0]'
                          : 'text-slate-500'
                    }`}>
                      {formatTime(conversation.lastMessageAt)}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className={`truncate text-[13px] ${
                      isDark ? 'text-[#8696a0]' : 'text-slate-500'
                    }`}>
                      {conversation.lastMessage || 'Start a conversation'}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className={`px-6 py-14 text-center text-sm ${
              isDark ? 'text-[#8696a0]' : 'text-slate-500'
            }`}>
              {search ? 'No matching conversations.' : 'No conversations yet.'}
            </div>
          )}
        </div>
      </aside>

      <div
        className={`min-w-0 flex-1 flex-col ${
          isMobileList ? 'hidden md:flex' : 'flex'
        } ${isDark ? 'bg-[#0b141a]' : 'bg-[#efeae2]'}`}
      >
        {selectedConversation ? (
          <>
            <header
              className={`flex h-[70px] shrink-0 items-center gap-3 border-b px-3 sm:px-5 ${
                isDark ? 'border-[#313d45] bg-[#202c33]' : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                aria-label="Back to conversations"
                onClick={() => setIsMobileList(true)}
                className={`rounded-full p-2 md:hidden ${
                  isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-slate-100'
                }`}
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar
                name={selectedConversation.other.name}
                src={selectedConversation.other.avatar}
                size="h-10 w-10"
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15px] font-medium">
                  {selectedConversation.other.name}
                </h2>
                <p className={`mt-0.5 text-xs ${
                  typing ? 'text-emerald-500' : isDark ? 'text-[#8696a0]' : 'text-slate-500'
                }`}>
                  {typing
                    ? 'typing…'
                    : selectedConversation.other.isOnline
                      ? 'online'
                      : 'last seen recently'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDark((current) => !current)}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className={`rounded-full p-2 ${
                  isDark ? 'text-[#aebac1] hover:bg-[#2a3942]' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </header>

            <div
              ref={messagePaneRef}
              onScroll={handleScroll}
              className={`relative min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-8 ${
                isDark ? 'bg-[#0b141a]' : 'bg-[#efeae2]'
              }`}
              style={{
                backgroundImage: isDark
                  ? 'radial-gradient(circle at 20% 20%, rgba(35,52,59,.28) 0 1px, transparent 1px)'
                  : 'radial-gradient(circle at 20% 20%, rgba(120,113,108,.10) 0 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            >
              {hasMore && (
                <div className="mb-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void loadOlderMessages()}
                    disabled={loadingOlder}
                    className={`rounded-full px-3 py-1.5 text-xs shadow ${
                      isDark ? 'bg-[#202c33] text-[#aebac1]' : 'bg-white text-slate-600'
                    }`}
                  >
                    {loadingOlder ? 'Loading older messages…' : 'Load earlier messages'}
                  </button>
                </div>
              )}
              {loadingMessages ? (
                <div className="space-y-4">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <div key={item} className={`h-10 animate-pulse rounded-xl ${
                      item % 2
                        ? 'ml-auto w-2/3 bg-emerald-900/30'
                        : `w-1/2 ${isDark ? 'bg-[#202c33]' : 'bg-white/70'}`
                    }`} />
                  ))}
                </div>
              ) : (
                <div className="mx-auto flex max-w-4xl flex-col gap-1">
                  {visibleMessages.map((message, index) => {
                    const previous = visibleMessages[index - 1];
                    const own = message.senderType === role;
                    return (
                      <div key={message.id}>
                        {(!previous || !sameDay(previous.createdAt, message.createdAt)) && (
                          <div className="my-4 flex justify-center">
                            <span className={`rounded-lg px-3 py-1 text-[11px] shadow ${
                              isDark ? 'bg-[#202c33] text-[#c5d0d5]' : 'bg-white/90 text-slate-600'
                            }`}>
                              {dayLabel(message.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                          <article className={`max-w-[88%] rounded-lg px-3 py-2 shadow-sm sm:max-w-[75%] ${
                            own
                              ? isDark
                                ? 'rounded-tr-sm bg-[#005c4b] text-[#e9edef]'
                                : 'rounded-tr-sm bg-[#d9fdd3] text-slate-900'
                              : isDark
                                ? 'rounded-tl-sm bg-[#202c33] text-[#e9edef]'
                                : 'rounded-tl-sm bg-white text-slate-900'
                          }`}>
                            {message.localStatus === 'failed' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void performSend(
                                    message.content ?? '',
                                    message.clientTempId ?? message.id.slice(5),
                                  )
                                }
                                className="mb-1 flex items-center gap-1 text-xs text-rose-400 underline"
                              >
                                Failed to send · Retry
                              </button>
                            ) : null}
                            <p className="whitespace-pre-wrap break-words text-[14px] leading-5">
                              {message.content}
                            </p>
                            <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                              own
                                ? isDark
                                  ? 'text-emerald-100/70'
                                  : 'text-slate-500'
                                : isDark
                                  ? 'text-[#8696a0]'
                                  : 'text-slate-500'
                            }`}>
                              {message.localStatus === 'sending' && (
                                <LoaderCircle size={11} className="animate-spin" />
                              )}
                              <time dateTime={message.createdAt}>
                                {formatTime(message.createdAt)}
                              </time>
                              {own && message.localStatus !== 'failed' && (
                                message.status === 'seen' ? (
                                  <CheckCheck size={15} className="text-sky-300" />
                                ) : message.status === 'delivered' ? (
                                  <CheckCheck size={15} />
                                ) : (
                                  <Check size={14} />
                                )
                              )}
                            </div>
                          </article>
                        </div>
                      </div>
                    );
                  })}
                  <div aria-hidden="true" />
                </div>
              )}
              {loadError && (
                <p className="mx-auto mt-3 max-w-4xl rounded bg-rose-950/80 px-3 py-2 text-sm text-rose-100">
                  {loadError}
                </p>
              )}
              {showNewMessages && (
                <button
                  type="button"
                  onClick={() => {
                    const pane = messagePaneRef.current;
                    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' });
                    setShowNewMessages(false);
                  }}
                  className="sticky bottom-2 left-1/2 mx-auto flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-lg"
                >
                  <ArrowDown size={15} /> New messages
                </button>
              )}
            </div>

            <form
              onSubmit={submitMessage}
              className={`relative flex shrink-0 items-end gap-2 px-3 py-3 sm:px-5 ${
                isDark ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'
              }`}
            >
              {emojiOpen && (
                <div className={`absolute bottom-[72px] left-3 z-10 grid grid-cols-6 gap-1 rounded-xl p-2 shadow-xl ${
                  isDark ? 'bg-[#233138]' : 'bg-white'
                }`}>
                  {['😀', '😂', '😊', '😍', '👍', '🙏', '❤️', '🎉', '😅', '🤔', '🔥', '🙌'].map(
                    (emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          handleDraftChange(`${draft}${emoji}`);
                          composerRef.current?.focus();
                        }}
                        className="rounded p-1 text-xl hover:bg-black/10"
                      >
                        {emoji}
                      </button>
                    ),
                  )}
                </div>
              )}
              <button
                type="button"
                aria-label="Choose emoji"
                onClick={() => setEmojiOpen((current) => !current)}
                className={`mb-1 rounded-full p-2 ${
                  isDark ? 'text-[#aebac1] hover:bg-[#2a3942]' : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Smile size={22} />
              </button>
              <textarea
                ref={composerRef}
                value={draft}
                rows={1}
                onChange={(event) => {
                  handleDraftChange(event.target.value);
                  event.target.style.height = 'auto';
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;
                }}
                onKeyDown={handleComposerKey}
                placeholder="Type a message"
                className={`max-h-[140px] min-h-11 flex-1 resize-none rounded-lg px-4 py-3 text-sm outline-none ${
                  isDark
                    ? 'bg-[#2a3942] text-[#e9edef] placeholder:text-[#8696a0]'
                    : 'bg-white text-slate-900 placeholder:text-slate-400'
                }`}
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send message"
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className={`hidden h-full flex-col items-center justify-center gap-3 text-center md:flex ${
            isDark ? 'text-[#8696a0]' : 'text-slate-500'
          }`}>
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${
              isDark ? 'bg-[#202c33]' : 'bg-white'
            }`}>
              <MessageCircle size={36} className="text-emerald-500" />
            </div>
            <h2 className={`text-xl font-light ${isDark ? 'text-[#e9edef]' : 'text-slate-800'}`}>
              Keep your conversations close
            </h2>
            <p className="max-w-sm text-sm">
              Select a chat to continue messaging securely with your {role === 'user' ? 'seller' : 'customer'}.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
