'use client';

import type { AxiosInstance } from 'axios';
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  Lock,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Smile,
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
  attatchments?: string[];
  status: 'sent' | 'delivered' | 'seen' | string;
  createdAt: string;
  clientTempId?: string;
  localStatus?: 'sending' | 'failed';
  localFiles?: File[];
};

type ChatAttachment = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
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

/* ------------------------------------------------------------------ */
/* WhatsApp Web light palette                                          */
/* ------------------------------------------------------------------ */
const C = {
  panelHeader: 'bg-[#f0f2f5]',
  chatBg: 'bg-[#efeae2]',
  outgoing: '#d9fdd3',
  textPrimary: 'text-[#111b21]',
  textSecondary: 'text-[#667781]',
  icon: 'text-[#54656f]',
  green: 'bg-[#00a884]',
  greenHover: 'hover:bg-[#008f6f]',
  greenText: 'text-[#00a884]',
  divider: 'border-[#e9edef]',
};

const AVATAR_COLORS = [
  '#00a884',
  '#53bdeb',
  '#e26ab6',
  '#f5a623',
  '#7f66ff',
  '#ff7a59',
  '#5b9aa0',
  '#8e6e53',
];

const colorForName = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const scrollbar =
  '[scrollbar-width:thin] [scrollbar-color:#c5ccd0_transparent]';

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

const formatListTime = (date: string) => {
  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(value, today)) return formatTime(date);
  if (same(value, yesterday)) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
};

const setLastMessagePreview = (message: ChatMessage) =>
  message.content ||
  (message.attatchments?.length
    ? `📎 ${message.attatchments.length} file${message.attatchments.length === 1 ? '' : 's'}`
    : '');

const dayLabel = (date: string) => {
  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDayFn = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDayFn(value, today)) return 'Today';
  if (sameDayFn(value, yesterday)) return 'Yesterday';
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

const getMessageAttachments = (message: ChatMessage): ChatAttachment[] =>
  (message.attatchments ?? []).flatMap((rawAttachment) => {
    try {
      const attachment = JSON.parse(rawAttachment) as ChatAttachment;
      return attachment.url && attachment.name ? [attachment] : [];
    } catch {
      return rawAttachment.startsWith('https://')
        ? [
            {
              url: rawAttachment,
              name: rawAttachment.split('/').pop() || 'Attachment',
              mimeType: 'application/octet-stream',
              size: 0,
            },
          ]
        : [];
    }
  });

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
      <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
    ) : (
      <div
        className="flex h-full w-full items-center justify-center rounded-full text-base font-medium text-white"
        style={{ backgroundColor: colorForName(name) }}
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
    )}
    {online && (
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#25d366]" />
    )}
  </div>
);

/* Bubble tail (the little corner flap WhatsApp draws on the first message of a group) */
const BubbleTail = ({ own }: { own: boolean }) => (
  <span
    aria-hidden="true"
    className={`absolute top-0 h-[13px] w-2 ${own ? '-right-[7px]' : '-left-[7px]'}`}
    style={{
      backgroundColor: own ? '#d9fdd3' : '#ffffff',
      clipPath: own ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(0 0, 100% 0, 100% 100%)',
    }}
  />
);

const EMOJIS = [
  '😀', '😂', '😊', '😍', '👍', '🙏', '❤️', '🎉', '😅', '🤔', '🔥', '🙌',
  '😎', '🥳', '👌', '💯', '😢', '😮', '🤝', '✅', '⭐', '👏', '💬', '📦',
];

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
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isMobileList, setIsMobileList] = useState(!initialConversationId);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [loadError, setLoadError] = useState('');
  const messagePaneRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
                    lastMessage: setLastMessagePreview(incoming),
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
    return conversations.filter((conversation) => {
      if (unreadOnly && conversation.unreadCount === 0) return false;
      if (!normalizedSearch) return true;
      return (
        conversation.other.name.toLowerCase().includes(normalizedSearch) ||
        conversation.lastMessage.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [conversations, search, unreadOnly]);

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
    async (content: string, tempId: string, files: File[] = []) => {
      if (!selectedId || (!content.trim() && !files.length)) return;
      setIsUploading(files.length > 0);
      const optimistic: ChatMessage = {
        id: `temp:${tempId}`,
        conversationId: selectedId,
        senderId: '',
        senderType: role,
        content:
          content.trim() ||
          (files.length
            ? `Uploading ${files.length} file${files.length === 1 ? '' : 's'}…`
            : ''),
        status: 'sent',
        createdAt: new Date().toISOString(),
        clientTempId: tempId,
        localStatus: 'sending',
        localFiles: files,
      };
      setMessages((current) => mergeServerMessage(current, optimistic));
      setDraft('');
      setSelectedFiles([]);
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
        const uploadedAttachments = await Promise.all(
          files.map(async (file): Promise<ChatAttachment> => {
            const fileData = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') resolve(reader.result);
                else reject(new Error(`Unable to read ${file.name}.`));
              };
              reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
              reader.readAsDataURL(file);
            });
            const path =
              role === 'user'
                ? '/chatting/api/attachments'
                : '/chatting/api/seller-attachments';
            const { data } = await api.post<{ attachment: ChatAttachment }>(path, {
              conversationId: selectedId,
              fileData,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
            });
            return data.attachment;
          }),
        );
        const { data } = await api.post<{ message: ChatMessage }>(
          `/chatting/api/${role === 'user' ? 'messages' : 'seller-messages'}`,
          {
            conversationId: selectedId,
            content: content.trim(),
            attachments: uploadedAttachments,
            clientTempId: tempId,
          },
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
                    lastMessage:
                      content.trim() ||
                      (uploadedAttachments.length
                        ? `📎 ${uploadedAttachments.length} file${uploadedAttachments.length === 1 ? '' : 's'}`
                        : ''),
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
      } catch (error) {
        console.error('Unable to send chat message:', error);
        setMessages((current) =>
          current.map((message) =>
            message.id === `temp:${tempId}`
              ? {
                  ...message,
                  localStatus: 'failed',
                  content: content.trim() || null,
                  localFiles: files,
                }
              : message,
          ),
        );
        setLoadError('Message failed to send. Select Retry to try again.');
      } finally {
        setIsUploading(false);
      }
    },
    [api, role, selectedId, socket],
  );

  const submitMessage = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      const content = draft.trim();
      if ((!content && !selectedFiles.length) || !selectedId || isUploading) return;
      const tempId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      void performSend(content, tempId, selectedFiles);
    },
    [draft, isUploading, performSend, selectedFiles, selectedId],
  );

  const handleFilesSelected = (files: FileList | null) => {
    if (!files?.length) return;
    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]);
    const additions = Array.from(files);
    const invalid = additions.find(
      (file) =>
        !allowedTypes.has(file.type) ||
        file.size < 1 ||
        file.size > 5 * 1024 * 1024,
    );
    if (invalid) {
      setLoadError(
        `${invalid.name} is not a supported file or is larger than 5 MB.`,
      );
      return;
    }
    if (selectedFiles.length + additions.length > 5) {
      setLoadError('You can attach up to 5 files per message.');
      return;
    }
    setLoadError('');
    setSelectedFiles((current) => [...current, ...additions]);
  };

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
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const canSend = (draft.trim().length > 0 || selectedFiles.length > 0) && !isUploading;

  return (
    <section
      className={`flex h-full min-h-[560px] w-full overflow-hidden bg-white ${C.textPrimary}`}
    >
      {/* ------------------------------------------------------------ */}
      {/* LEFT PANE: conversation list                                  */}
      {/* ------------------------------------------------------------ */}
      <aside
        className={`w-full shrink-0 flex-col border-r ${C.divider} bg-white md:flex md:w-[380px] lg:w-[420px] ${
          isMobileList ? 'flex' : 'hidden'
        }`}
      >
        {/* header */}
        <div className={`flex h-[60px] shrink-0 items-center justify-between px-4 ${C.panelHeader}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${C.green}`}>
              <MessageCircle size={20} />
            </div>
            <h1 className="text-[19px] font-semibold tracking-tight">
              {role === 'seller' ? 'Customers' : 'Chats'}
            </h1>
          </div>
          {totalUnread > 0 && (
            <span className="rounded-full bg-[#25d366] px-2.5 py-0.5 text-xs font-semibold text-white">
              {totalUnread > 99 ? '99+' : totalUnread} unread
            </span>
          )}
        </div>

        {/* search */}
        <div className="shrink-0 bg-white px-3 pb-1 pt-2">
          <label className={`flex h-9 items-center gap-4 rounded-lg px-3 ${C.panelHeader} ${C.icon}`}>
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search or start a new chat"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[#111b21] outline-none placeholder:text-[#667781]"
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch('')}>
                <X size={15} />
              </button>
            )}
          </label>
        </div>

        {/* filter chips */}
        <div className="flex shrink-0 gap-2 bg-white px-3 pb-2 pt-1.5">
          {[
            { label: 'All', active: !unreadOnly, onClick: () => setUnreadOnly(false) },
            { label: 'Unread', active: unreadOnly, onClick: () => setUnreadOnly(true) },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClick}
              className={`rounded-full px-3 py-1 text-[13px] transition ${
                chip.active
                  ? 'bg-[#d9fdd3] font-medium text-[#008069]'
                  : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* list */}
        <div className={`min-h-0 flex-1 overflow-y-auto ${scrollbar}`}>
          {loadingConversations ? (
            <div>
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="flex animate-pulse items-center gap-3 px-4 py-3">
                  <div className="h-[49px] w-[49px] rounded-full bg-[#e9edef]" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3 w-1/2 rounded bg-[#e9edef]" />
                    <div className="h-3 w-4/5 rounded bg-[#f0f2f5]" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError && !conversations.length ? (
            <p className="p-5 text-sm text-rose-600">{loadError}</p>
          ) : filteredConversations.length ? (
            filteredConversations.map((conversation) => {
              const active = selectedId === conversation.conversationId;
              const unread = conversation.unreadCount > 0;
              return (
                <button
                  key={conversation.conversationId}
                  type="button"
                  onClick={() => selectConversation(conversation.conversationId)}
                  className={`flex w-full items-center gap-3 pl-3 pr-4 text-left transition-colors ${
                    active ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                  }`}
                >
                  <Avatar
                    name={conversation.other.name}
                    src={conversation.other.avatar}
                    online={conversation.other.isOnline}
                    size="h-[49px] w-[49px]"
                  />
                  <span className={`min-w-0 flex-1 border-b py-3 ${C.divider}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[16.5px] text-[#111b21]">
                        {conversation.other.name}
                      </span>
                      <span
                        className={`shrink-0 text-[12px] ${
                          unread ? `${C.greenText} font-medium` : C.textSecondary
                        }`}
                      >
                        {formatListTime(conversation.lastMessageAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[14px] ${
                          unread ? 'font-medium text-[#111b21]' : C.textSecondary
                        }`}
                      >
                        {conversation.lastMessage || 'Start a conversation'}
                      </span>
                      {unread && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[12px] font-semibold text-white">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className={`px-8 py-16 text-center text-sm ${C.textSecondary}`}>
              {search
                ? 'No chats found.'
                : unreadOnly
                  ? 'No unread chats.'
                  : 'No conversations yet.'}
            </div>
          )}
        </div>
      </aside>

      {/* ------------------------------------------------------------ */}
      {/* RIGHT PANE: conversation                                      */}
      {/* ------------------------------------------------------------ */}
      <div
        className={`min-w-0 flex-1 flex-col ${isMobileList ? 'hidden md:flex' : 'flex'} ${C.chatBg}`}
      >
        {selectedConversation ? (
          <>
            {/* header */}
            <header className={`flex h-[60px] shrink-0 items-center gap-3 px-3 sm:px-4 ${C.panelHeader}`}>
              <button
                type="button"
                aria-label="Back to conversations"
                onClick={() => setIsMobileList(true)}
                className={`rounded-full p-2 hover:bg-black/5 md:hidden ${C.icon}`}
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar
                name={selectedConversation.other.name}
                src={selectedConversation.other.avatar}
                size="h-10 w-10"
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[16px] leading-tight text-[#111b21]">
                  {selectedConversation.other.name}
                </h2>
                <p
                  className={`mt-0.5 text-[13px] leading-tight ${
                    typing || selectedConversation.other.isOnline
                      ? C.greenText
                      : C.textSecondary
                  }`}
                >
                  {typing
                    ? 'typing…'
                    : selectedConversation.other.isOnline
                      ? 'online'
                      : 'last seen recently'}
                </p>
              </div>
            </header>

            {/* messages */}
            <div
              ref={messagePaneRef}
              onScroll={handleScroll}
              className={`relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-[7%] ${scrollbar}`}
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 20%, rgba(11,20,26,.06) 0 1px, transparent 1.5px), radial-gradient(circle at 70% 60%, rgba(11,20,26,.05) 0 1px, transparent 1.5px)',
                backgroundSize: '28px 28px, 36px 36px',
              }}
            >
              {hasMore && (
                <div className="mb-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void loadOlderMessages()}
                    disabled={loadingOlder}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs text-[#54656f] shadow-sm hover:bg-[#f5f6f6]"
                  >
                    {loadingOlder ? 'Loading older messages…' : 'Load earlier messages'}
                  </button>
                </div>
              )}

              {loadingMessages ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className={`h-10 animate-pulse rounded-lg ${
                        item % 2 ? 'ml-auto w-2/5 bg-[#d9fdd3]/70' : 'w-1/3 bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <div className="mx-auto flex max-w-4xl flex-col">
                  {visibleMessages.map((message, index) => {
                    const previous = visibleMessages[index - 1];
                    const own = message.senderType === role;
                    const newDay = !previous || !sameDay(previous.createdAt, message.createdAt);
                    const firstInGroup =
                      newDay || !previous || previous.senderType !== message.senderType;
                    const attachments = getMessageAttachments(message);
                    return (
                      <div key={message.id}>
                        {newDay && (
                          <div className="my-3 flex justify-center">
                            <span className="rounded-lg bg-white px-3 py-1 text-[12.5px] uppercase tracking-wide text-[#54656f] shadow-sm">
                              {dayLabel(message.createdAt)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${own ? 'justify-end' : 'justify-start'} ${
                            firstInGroup ? 'mt-2' : 'mt-[3px]'
                          }`}
                        >
                          <article
                            className={`relative max-w-[85%] px-2.5 pb-1.5 pt-1.5 text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] sm:max-w-[65%] ${
                              own ? 'bg-[#d9fdd3]' : 'bg-white'
                            } ${
                              firstInGroup
                                ? own
                                  ? 'rounded-lg rounded-tr-none'
                                  : 'rounded-lg rounded-tl-none'
                                : 'rounded-lg'
                            }`}
                          >
                            {firstInGroup && <BubbleTail own={own} />}

                            {message.localStatus === 'failed' && (
                              <button
                                type="button"
                                onClick={() =>
                                  void performSend(
                                    message.content ?? '',
                                    message.clientTempId ?? message.id.slice(5),
                                    message.localFiles ?? [],
                                  )
                                }
                                className="mb-1 flex items-center gap-1 text-xs font-medium text-rose-600 underline"
                              >
                                Failed to send · Retry
                              </button>
                            )}

                            {attachments.length > 0 && (
                              <div className="mb-1 flex flex-col gap-1.5">
                                {attachments.map((attachment) =>
                                  attachment.mimeType.startsWith('image/') ? (
                                    <a
                                      key={`${attachment.url}-${attachment.name}`}
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block overflow-hidden rounded-md"
                                    >
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="max-h-64 w-full max-w-[280px] object-cover"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      key={`${attachment.url}-${attachment.name}`}
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`flex max-w-[280px] items-center gap-2.5 rounded-md p-2 ${
                                        own ? 'bg-[#c7f0c0]' : 'bg-[#f0f2f5]'
                                      }`}
                                    >
                                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white text-[#54656f]">
                                        <FileText size={20} />
                                      </span>
                                      <span className="min-w-0">
                                        <span className="block truncate text-[13px] font-medium">
                                          {attachment.name}
                                        </span>
                                        <span className="block text-[11px] uppercase text-[#667781]">
                                          {attachment.name.split('.').pop()?.slice(0, 5) || 'file'}
                                        </span>
                                      </span>
                                    </a>
                                  ),
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap items-end justify-end gap-x-2">
                              {message.content && (
                                <p className="min-w-0 max-w-full flex-1 whitespace-pre-wrap break-words text-[14.2px] leading-[19px]">
                                  {message.content}
                                </p>
                              )}
                              <span className="ml-auto flex shrink-0 translate-y-[3px] items-center gap-1 pl-1 text-[11px] leading-none text-[#667781]">
                                {message.localStatus === 'sending' && (
                                  <LoaderCircle size={11} className="animate-spin" />
                                )}
                                <time dateTime={message.createdAt}>
                                  {formatTime(message.createdAt)}
                                </time>
                                {own &&
                                  message.localStatus !== 'failed' &&
                                  (message.status === 'seen' ? (
                                    <CheckCheck size={16} className="text-[#53bdeb]" />
                                  ) : message.status === 'delivered' ? (
                                    <CheckCheck size={16} />
                                  ) : (
                                    <Check size={15} />
                                  ))}
                              </span>
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
                <div className="sticky bottom-2 mx-auto mt-3 flex w-fit max-w-full items-center gap-3 rounded-lg bg-[#fff3cd] px-3 py-2 text-[13px] text-[#664d03] shadow-md">
                  <span>{loadError}</span>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => setLoadError('')}
                    className="rounded-full p-0.5 hover:bg-black/10"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {showNewMessages && (
                <button
                  type="button"
                  onClick={() => {
                    const pane = messagePaneRef.current;
                    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' });
                    setShowNewMessages(false);
                  }}
                  className={`sticky bottom-3 mx-auto mt-2 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-white shadow-lg ${C.green} ${C.greenHover}`}
                >
                  <ArrowDown size={15} /> New messages
                </button>
              )}
            </div>

            {/* composer */}
            <form
              onSubmit={submitMessage}
              className={`relative flex shrink-0 flex-col gap-2 px-3 py-2.5 sm:px-4 ${C.panelHeader}`}
            >
              {emojiOpen && (
                <div className="absolute bottom-[64px] left-3 z-10 grid grid-cols-8 gap-0.5 rounded-xl bg-white p-2 shadow-[0_4px_20px_rgba(11,20,26,0.2)] sm:left-12">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        handleDraftChange(`${draft}${emoji}`);
                        composerRef.current?.focus();
                      }}
                      className="rounded-lg p-1.5 text-[22px] leading-none hover:bg-[#f0f2f5]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <span
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="flex max-w-[240px] items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs text-[#3b4a54] shadow-sm"
                    >
                      <FileText size={14} className="shrink-0 text-[#667781]" />
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setSelectedFiles((current) =>
                            current.filter((_, fileIndex) => fileIndex !== index),
                          )
                        }
                        className="shrink-0 rounded-full p-0.5 hover:bg-black/10"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(event) => {
                    handleFilesSelected(event.target.files);
                    event.target.value = '';
                  }}
                />
                <button
                  type="button"
                  aria-label="Choose emoji"
                  onClick={() => setEmojiOpen((current) => !current)}
                  className={`mb-0.5 rounded-full p-2 transition hover:bg-black/5 ${
                    emojiOpen ? 'bg-black/5 text-[#00a884]' : C.icon
                  }`}
                >
                  <Smile size={24} />
                </button>
                <button
                  type="button"
                  aria-label="Attach photos or files"
                  onClick={() => fileInputRef.current?.click()}
                  className={`mb-0.5 rounded-full p-2 transition hover:bg-black/5 ${C.icon}`}
                >
                  <Paperclip size={22} />
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
                  className={`max-h-[140px] min-h-[42px] flex-1 resize-none rounded-lg bg-white px-3.5 py-[10px] text-[15px] leading-[21px] text-[#111b21] outline-none placeholder:text-[#667781] ${scrollbar}`}
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label={isUploading ? 'Uploading files' : 'Send message'}
                  className={`mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition ${C.green} ${C.greenHover} disabled:cursor-not-allowed disabled:bg-[#b9c2c7]`}
                >
                  {isUploading ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} className="translate-x-[1px]" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div
            className={`hidden h-full flex-col items-center justify-center border-b-[6px] border-[#25d366] bg-[#f0f2f5] px-8 text-center md:flex`}
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
              <MessageCircle size={44} className={C.greenText} />
            </div>
            <h2 className="mt-7 text-[30px] font-light text-[#41525d]">
              Keep your conversations close
            </h2>
            <p className="mt-3 max-w-md text-[14px] leading-6 text-[#667781]">
              Select a chat to continue messaging with your{' '}
              {role === 'user' ? 'seller' : 'customer'}.
            </p>
            <p className="mt-10 flex items-center gap-1.5 text-[13px] text-[#8696a0]">
              <Lock size={12} /> Your messages are private to this conversation
            </p>
          </div>
        )}
      </div>
    </section>
  );
};