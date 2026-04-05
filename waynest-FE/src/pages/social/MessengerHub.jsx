import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import {
  FiPlus,
  FiSearch,
  FiSend,
  FiUsers,
  FiChevronLeft,
  FiX,
  FiSmile,
  FiImage,
  FiGift,
  FiCornerUpLeft,
  FiMoreHorizontal,
  FiThumbsUp,
  FiStar,
  FiBellOff,
  FiBell,
  FiTrash2,
  FiBookmark,
  FiShare2,
  FiArchive,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/api/client";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import {
  addConversationMembers,
  archiveConversation,
  createConversation,
  deleteMessage,
  editMessage,
  fetchConversationMessages,
  fetchFriends,
  fetchInbox,
  markConversationRead,
  muteConversation,
  pinConversation,
  reactToMessage,
  unarchiveConversation,
  unmuteConversation,
  unpinConversation,
  uploadChatImage,
  updateConversation,
  sendMessage,
} from "@/api/social";
import "./MessengerHub.css";

/* ─── Constants ─────────────────────────────────────── */
const DEFAULT_MESSAGE_LIMIT = 20;
const TYPING_IDLE_MS = 1200;

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
const EMOJI_PALETTE = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😎",
  "😭",
  "😤",
  "😴",
  "👍",
  "👎",
  "❤️",
  "🔥",
  "🎉",
  "✨",
  "💯",
  "🙌",
  "😮",
  "😢",
  "😡",
  "🤔",
  "🤣",
  "😊",
  "👏",
  "💪",
  "🙏",
  "💀",
  "🫡",
  "😏",
  "🥹",
  "😬",
  "🫠",
  "😇",
  "🌹",
  "🍕",
  "🎮",
  "⚽",
  "🏆",
  "🎵",
  "🌍",
  "💡",
  "🚀",
  "🎯",
  "💎",
  "🤝",
  "🫶",
  "❄️",
  "🌙",
  "☀️",
];

/* ─── Utilities ─────────────────────────────────────── */
const sortMessagesAscending = (messages = []) =>
  [...messages].sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    return at !== bt ? at - bt : String(a.id).localeCompare(String(b.id));
  });

const mergeUniqueMessages = (existing = [], incoming = []) => {
  const map = new Map();
  [...existing, ...incoming].forEach((m) => m?.id && map.set(m.id, m));
  return sortMessagesAscending([...map.values()]);
};

const getPeerMember = (conv, uid) =>
  conv?.members?.find((m) => m.userId !== uid) ?? null;

const getConversationTitle = (conv, uid) => {
  if (!conv) return "";
  if (conv.isGroup) return conv.title?.trim() || "Group chat";
  const peer = getPeerMember(conv, uid);
  return (
    `${peer?.firstName ?? ""} ${peer?.lastName ?? ""}`.trim() ||
    peer?.username ||
    "Conversation"
  );
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604_800_000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const getDateLabel = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

const isLikelyImageUrl = (content) => {
  if (typeof content !== "string") return false;
  const trimmed = content.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(trimmed);
};

const normalizeConversationSocket = (row) => {
  const item = row && typeof row === "object" ? row : {};
  const members = Array.isArray(item.members)
    ? item.members
        .map((member) => {
          if (!member || typeof member !== "object") return null;
          return {
            userId:
              typeof member.userId === "string"
                ? member.userId
                : typeof member.id === "string"
                  ? member.id
                  : "",
            username:
              typeof member.username === "string" ? member.username : "",
            firstName:
              typeof member.firstName === "string" ? member.firstName : "",
            lastName:
              typeof member.lastName === "string" ? member.lastName : "",
            avatarUrl:
              typeof member.avatarUrl === "string" || member.avatarUrl === null
                ? member.avatarUrl
                : null,
            role: typeof member.role === "string" ? member.role : "",
          };
        })
        .filter((m) => Boolean(m?.userId))
    : [];
  return {
    id: typeof item.id === "string" ? item.id : "",
    title:
      typeof item.title === "string" || item.title === null ? item.title : null,
    isGroup: Boolean(item.isGroup),
    members,
    lastMessage:
      typeof item.lastMessage === "string" || item.lastMessage === null
        ? item.lastMessage
        : null,
    lastMessageAt:
      typeof item.lastMessageAt === "string"
        ? item.lastMessageAt
        : typeof item.updatedAt === "string"
          ? item.updatedAt
          : new Date().toISOString(),
    updatedAt:
      typeof item.updatedAt === "string"
        ? item.updatedAt
        : new Date().toISOString(),
    lastMessageSenderId:
      typeof item.lastMessageSenderId === "string" ||
      item.lastMessageSenderId === null
        ? item.lastMessageSenderId
        : null,
    unreadCount:
      typeof item.unreadCount === "number"
        ? item.unreadCount
        : typeof item.unread_count === "number"
          ? item.unread_count
          : 0,
    pinnedAt:
      typeof item.pinnedAt === "string" || item.pinnedAt === null
        ? item.pinnedAt
        : typeof item.pinned_at === "string" || item.pinned_at === null
          ? item.pinned_at
          : null,
    mutedAt:
      typeof item.mutedAt === "string" || item.mutedAt === null
        ? item.mutedAt
        : typeof item.muted_at === "string" || item.muted_at === null
          ? item.muted_at
          : null,
    archivedAt:
      typeof item.archivedAt === "string" || item.archivedAt === null
        ? item.archivedAt
        : typeof item.archived_at === "string" || item.archived_at === null
          ? item.archived_at
          : null,
  };
};

const upsertConversationSummary = (convs, next) => {
  const n = normalizeConversationSocket(next);
  if (!n.id) return convs;
  const merged = convs.some((c) => c.id === n.id)
    ? convs.map((c) =>
        c.id === n.id
          ? {
              ...c,
              ...n,
              members: n.members.length > 0 ? n.members : c.members,
              pinnedAt: n.pinnedAt ?? c.pinnedAt ?? null,
              mutedAt: n.mutedAt ?? c.mutedAt ?? null,
              archivedAt: n.archivedAt ?? c.archivedAt ?? null,
            }
          : c,
      )
    : [n, ...convs];
  return [...merged].sort((a, b) => {
    const at = new Date(a.lastMessageAt || a.updatedAt).getTime();
    const bt = new Date(b.lastMessageAt || b.updatedAt).getTime();
    return at !== bt ? bt - at : String(b.id).localeCompare(String(a.id));
  });
};

const updateConversationPreview = (convs, message, uid) => {
  const content = typeof message?.content === "string" ? message.content : "";
  const nextAt = message?.createdAt ?? new Date().toISOString();
  const senderId = message?.senderId ?? null;
  return convs
    .map((c) => {
      if (c.id !== message.conversationId) return c;
      return {
        ...c,
        lastMessage: content,
        lastMessageAt: nextAt,
        lastMessageSenderId: senderId,
        unreadCount:
          senderId && senderId !== uid
            ? Number(c.unreadCount || 0) + 1
            : Number(c.unreadCount || 0),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime(),
    );
};

/* ─── Component ─────────────────────────────────────── */
const MessengerHub = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  /* Core state */
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [messageDraft, setMessageDraft] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [activePagination, setActivePagination] = useState({
    hasMore: false,
    loadingMore: false,
  });

  /* Drawer / group state */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [groupComposerOpen, setGroupComposerOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [drawerGroupTitle, setDrawerGroupTitle] = useState("");
  const [groupFirstMessage, setGroupFirstMessage] = useState("");
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState([]);
  const [drawerMemberSearch, setDrawerMemberSearch] = useState("");
  const [drawerSelectedMemberIds, setDrawerSelectedMemberIds] = useState([]);
  const [groupActionBusy, setGroupActionBusy] = useState(false);
  const [composerBusy, setComposerBusy] = useState(false);

  /* ── NEW FEATURES state ── */
  const [replyTo, setReplyTo] = useState(null); // { id, content, senderName }
  const [messageReactions, setMessageReactions] = useState({}); // { msgId: [{ emoji, userId }] }
  const [reactionPickerFor, setReactionPickerFor] = useState(null); // msgId
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [msgContextMenu, setMsgContextMenu] = useState(null); // { x, y, message }
  const [convContextMenu, setConvContextMenu] = useState(null); // { x, y, conv }
  const [pinnedConversations, setPinnedConversations] = useState(new Set());
  const [mutedConversations, setMutedConversations] = useState(new Set());
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [starredMessages, setStarredMessages] = useState(new Set());

  /* Refs */
  const socketRef = useRef(null);
  const messageTimersRef = useRef(new Map());
  const messagePagingRef = useRef({});
  const threadBodyRef = useRef(null);
  const composerRef = useRef(null);
  const pendingScrollModeRef = useRef("bottom");
  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const imageInputRef = useRef(null);

  /* Derived */
  const currentUserId = user?.id ?? user?.userId ?? "";
  const selectedConversationId = searchParams.get("conversation") ?? "";
  const selectedConversationIdRef = useRef(selectedConversationId);
  const activeTab = searchParams.get("tab") || "all";
  const deferredSearch = useDeferredValue(conversationSearch);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );
  const activeConversationPeer = useMemo(
    () => getPeerMember(activeConversation, currentUserId),
    [activeConversation, currentUserId],
  );
  const activeConversationMemberIds = useMemo(
    () =>
      new Set(
        (activeConversation?.members ?? [])
          .map((m) => m.userId)
          .filter(Boolean),
      ),
    [activeConversation],
  );

  const createGroupResults = useMemo(() => {
    const q = groupMemberSearch.trim().toLowerCase();
    return friends.filter((f) => {
      if (
        f.userId === currentUserId ||
        selectedGroupMemberIds.includes(f.userId)
      )
        return false;
      if (!q) return true;
      return `${f.firstName} ${f.lastName} ${f.username}`
        .toLowerCase()
        .includes(q);
    });
  }, [friends, currentUserId, groupMemberSearch, selectedGroupMemberIds]);

  const drawerAddableFriends = useMemo(() => {
    const q = drawerMemberSearch.trim().toLowerCase();
    return friends.filter((f) => {
      if (
        f.userId === currentUserId ||
        activeConversationMemberIds.has(f.userId) ||
        drawerSelectedMemberIds.includes(f.userId)
      )
        return false;
      if (!q) return true;
      return `${f.firstName} ${f.lastName} ${f.username}`
        .toLowerCase()
        .includes(q);
    });
  }, [
    activeConversationMemberIds,
    currentUserId,
    drawerMemberSearch,
    drawerSelectedMemberIds,
    friends,
  ]);

  const activeMessages = useMemo(() => {
    const msgs = selectedConversationId
      ? (messagesByConversation[selectedConversationId] ?? [])
      : [];
    if (!messageSearch.trim()) return msgs;
    const q = messageSearch.toLowerCase();
    return msgs.filter((m) => m.content?.toLowerCase().includes(q));
  }, [messagesByConversation, selectedConversationId, messageSearch]);

  /* Group consecutive messages from same sender */
  const groupedMessages = useMemo(() => {
    return activeMessages.map((msg, i) => {
      const prev = activeMessages[i - 1];
      const next = activeMessages[i + 1];
      const GAP = 120_000; // 2 min
      const isFirst =
        !prev ||
        prev.senderId !== msg.senderId ||
        new Date(msg.createdAt) - new Date(prev.createdAt) > GAP;
      const isLast =
        !next ||
        next.senderId !== msg.senderId ||
        new Date(next.createdAt) - new Date(msg.createdAt) > GAP;
      const showDate =
        !prev || getDateLabel(msg.createdAt) !== getDateLabel(prev.createdAt);
      return { ...msg, isFirst, isLast, showDate };
    });
  }, [activeMessages]);

  const messagesEndRef = useRef(null);

  /* ─── Effects ─────────────────────────────────── */
  useEffect(() => {
    if (!activeConversation?.isGroup) {
      setDrawerOpen(false);
      setDrawerSelectedMemberIds([]);
      setDrawerMemberSearch("");
      setDrawerGroupTitle("");
      return;
    }
    setDrawerOpen(true);
    setDrawerGroupTitle(activeConversation.title ?? "");
  }, [activeConversation?.id, activeConversation?.isGroup]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  /* Close menus on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(e.target)
      ) {
        setReactionPickerFor(null);
      }
      if (msgContextMenu && !e.target.closest(".messenger-msgContextMenu")) {
        setMsgContextMenu(null);
      }
      if (convContextMenu && !e.target.closest(".messenger-convContextMenu")) {
        setConvContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [msgContextMenu, convContextMenu]);

  /* Socket */
  useEffect(() => {
    if (!currentUserId) return;
    socketRef.current = io(API_BASE_URL, {
      query: { userId: currentUserId },
      transports: ["websocket"],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    const handleMessageNew = (payload) => {
      const message = payload?.message ?? payload;
      if (!message?.conversationId || !message?.id) return;
      const reactions = Array.isArray(message.reactions) ? message.reactions : [];
      setMessagesByConversation((prev) => ({
        ...prev,
        [message.conversationId]: mergeUniqueMessages(
          prev[message.conversationId] ?? [],
          [message],
        ),
      }));
      setMessageReactions((prev) => ({
        ...prev,
        [message.id]: reactions,
      }));
      setConversations((prev) =>
        updateConversationPreview(prev, message, currentUserId),
      );
      if (
        message.senderId !== currentUserId &&
        selectedConversationIdRef.current === message.conversationId
      ) {
        socketRef.current?.emit("ack:delivered", {
          conversationId: message.conversationId,
          messageId: message.id,
        });
        void markConversationRead(message.conversationId).catch(() => {});
      }
    };

    const handleConversationRead = (payload) => {
      const { conversationId, userId: readerId } = payload ?? {};
      if (!conversationId || !readerId) return;
      if (readerId === currentUserId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c,
          ),
        );
        return;
      }
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).map((m) =>
          m.senderId === currentUserId
            ? {
                ...m,
                seen: true,
                receipt: {
                  ...(m.receipt ?? {}),
                  readAt: payload.readAt ?? new Date().toISOString(),
                },
              }
            : m,
        ),
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      );
    };

    const handleMessageStatus = (payload) => {
      const { conversationId, messageId } = payload ?? {};
      if (!conversationId || !messageId) return;
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            receipt: {
              ...(m.receipt ?? {}),
              deliveredAt:
                payload.status === "delivered"
                  ? (payload.at ?? new Date().toISOString())
                  : (m.receipt?.deliveredAt ?? null),
              readAt:
                payload.status === "read"
                  ? (payload.at ?? new Date().toISOString())
                  : (m.receipt?.readAt ?? null),
            },
          };
        }),
      }));
    };

    const handleMessageEdited = (payload) => {
      const message = payload?.message ?? null;
      if (!message?.conversationId || !message?.id) return;
      const reactions = Array.isArray(message.reactions) ? message.reactions : [];
      setMessagesByConversation((prev) => ({
        ...prev,
        [message.conversationId]: mergeUniqueMessages(
          prev[message.conversationId] ?? [],
          [message],
        ).map((entry) =>
          entry.id === message.id
            ? {
              ...entry,
              ...message,
              reactions: reactions.length > 0 ? reactions : entry.reactions ?? [],
            }
            : entry,
        ),
      }));
      setMessageReactions((prev) => ({
        ...prev,
        [message.id]: reactions,
      }));
    };

    const handleMessageDeleted = (payload) => {
      const { conversationId, messageId } = payload ?? {};
      if (!conversationId || !messageId) return;
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).filter(
          (message) => message.id !== messageId,
        ),
      }));
      setMessageReactions((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
      setStarredMessages((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    };

    const handleReactionUpdate = (payload) => {
      const { conversationId, messageId, reactions } = payload ?? {};
      if (!conversationId || !messageId) return;
      const nextReactions = Array.isArray(reactions) ? reactions : [];
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).map((message) =>
          message.id === messageId
            ? { ...message, reactions: nextReactions }
            : message,
        ),
      }));
      setMessageReactions((prev) => ({
        ...prev,
        [messageId]: nextReactions,
      }));
    };

    const handleConversationUpsert = (payload) => {
      if (!payload?.id) return;
      setConversations((prev) => upsertConversationSummary(prev, payload));
    };

    const handleTyping = ({ conversationId, userId, isTyping }) => {
      if (!conversationId || !userId || userId === currentUserId) return;
      const key = `${conversationId}:${userId}`;
      const t = messageTimersRef.current.get(key);
      if (t) {
        window.clearTimeout(t);
        messageTimersRef.current.delete(key);
      }
      if (isTyping) {
        setTypingUsers((prev) => ({ ...prev, [conversationId]: userId }));
        const id = window.setTimeout(() => {
          setTypingUsers((prev) => {
            const n = { ...prev };
            delete n[conversationId];
            return n;
          });
          messageTimersRef.current.delete(key);
        }, TYPING_IDLE_MS);
        messageTimersRef.current.set(key, id);
      } else {
        setTypingUsers((prev) => {
          const n = { ...prev };
          delete n[conversationId];
          return n;
        });
      }
    };

    socketRef.current.on("message:new", handleMessageNew);
    socketRef.current.on("new_message", handleMessageNew);
    socketRef.current.on("conversation:read", handleConversationRead);
    socketRef.current.on("message_seen", handleConversationRead);
    socketRef.current.on("message:status", handleMessageStatus);
    socketRef.current.on("message:edited", handleMessageEdited);
    socketRef.current.on("message:deleted", handleMessageDeleted);
    socketRef.current.on("reaction_update", handleReactionUpdate);
    socketRef.current.on("conversation:upsert", handleConversationUpsert);
    socketRef.current.on("typing", handleTyping);
    socketRef.current.on("stop_typing", handleTyping);
    socketRef.current.on("connect_error", () =>
      toast.error(
        t("social.inbox.socketError", {
          defaultValue: "Live connection issue",
        }),
      ),
    );

    return () => {
      socketRef.current?.off("message:new", handleMessageNew);
      socketRef.current?.off("new_message", handleMessageNew);
      socketRef.current?.off("conversation:read", handleConversationRead);
      socketRef.current?.off("message_seen", handleConversationRead);
      socketRef.current?.off("message:status", handleMessageStatus);
      socketRef.current?.off("message:edited", handleMessageEdited);
      socketRef.current?.off("message:deleted", handleMessageDeleted);
      socketRef.current?.off("reaction_update", handleReactionUpdate);
      socketRef.current?.off("conversation:upsert", handleConversationUpsert);
      socketRef.current?.off("typing", handleTyping);
      socketRef.current?.off("stop_typing", handleTyping);
      socketRef.current?.disconnect();
    };
  }, [currentUserId]);

  useEffect(() => {
    const load = async () => {
      try {
        const [inbox, fr] = await Promise.all([fetchInbox(), fetchFriends()]);
        setConversations(Array.isArray(inbox) ? inbox : []);
        setPinnedConversations(
          new Set(
            (Array.isArray(inbox) ? inbox : [])
              .filter((c) => c?.pinnedAt)
              .map((c) => c.id),
          ),
        );
        setMutedConversations(
          new Set(
            (Array.isArray(inbox) ? inbox : [])
              .filter((c) => c?.mutedAt)
              .map((c) => c.id),
          ),
        );
        setFriends(fr);
      } finally {
        setLoadingConversations(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return;
    let active = true;
    setReplyTo(null);
    setShowMessageSearch(false);
    setMessageSearch("");
    const loadMessages = async () => {
      try {
        const payload = await fetchConversationMessages(
          selectedConversationId,
          { limit: DEFAULT_MESSAGE_LIMIT },
        );
        if (!active) return;
        const normalized = sortMessagesAscending(
          Array.isArray(payload) ? payload : [],
        );
        setMessagesByConversation((prev) => ({
          ...prev,
          [selectedConversationId]: normalized,
        }));
        setMessageReactions((prev) => {
          const next = { ...prev };
          normalized.forEach((message) => {
            next[message.id] = Array.isArray(message.reactions)
              ? message.reactions
              : [];
          });
          return next;
        });
        const oldestCursor = normalized[0]?.id ?? null;
        messagePagingRef.current[selectedConversationId] = {
          oldestCursor,
          hasMore: normalized.length === DEFAULT_MESSAGE_LIMIT,
        };
        setActivePagination({
          hasMore: normalized.length === DEFAULT_MESSAGE_LIMIT,
          loadingMore: false,
        });
        await markConversationRead(selectedConversationId);
      } catch {}
    };
    loadMessages();
    if (composerRef.current) composerRef.current.style.height = "24px";
    socketRef.current?.emit("join", { conversationId: selectedConversationId });
    pendingScrollModeRef.current = "bottom";
    return () => {
      active = false;
      socketRef.current?.emit("typing", {
        conversationId: selectedConversationId,
        isTyping: false,
      });
      socketRef.current?.emit("leave", {
        conversationId: selectedConversationId,
      });
    };
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    if (pendingScrollModeRef.current === "preserve") {
      pendingScrollModeRef.current = "bottom";
      return;
    }
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeMessages]);

  useEffect(
    () => () => {
      messageTimersRef.current.forEach((id) => window.clearTimeout(id));
      messageTimersRef.current.clear();
    },
    [],
  );

  /* ─── Handlers ────────────────────────────────── */
  const handleTyping = () => {
    if (!selectedConversationId) return;
    socketRef.current?.emit("typing", {
      conversationId: selectedConversationId,
      isTyping: true,
    });
    const key = `typing:${selectedConversationId}`;
    const ex = messageTimersRef.current.get(key);
    if (ex) window.clearTimeout(ex);
    const id = window.setTimeout(() => {
      socketRef.current?.emit("typing", {
        conversationId: selectedConversationId,
        isTyping: false,
      });
      messageTimersRef.current.delete(key);
    }, TYPING_IDLE_MS);
    messageTimersRef.current.set(key, id);
  };

  const handleAttachImage = () => {
    imageInputRef.current?.click();
  };

  const handlePasteGifUrl = () => {
    const gifUrl = window.prompt("Paste a GIF image URL");
    if (!gifUrl?.trim()) return;
    setMessageDraft((prev) => (prev.trim() ? `${prev}\n${gifUrl.trim()}` : gifUrl.trim()));
    composerRef.current?.focus();
  };

  const handleImageFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const response = await uploadChatImage(file);
      const url = response?.url ?? response?.path;
      if (!url) {
        throw new Error("Missing uploaded image URL");
      }
      setMessageDraft((prev) => (prev.trim() ? `${prev}\n${url}` : url));
      composerRef.current?.focus();
      toast.success("Image attached");
    } catch {
      toast.error("Could not upload image");
    }
  };

  const handleSend = async () => {
    if (!selectedConversationId || !messageDraft.trim()) return;
    const content = messageDraft;
    const replyToMessageId = replyTo?.id ?? null;
    setMessageDraft("");
    setReplyTo(null);
    if (composerRef.current) composerRef.current.style.height = "24px";
    socketRef.current?.emit("typing", {
      conversationId: selectedConversationId,
      isTyping: false,
    });
    const key = `typing:${selectedConversationId}`;
    const t = messageTimersRef.current.get(key);
    if (t) {
      window.clearTimeout(t);
      messageTimersRef.current.delete(key);
    }
    try {
      const msg = await sendMessage(
        selectedConversationId,
        content,
        replyToMessageId,
      );
      setMessagesByConversation((prev) => ({
        ...prev,
        [selectedConversationId]: mergeUniqueMessages(
          prev[selectedConversationId] ?? [],
          [msg],
        ),
      }));
      setMessageReactions((prev) => ({
        ...prev,
        [msg.id]: Array.isArray(msg.reactions) ? msg.reactions : [],
      }));
      setConversations((prev) =>
        updateConversationPreview(prev, msg, currentUserId),
      );
    } catch {
      toast.error(
        t("social.inbox.sendFailed", { defaultValue: "Error sending message" }),
      );
    }
  };

  const handleReact = async (messageId, emoji) => {
    if (!selectedConversationId) return;
    const previous = messageReactions[messageId] ?? [];
    const nextReactions = previous.some(
      (reaction) => reaction.userId === currentUserId && reaction.emoji === emoji,
    )
      ? previous.filter(
          (reaction) =>
            !(reaction.userId === currentUserId && reaction.emoji === emoji),
        )
      : [
          ...previous.filter((reaction) => reaction.userId !== currentUserId),
          { emoji, userId: currentUserId },
        ];

    setMessageReactions((prev) => ({
      ...prev,
      [messageId]: nextReactions,
    }));
    setMessagesByConversation((prev) => ({
      ...prev,
      [selectedConversationId]: (prev[selectedConversationId] ?? []).map((message) =>
        message.id === messageId
          ? { ...message, reactions: nextReactions }
          : message,
      ),
    }));

    try {
      await reactToMessage(messageId, selectedConversationId, { emoji });
    } catch {
      setMessageReactions((prev) => ({
        ...prev,
        [messageId]: previous,
      }));
      setMessagesByConversation((prev) => ({
        ...prev,
        [selectedConversationId]: (prev[selectedConversationId] ?? []).map((message) =>
          message.id === messageId
            ? { ...message, reactions: previous }
            : message,
        ),
      }));
    } finally {
      setReactionPickerFor(null);
    }
  };

  const handleMsgContextMenu = (e, message) => {
    e.preventDefault();
    setMsgContextMenu({ x: e.clientX, y: e.clientY, message });
  };

  const handleConvContextMenu = (e, conv) => {
    e.preventDefault();
    setConvContextMenu({ x: e.clientX, y: e.clientY, conv });
  };

  const handleStarMessage = (msgId) => {
    const isStarredNow = starredMessages.has(msgId);
    setStarredMessages((prev) => {
      const n = new Set(prev);
      n.has(msgId) ? n.delete(msgId) : n.add(msgId);
      return n;
    });
    setMsgContextMenu(null);
    if (selectedConversationId) {
      void reactToMessage(msgId, selectedConversationId, { emoji: "⭐" }).catch(() => {
        setStarredMessages((prev) => {
          const n = new Set(prev);
          n.has(msgId) ? n.delete(msgId) : n.add(msgId);
          return n;
        });
      });
    }
    toast.success(isStarredNow ? "Message unstarred" : "Message starred ⭐");
  };

  const handlePinConversation = (convId) => {
    const isPinned = pinnedConversations.has(convId);
    const nextRequest = isPinned ? unpinConversation : pinConversation;
    setPinnedConversations((prev) => {
      const n = new Set(prev);
      n.has(convId) ? n.delete(convId) : n.add(convId);
      return n;
    });
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === convId
          ? {
              ...conversation,
              pinnedAt: isPinned ? null : new Date().toISOString(),
            }
          : conversation,
      ),
    );
    setConvContextMenu(null);
    void nextRequest(convId).catch(() => {
      setPinnedConversations((prev) => {
        const n = new Set(prev);
        n.has(convId) ? n.delete(convId) : n.add(convId);
        return n;
      });
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === convId
            ? {
                ...conversation,
                pinnedAt: isPinned ? new Date().toISOString() : null,
              }
            : conversation,
        ),
      );
    });
  };

  const handleMuteConversation = (convId) => {
    const isMuted = mutedConversations.has(convId);
    const nextRequest = isMuted ? unmuteConversation : muteConversation;
    setMutedConversations((prev) => {
      const n = new Set(prev);
      n.has(convId) ? n.delete(convId) : n.add(convId);
      return n;
    });
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === convId
          ? {
              ...conversation,
              mutedAt: isMuted ? null : new Date().toISOString(),
            }
          : conversation,
      ),
    );
    setConvContextMenu(null);
    void nextRequest(convId).catch(() => {
      setMutedConversations((prev) => {
        const n = new Set(prev);
        n.has(convId) ? n.delete(convId) : n.add(convId);
        return n;
      });
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === convId
            ? {
                ...conversation,
                mutedAt: isMuted ? new Date().toISOString() : null,
              }
            : conversation,
        ),
      );
    });
  };

  const handleArchiveConversation = (convId) => {
    const isArchived = conversations.find((c) => c.id === convId)?.archivedAt;
    const nextRequest = isArchived ? unarchiveConversation : archiveConversation;
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === convId
          ? {
              ...conversation,
              archivedAt: isArchived ? null : new Date().toISOString(),
            }
          : conversation,
      ),
    );
    setConvContextMenu(null);
    void nextRequest(convId).catch(() => {
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === convId
            ? {
                ...conversation,
                archivedAt: isArchived ? new Date().toISOString() : null,
              }
            : conversation,
        ),
      );
    });
  };

  const handleEditMessage = async (message) => {
    if (!selectedConversationId || message.senderId !== currentUserId) return;
    const nextContent = window.prompt("Edit message", message.content);
    if (typeof nextContent !== "string") return;
    const trimmed = nextContent.trim();
    if (!trimmed || trimmed === message.content) return;
    try {
      const updated = await editMessage(message.id, selectedConversationId, {
        content: trimmed,
      });
      setMessagesByConversation((prev) => ({
        ...prev,
        [selectedConversationId]: (prev[selectedConversationId] ?? []).map((entry) =>
          entry.id === updated.id ? { ...entry, ...updated } : entry,
        ),
      }));
      setConversations((prev) =>
        updateConversationPreview(prev, updated, currentUserId),
      );
      toast.success("Message updated");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          t("social.inbox.editFailed", {
            defaultValue: "Could not edit message.",
          }),
      );
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!selectedConversationId || message.senderId !== currentUserId) return;
    try {
      await deleteMessage(message.id, selectedConversationId);
      setMessagesByConversation((prev) => ({
        ...prev,
        [selectedConversationId]: (prev[selectedConversationId] ?? []).filter(
          (entry) => entry.id !== message.id,
        ),
      }));
      setMessageReactions((prev) => {
        const next = { ...prev };
        delete next[message.id];
        return next;
      });
      setStarredMessages((prev) => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
      toast.success("Message deleted");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          t("social.inbox.deleteFailed", {
            defaultValue: "Could not delete message.",
          }),
      );
    }
  };

  const loadOlderMessages = async () => {
    const cid = selectedConversationIdRef.current;
    if (!cid || activePagination.loadingMore || !activePagination.hasMore)
      return;
    const cursorState = messagePagingRef.current[cid];
    const before = cursorState?.oldestCursor;
    if (!before) return;
    const body = threadBodyRef.current;
    const prevScrollHeight = body?.scrollHeight ?? 0;
    const prevScrollTop = body?.scrollTop ?? 0;
    setActivePagination((prev) => ({ ...prev, loadingMore: true }));
    try {
      const older = await fetchConversationMessages(cid, {
        before,
        limit: DEFAULT_MESSAGE_LIMIT,
      });
      if (cid !== selectedConversationIdRef.current) return;
      const normalized = sortMessagesAscending(
        Array.isArray(older) ? older : [],
      );
      if (normalized.length === 0) {
        messagePagingRef.current[cid] = { ...cursorState, hasMore: false };
        setActivePagination((prev) => ({
          ...prev,
          hasMore: false,
          loadingMore: false,
        }));
        return;
      }
      pendingScrollModeRef.current = "preserve";
      setMessagesByConversation((prev) => ({
        ...prev,
        [cid]: mergeUniqueMessages(normalized, prev[cid] ?? []),
      }));
      setMessageReactions((prev) => {
        const next = { ...prev };
        normalized.forEach((message) => {
          next[message.id] = Array.isArray(message.reactions)
            ? message.reactions
            : [];
        });
        return next;
      });
      const nextCursor = normalized[0]?.id ?? before;
      const hasMore = normalized.length === DEFAULT_MESSAGE_LIMIT;
      messagePagingRef.current[cid] = { oldestCursor: nextCursor, hasMore };
      setActivePagination({ hasMore, loadingMore: false });
      requestAnimationFrame(() => {
        if (!body) {
          pendingScrollModeRef.current = "bottom";
          return;
        }
        body.scrollTop = body.scrollHeight - prevScrollHeight + prevScrollTop;
        pendingScrollModeRef.current = "bottom";
      });
    } catch {
      setActivePagination((prev) => ({ ...prev, loadingMore: false }));
    }
  };

  const handleThreadScroll = (e) => {
    if (!selectedConversationId) return;
    if (e.currentTarget.scrollTop < 72) void loadOlderMessages();
  };

  const resetGroupComposer = () => {
    setGroupComposerOpen(false);
    setGroupTitle("");
    setGroupFirstMessage("");
    setGroupMemberSearch("");
    setSelectedGroupMemberIds([]);
  };

  const toggleSelectedGroupMember = (uid) =>
    setSelectedGroupMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );

  const toggleDrawerMember = (uid) =>
    setDrawerSelectedMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );

  const openCreateGroup = () => {
    setGroupComposerOpen(true);
    setGroupTitle("");
    setGroupFirstMessage("");
    setGroupMemberSearch("");
    setSelectedGroupMemberIds([]);
  };

  const startGroupWithPeer = () => {
    if (!activeConversationPeer) return;
    setGroupComposerOpen(true);
    setGroupTitle(
      activeConversationPeer.firstName ||
        activeConversationPeer.username ||
        "New group",
    );
    setGroupFirstMessage("");
    setGroupMemberSearch("");
    setSelectedGroupMemberIds([activeConversationPeer.userId]);
  };

  const handleCreateGroup = async () => {
    if (groupActionBusy) return;
    const participantIds = [...new Set(selectedGroupMemberIds)].filter(
      (id) => id && id !== currentUserId,
    );
    const title = groupTitle.trim();
    const firstMessage = groupFirstMessage.trim();
    if (participantIds.length === 0 || !title || !firstMessage) {
      toast.error(
        t("social.inbox.groupCreateInvalid", {
          defaultValue:
            "Pick at least one person, a title, and a first message.",
        }),
      );
      return;
    }
    setGroupActionBusy(true);
    try {
      const payload = await createConversation({
        participantIds,
        title,
        firstMessage,
      });
      const cid = payload?.conversation?.id;
      if (cid) {
        const p = new URLSearchParams(searchParams);
        p.set("conversation", cid);
        setSearchParams(p);
      }
      resetGroupComposer();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("social.inbox.groupCreateFailed", {
            defaultValue: "Could not create the group.",
          }),
      );
    } finally {
      setGroupActionBusy(false);
    }
  };

  const handleSaveGroupTitle = async () => {
    if (!selectedConversationId || !activeConversation?.isGroup || composerBusy)
      return;
    const nextTitle = drawerGroupTitle.trim();
    if (!nextTitle) {
      toast.error(
        t("social.inbox.groupTitleRequired", {
          defaultValue: "Group title is required.",
        }),
      );
      return;
    }
    setComposerBusy(true);
    try {
      await updateConversation(selectedConversationId, { title: nextTitle });
      setDrawerGroupTitle(nextTitle);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId ? { ...c, title: nextTitle } : c,
        ),
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("social.inbox.groupTitleFailed", {
            defaultValue: "Could not save the title.",
          }),
      );
    } finally {
      setComposerBusy(false);
    }
  };

  const handleAddMembersToGroup = async () => {
    if (
      !selectedConversationId ||
      !activeConversation?.isGroup ||
      groupActionBusy
    )
      return;
    const userIds = [...new Set(drawerSelectedMemberIds)].filter(Boolean);
    if (userIds.length === 0) {
      toast.info(
        t("social.inbox.noMembersSelected", {
          defaultValue: "Pick at least one person to add.",
        }),
      );
      return;
    }
    setGroupActionBusy(true);
    try {
      await addConversationMembers(selectedConversationId, { userIds });
      setDrawerSelectedMemberIds([]);
      setDrawerMemberSearch("");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("social.inbox.addMembersFailed", {
            defaultValue: "Could not add members.",
          }),
      );
    } finally {
      setGroupActionBusy(false);
    }
  };

  /* Filtered + sorted conversations (pinned first) */
  const filtered = useMemo(() => {
    return conversations
      .filter((c) => {
        if (c.archivedAt && c.id !== selectedConversationId) return false;
        if (activeTab === "unread" && !c.unreadCount) return false;
        const title = (
          c.isGroup
            ? (c.title ?? "")
            : c.members.find((m) => m.userId !== currentUserId)?.username || ""
        ).toLowerCase();
        return title.includes(deferredSearch.toLowerCase());
      })
      .sort((a, b) => {
        const ap = pinnedConversations.has(a.id) ? -1 : 0;
        const bp = pinnedConversations.has(b.id) ? -1 : 0;
        return ap - bp;
      });
  }, [
    conversations,
    activeTab,
    deferredSearch,
    currentUserId,
    pinnedConversations,
  ]);

  /* ─── Render ────────────────────────────────────── */
  return (
    <section className="messenger-hub">
      <div
        className={`messenger-hub__layout${drawerOpen ? " messenger-hub__layout--drawerOpen" : ""}`}>
        {/* ── SIDEBAR ─────────────────────────────── */}
        <aside className="messenger-pane messenger-pane--sidebar">
          <div className="messenger-pane__header">
            <h1>Chats</h1>
            <div className="messenger-pane__headerActions">
              <button
                type="button"
                className="messenger-iconButton"
                onClick={openCreateGroup}
                aria-label="Create new group"
                title="New group">
                <FiUsers size={17} />
              </button>
              <button
                type="button"
                className="messenger-iconButton messenger-iconButton--primary"
                onClick={openCreateGroup}
                aria-label="New conversation"
                title="New conversation">
                <FiPlus size={17} />
              </button>
            </div>
          </div>

          <div className="messenger-pane__search">
            <FiSearch size={15} />
            <input
              placeholder="Search Messenger"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
            />
          </div>

          <div className="messenger-tabs">
            {["all", "unread"].map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? "isActive" : ""}
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set("tab", tab);
                  setSearchParams(p);
                }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="messenger-pane__body">
            {loadingConversations ? (
              <div
                style={{
                  padding: "20px",
                  color: "var(--panel-text-muted)",
                  textAlign: "center",
                  fontSize: "0.9rem",
                }}>
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  color: "var(--panel-text-muted)",
                  textAlign: "center",
                  fontSize: "0.88rem",
                }}>
                No conversations found
              </div>
            ) : (
              filtered.map((c) => {
                const name = getConversationTitle(c, currentUserId);
                const isPinned = pinnedConversations.has(c.id);
                const isMuted = mutedConversations.has(c.id);
                const preview = isMuted
                  ? "🔕 " + (c.lastMessage || "")
                  : c.lastMessage || "No messages yet";
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`messenger-conversationCard${c.id === selectedConversationId ? " isActive" : ""}`}
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      p.set("conversation", c.id);
                      setSearchParams(p);
                    }}
                    onContextMenu={(e) => handleConvContextMenu(e, c)}>
                    <div className="messenger-conversationCard__avatarWrap">
                      <div className="messenger-conversationCard__avatar">
                        {c.isGroup ? (
                          <FiUsers size={20} />
                        ) : (
                          name[0]?.toUpperCase()
                        )}
                      </div>
                      {!c.isGroup && (
                        <span className="messenger-conversationCard__onlineDot" />
                      )}
                    </div>

                    <div className="messenger-conversationCard__metaWrap">
                      <div className="messenger-conversationCard__metaTop">
                        <strong>
                          {isPinned ? "📌 " : ""}
                          {name}
                        </strong>
                        <span
                          className={`messenger-conversationCard__time${c.unreadCount ? " isUnread" : ""}`}>
                          {formatTime(c.lastMessageAt || c.updatedAt)}
                        </span>
                      </div>
                      <span
                        className={`messenger-conversationCard__meta${c.unreadCount ? " isUnread" : ""}`}>
                        {c.lastMessageSenderId === currentUserId ? "You: " : ""}
                        {preview}
                      </span>
                    </div>

                    {c.unreadCount > 0 && (
                      <span className="messenger-conversationCard__badge">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── THREAD ──────────────────────────────── */}
        <section className="messenger-pane messenger-pane--thread">
          {/* Header */}
          <div className="messenger-thread__header">
            {selectedConversationId ? (
              <>
                <div className="messenger-thread__headerAvatar">
                  <div className="messenger-thread__avatar">
                    {activeConversation?.isGroup ? (
                      <FiUsers size={18} />
                    ) : (
                      (
                        getConversationTitle(
                          activeConversation,
                          currentUserId,
                        )[0] ?? "?"
                      ).toUpperCase()
                    )}
                  </div>
                  {!activeConversation?.isGroup && (
                    <span className="messenger-thread__onlineDot" />
                  )}
                </div>

                <div className="messenger-thread__headerCopy">
                  <h2>
                    {getConversationTitle(activeConversation, currentUserId)}
                  </h2>
                  <p>
                    {activeConversation?.isGroup
                      ? `${activeConversation.members?.length ?? 0} members`
                      : "Active now"}
                  </p>
                </div>

                <div className="messenger-thread__headerActions">
                  {activeConversation?.isGroup ? (
                    <button
                      type="button"
                      className="messenger-headerPillButton"
                      onClick={() => setDrawerOpen(true)}
                    >
                      Add people
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="messenger-iconButton"
                    onClick={() => setShowMessageSearch((v) => !v)}
                    aria-label="Search in conversation"
                    title="Search">
                    <FiSearch size={16} />
                  </button>
                  <button
                    type="button"
                    className="messenger-iconButton"
                    onClick={() => {
                      if (activeConversation?.isGroup) {
                        setDrawerOpen((v) => !v);
                        return;
                      }
                      startGroupWithPeer();
                    }}
                    aria-label={
                      activeConversation?.isGroup
                        ? "Toggle group details"
                        : "Create group from chat"
                    }
                    title={
                      activeConversation?.isGroup
                        ? "Group info"
                        : "Create group"
                    }>
                    <FiUsers size={16} />
                  </button>
                  <button
                    type="button"
                    className="messenger-iconButton"
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      p.delete("conversation");
                      setSearchParams(p);
                    }}
                    aria-label="Close conversation"
                    title="Close">
                    <FiChevronLeft size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{
                  color: "var(--panel-text-muted)",
                  fontSize: "0.95rem",
                }}>
                Select a conversation
              </div>
            )}
          </div>

          {/* Message search bar */}
          {showMessageSearch && selectedConversationId && (
            <div className="messenger-thread__searchBar">
              <FiSearch
                size={15}
                style={{ color: "var(--panel-text-muted)" }}
              />
              <input
                autoFocus
                placeholder="Search in conversation…"
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
              />
              <button
                type="button"
                className="messenger-iconButton"
                onClick={() => {
                  setShowMessageSearch(false);
                  setMessageSearch("");
                }}>
                <FiX size={14} />
              </button>
            </div>
          )}

          {/* Thread body */}
          <div
            className="messenger-thread__body"
            ref={threadBodyRef}
            onScroll={handleThreadScroll}>
            {!selectedConversationId ? (
              <div className="messenger-thread__empty">
                <div className="messenger-thread__empty__icon">💬</div>
                <h3>Your messages</h3>
                <p>Select a conversation from the left to start chatting</p>
              </div>
            ) : (
              <>
                {activePagination.hasMore && (
                  <button
                    type="button"
                    className="messenger-thread__loadMore"
                    onClick={() => void loadOlderMessages()}
                    disabled={activePagination.loadingMore}>
                    {activePagination.loadingMore
                      ? "Loading…"
                      : "Load older messages"}
                  </button>
                )}

                {groupedMessages.map((m, idx) => {
                  const isOwn = m.senderId === currentUserId;
                  const reactions = messageReactions[m.id] ?? m.reactions ?? [];
                  const isStarred =
                    starredMessages.has(m.id) ||
                    (m.reactions ?? []).some(
                      (reaction) =>
                        reaction.userId === currentUserId &&
                        reaction.emoji === "⭐",
                    );
                  const readAt = m.receipt?.readAt ?? null;
                  const deliveredAt = m.receipt?.deliveredAt ?? null;
                  const statusLabel = readAt
                    ? "✓✓"
                    : deliveredAt
                      ? "✓✓"
                      : isOwn
                        ? "✓"
                        : "";
                  const statusColor = readAt
                    ? "var(--color-primary)"
                    : "color-mix(in srgb, var(--panel-text-on-accent) 60%, transparent)";

                  /* Sender info */
                  const senderMember = activeConversation?.members?.find(
                    (mem) => mem.userId === m.senderId,
                  );
                  const senderName = senderMember
                    ? senderMember.firstName || senderMember.username || ""
                    : m.sender?.firstName || m.sender?.username || "";

                  const groupClass =
                    m.isFirst && m.isLast
                      ? ""
                      : m.isFirst
                        ? " groupFirst"
                        : m.isLast
                          ? " groupLast"
                          : " groupMiddle";
                  const replyMsg = m.replyToId
                    ? (
                        messagesByConversation[selectedConversationId] ?? []
                      ).find((r) => r.id === m.replyToId)
                    : null;
                  const contentLines = typeof m.content === "string"
                    ? m.content.split(/\r?\n/)
                    : [];
                  const imageLines = contentLines.filter((line) =>
                    isLikelyImageUrl(line),
                  );
                  const textLines = contentLines.filter(
                    (line) => !isLikelyImageUrl(line),
                  );

                  return (
                    <div key={m.id}>
                      {/* Day separator */}
                      {m.showDate && (
                        <div className="messenger-daySeparator">
                          <div className="messenger-daySeparator__line" />
                          <span className="messenger-daySeparator__label">
                            {getDateLabel(m.createdAt)}
                          </span>
                          <div className="messenger-daySeparator__line" />
                        </div>
                      )}

                      {/* Sender name (group chats, others) */}
                      {!isOwn && m.isFirst && activeConversation?.isGroup && (
                        <div className="messenger-messageSenderName">
                          {senderName}
                        </div>
                      )}

                      <div
                        className={`messenger-messageRow${isOwn ? " messenger-messageRow--own" : ""}${groupClass}`}
                        onContextMenu={(e) => handleMsgContextMenu(e, m)}>
                        {/* Avatar slot (others only) */}
                        {!isOwn && (
                          <div
                            className={`messenger-messageRow__avatarSlot ${m.isLast ? "isVisible" : "isHidden"}`}>
                            {m.isLast
                              ? (senderName[0] ?? "?").toUpperCase()
                              : ""}
                          </div>
                        )}

                        {/* Bubble wrapper */}
                        <div
                          className="messenger-messageBubbleWrap"
                          style={{ position: "relative" }}>
                          {/* Reply preview */}
                          {replyMsg && (
                            <div className="messenger-replyBadge">
                              <span className="messenger-replyBadge__name">
                                {replyMsg.senderId === currentUserId
                                  ? "You"
                                  : replyMsg.sender?.firstName ||
                                    replyMsg.sender?.username ||
                                    senderName}
                              </span>
                              <span className="messenger-replyBadge__text">
                                {replyMsg.content}
                              </span>
                            </div>
                          )}

                          {/* Main bubble */}
                          <div className="messenger-messageBubble">
                            {isStarred && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  marginBottom: "2px",
                                  display: "block",
                                  opacity: 0.7,
                                }}>
                                ⭐
                              </span>
                            )}
                            {imageLines.map((line) => (
                              <img
                                key={line}
                                src={resolveMediaUrl(line.trim())}
                                alt="Attachment"
                                style={{
                                  display: "block",
                                  maxWidth: "100%",
                                  borderRadius: "14px",
                                  marginBottom: "0.35rem",
                                }}
                              />
                            ))}
                            {textLines.length > 0 && (
                              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                                {textLines.join("\n").trim()}
                              </p>
                            )}
                            <div className="messenger-messageBubble__meta">
                              <span style={{ opacity: 0.75 }}>
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isOwn && statusLabel && (
                                <span
                                  style={{
                                    color: statusColor,
                                    fontWeight: 700,
                                  }}>
                                  {statusLabel}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Reactions on bubble */}
                          {reactions.length > 0 && (
                            <div className="messenger-messageReactions">
                              {Object.entries(
                                reactions.reduce((acc, r) => {
                                  acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                                  return acc;
                                }, {}),
                              ).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className={`messenger-messageReactions__pill${reactions.some((r) => r.userId === currentUserId && r.emoji === emoji) ? " isOwn" : ""}`}
                                  onClick={() => handleReact(m.id, emoji)}>
                                  {emoji} {count > 1 && <span>{count}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reaction bar on hover */}
                        <div
                          className={`messenger-reactionBarWrap${reactionPickerFor === m.id ? " isActive" : ""}`}
                          ref={
                            reactionPickerFor === m.id
                              ? reactionPickerRef
                              : null
                          }>
                          <div className="messenger-reactionBar">
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className="messenger-reactionBar__emoji"
                                onClick={() => handleReact(m.id, emoji)}
                                title={emoji}>
                                {emoji}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="messenger-reactionBar__more"
                              onClick={() =>
                                setReactionPickerFor(
                                  reactionPickerFor === m.id ? null : m.id,
                                )
                              }
                              title="Reply">
                              <FiCornerUpLeft
                                size={14}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyTo({
                                    id: m.id,
                                    content: m.content,
                                    senderName: isOwn ? "You" : senderName,
                                  });
                                  composerRef.current?.focus();
                                }}
                              />
                            </button>
                            <button
                              type="button"
                              className="messenger-reactionBar__more"
                              onClick={(e) => handleMsgContextMenu(e, m)}
                              title="More">
                              <FiMoreHorizontal size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {typingUsers[selectedConversationId] && (
                  <div className="messenger-thread__typing">
                    <div
                      className="messenger-messageRow__avatarSlot isVisible"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                        color: "var(--panel-text-on-accent)",
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        flexShrink: 0,
                        marginRight: 8,
                      }}>
                      {getConversationTitle(
                        activeConversation,
                        currentUserId,
                      )[0]?.toUpperCase()}
                    </div>
                    <div className="messenger-thread__typingBubble">
                      <div
                        className="messenger-thread__typingDots"
                        aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Composer */}
          {selectedConversationId && (
            <div className="messenger-thread__composerWrap">
              {replyTo && (
                <div className="messenger-thread__replyPreview">
                  <div className="messenger-thread__replyPreview__bar" />
                  <div className="messenger-thread__replyPreview__text">
                    <div className="messenger-thread__replyPreview__name">
                      Replying to {replyTo.senderName}
                    </div>
                    <div className="messenger-thread__replyPreview__content">
                      {replyTo.content}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="messenger-iconButton"
                    onClick={() => setReplyTo(null)}>
                    <FiX size={14} />
                  </button>
                </div>
              )}

              <div className="messenger-thread__composer">
                {/* Left buttons */}
                <div className="messenger-thread__composerLeft">
                  <button
                    type="button"
                    className="messenger-composerBtn"
                    title="Attach image"
                    onClick={handleAttachImage}>
                    <FiImage size={18} />
                  </button>
                  <button
                    type="button"
                    className="messenger-composerBtn"
                    title="GIF"
                    onClick={handlePasteGifUrl}>
                    <FiGift size={18} />
                  </button>
                </div>

                {/* Textarea row + emoji picker */}
                <div style={{ flex: 1, position: "relative" }}>
                  {showEmojiPicker && (
                    <div className="messenger-emojiPicker" ref={emojiPickerRef}>
                      <div className="messenger-emojiPicker__grid">
                        {EMOJI_PALETTE.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="messenger-emojiPicker__btn"
                            onClick={() => {
                              setMessageDraft((prev) => prev + emoji);
                              composerRef.current?.focus();
                            }}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="messenger-thread__composerRow">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleImageFileSelected}
                    />
                    <button
                      type="button"
                      className="messenger-composerBtn"
                      style={{ width: 28, height: 28, flexShrink: 0 }}
                      title="Emoji"
                      onClick={() => setShowEmojiPicker((v) => !v)}>
                      <FiSmile size={18} />
                    </button>

                    <textarea
                      ref={composerRef}
                      placeholder="Aa"
                      value={messageDraft}
                      rows={1}
                      onChange={(e) => {
                        setMessageDraft(e.target.value);
                        handleTyping();
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 120)}px`;
                      }}
                      onInput={(e) => {
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 120)}px`;
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        (e.preventDefault(), handleSend())
                      }
                    />
                  </div>
                </div>

                {/* Send / Thumb */}
                <div className="messenger-thread__composerRight">
                  {messageDraft.trim() ? (
                    <button
                      type="button"
                      className="messenger-sendBtn"
                      onClick={handleSend}
                      title="Send">
                      <FiSend size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="messenger-thumbBtn"
                      title="Like"
                      onClick={() => {
                        setMessageDraft("👍");
                        setTimeout(handleSend, 50);
                      }}>
                      👍
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── DRAWER ──────────────────────────────── */}
        {selectedConversationId && (
          <aside className={`messenger-drawer${drawerOpen ? " isOpen" : ""}`}>
            <div className="messenger-drawer__header">
              <div>
                <small className="messenger-drawer__eyebrow">
                  {activeConversation?.isGroup ? "Group details" : "Profile"}
                </small>
                <h3>
                  {activeConversation?.isGroup
                    ? "Manage group"
                    : "Chat profile"}
                </h3>
              </div>
              <button
                type="button"
                className="messenger-iconButton"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close details">
                <FiX size={15} />
              </button>
            </div>

            <div className="messenger-drawer__scrollable">
              {activeConversation?.isGroup ? (
                <>
                  <div className="messenger-drawer__section">
                    <label className="messenger-drawer__label">
                      Group title
                    </label>
                    <input
                      className="messenger-drawer__input"
                      value={drawerGroupTitle}
                      onChange={(e) => setDrawerGroupTitle(e.target.value)}
                      placeholder="Group title"
                    />
                    <button
                      type="button"
                      className="messenger-drawer__button"
                      onClick={() => void handleSaveGroupTitle()}
                      disabled={composerBusy}>
                      Save title
                    </button>
                  </div>

                  <div className="messenger-drawer__section">
                    <div className="messenger-drawer__sectionHeader">
                      <div>
                        <h4>Members</h4>
                        <p>
                          {activeConversation.members?.length ?? 0} people in
                          this group
                        </p>
                      </div>
                    </div>
                    <div className="messenger-memberList">
                      {(activeConversation?.members ?? []).map((member) => (
                        <Link
                          key={member.userId}
                          to={`/u/${encodeURIComponent(member.username)}`}
                          className="messenger-memberCard">
                          <span className="messenger-memberCard__avatar">
                            {(member.firstName ||
                              member.username ||
                              "?")[0]?.toUpperCase()}
                          </span>
                          <span className="messenger-memberCard__meta">
                            <strong>
                              {member.firstName
                                ? `${member.firstName} ${member.lastName ?? ""}`.trim()
                                : member.username}
                            </strong>
                            <small>@{member.username}</small>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="messenger-drawer__section">
                    <div className="messenger-drawer__sectionHeader">
                      <div>
                        <h4>Add people</h4>
                        <p>Bring more friends into this group.</p>
                      </div>
                      <button
                        type="button"
                        className="messenger-drawer__button messenger-drawer__button--compact"
                        onClick={() => void handleAddMembersToGroup()}
                        disabled={groupActionBusy}>
                        Add
                      </button>
                    </div>

                    <div className="messenger-pane__search messenger-pane__search--drawer">
                      <FiSearch size={14} />
                      <input
                        placeholder="Search friends"
                        value={drawerMemberSearch}
                        onChange={(e) => setDrawerMemberSearch(e.target.value)}
                      />
                    </div>

                    <div className="messenger-memberList messenger-memberList--compact">
                      {drawerAddableFriends.map((friend) => {
                        const selected = drawerSelectedMemberIds.includes(
                          friend.userId,
                        );
                        return (
                          <button
                            key={friend.userId}
                            type="button"
                            className={`messenger-memberCard${selected ? " isSelected" : ""}`}
                            onClick={() => toggleDrawerMember(friend.userId)}>
                            <span className="messenger-memberCard__avatar">
                              {(friend.firstName ||
                                friend.username ||
                                "?")[0]?.toUpperCase()}
                            </span>
                            <span className="messenger-memberCard__meta">
                              <strong>
                                {friend.firstName
                                  ? `${friend.firstName} ${friend.lastName ?? ""}`.trim()
                                  : friend.username}
                              </strong>
                              <small>@{friend.username}</small>
                            </span>
                            <span className="messenger-memberCard__action">
                              {selected ? "✓" : "Add"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="messenger-drawer__section">
                    <div className="messenger-profileCard">
                      <div
                        className="messenger-thread__avatar"
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: "50%",
                          fontSize: "1.2rem",
                        }}>
                        {(activeConversationPeer?.firstName ||
                          activeConversationPeer?.username ||
                          "?")[0]?.toUpperCase()}
                      </div>
                      <div className="messenger-profileCard__meta">
                        <strong>
                          {activeConversationPeer?.firstName
                            ? `${activeConversationPeer.firstName} ${activeConversationPeer.lastName ?? ""}`.trim()
                            : activeConversationPeer?.username ||
                              "Conversation"}
                        </strong>
                        <small>
                          {activeConversationPeer?.username
                            ? `@${activeConversationPeer.username}`
                            : "Direct chat"}
                        </small>
                        <small
                          style={{ color: "#31a24c", fontSize: "0.76rem" }}>
                          ● Active now
                        </small>
                      </div>
                    </div>
                  </div>
                  {activeConversationPeer?.username && (
                    <div className="messenger-drawer__section">
                      <Link
                        to={`/u/${encodeURIComponent(activeConversationPeer.username)}`}
                        className="messenger-drawer__button messenger-drawer__button--link">
                        View profile
                      </Link>
                      <button
                        type="button"
                        className="messenger-drawer__button"
                        onClick={startGroupWithPeer}>
                        Start group with{" "}
                        {activeConversationPeer.firstName ||
                          activeConversationPeer.username}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── CREATE GROUP MODAL ─────────────────────── */}
      {groupComposerOpen && (
        <div
          className="messenger-modal__backdrop"
          role="presentation"
          onClick={resetGroupComposer}>
          <div
            className="messenger-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Create group"
            onClick={(e) => e.stopPropagation()}>
            <div className="messenger-modal__header">
              <div>
                <small className="messenger-modal__eyebrow">New group</small>
                <h3>Create a group chat</h3>
              </div>
              <button
                type="button"
                className="messenger-iconButton"
                onClick={resetGroupComposer}
                aria-label="Close">
                <FiX size={15} />
              </button>
            </div>

            <div className="messenger-modal__fields">
              <label className="messenger-drawer__label">
                Group title
                <input
                  className="messenger-drawer__input"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Give the group a name"
                />
              </label>
              <label className="messenger-drawer__label">
                First message
                <textarea
                  className="messenger-drawer__textarea"
                  value={groupFirstMessage}
                  onChange={(e) => setGroupFirstMessage(e.target.value)}
                  placeholder="Say hello to start the chat"
                />
              </label>
            </div>

            <div className="messenger-modal__section">
              <div className="messenger-drawer__sectionHeader">
                <div>
                  <h4>Pick members</h4>
                  <p>Add friends now — you can add more later.</p>
                </div>
              </div>

              <div className="messenger-modal__chips">
                {selectedGroupMemberIds.map((memberId) => {
                  const friend = friends.find((f) => f.userId === memberId);
                  if (!friend) return null;
                  return (
                    <button
                      key={friend.userId}
                      type="button"
                      className="messenger-modal__chip isSelected"
                      onClick={() => toggleSelectedGroupMember(friend.userId)}>
                      {friend.firstName || friend.username}
                      <FiX size={12} />
                    </button>
                  );
                })}
              </div>

              <div className="messenger-pane__search messenger-pane__search--drawer">
                <FiSearch size={14} />
                <input
                  placeholder="Search friends"
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                />
              </div>

              <div className="messenger-memberList messenger-memberList--compact">
                {createGroupResults.map((friend) => (
                  <button
                    key={friend.userId}
                    type="button"
                    className="messenger-memberCard"
                    onClick={() => toggleSelectedGroupMember(friend.userId)}>
                    <span className="messenger-memberCard__avatar">
                      {(friend.firstName ||
                        friend.username ||
                        "?")[0]?.toUpperCase()}
                    </span>
                    <span className="messenger-memberCard__meta">
                      <strong>
                        {friend.firstName
                          ? `${friend.firstName} ${friend.lastName ?? ""}`.trim()
                          : friend.username}
                      </strong>
                      <small>@{friend.username}</small>
                    </span>
                    <span className="messenger-memberCard__action">Add</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="messenger-modal__submit"
              onClick={() => void handleCreateGroup()}
              disabled={groupActionBusy}>
              {groupActionBusy ? "Creating…" : "Create group"}
            </button>
          </div>
        </div>
      )}

      {/* ── MESSAGE CONTEXT MENU ──────────────────── */}
      {msgContextMenu && (
        <div
          className="messenger-msgContextMenu"
          style={{
            top: Math.min(msgContextMenu.y, window.innerHeight - 220),
            left: Math.min(msgContextMenu.x, window.innerWidth - 210),
          }}>
          <button
            type="button"
            className="messenger-msgContextMenu__item"
            onClick={() => {
              const senderMember = activeConversation?.members?.find(
                (m) => m.userId === msgContextMenu.message.senderId,
              );
              const senderName = senderMember
                ? senderMember.firstName || senderMember.username || ""
                : msgContextMenu.message.sender?.firstName ||
                  msgContextMenu.message.sender?.username ||
                  "";
              setReplyTo({
                id: msgContextMenu.message.id,
                content: msgContextMenu.message.content,
                senderName:
                  msgContextMenu.message.senderId === currentUserId
                    ? "You"
                    : senderName,
              });
              composerRef.current?.focus();
              setMsgContextMenu(null);
            }}>
            <FiCornerUpLeft size={15} /> Reply
          </button>
          {msgContextMenu.message.senderId === currentUserId && (
            <button
              type="button"
              className="messenger-msgContextMenu__item"
              onClick={() => {
                void handleEditMessage(msgContextMenu.message);
                setMsgContextMenu(null);
              }}>
              <FiMoreHorizontal size={15} /> Edit message
            </button>
          )}
          <button
            type="button"
            className="messenger-msgContextMenu__item"
            onClick={() => handleStarMessage(msgContextMenu.message.id)}>
            <FiStar size={15} />{" "}
            {starredMessages.has(msgContextMenu.message.id)
              ? "Unstar"
              : "Star message"}
          </button>
          <button
            type="button"
            className="messenger-msgContextMenu__item"
            onClick={() => {
              navigator.clipboard
                ?.writeText(msgContextMenu.message.content)
                .then(() => toast.success("Copied!"));
              setMsgContextMenu(null);
            }}>
            <FiShare2 size={15} /> Copy text
          </button>
          <div className="messenger-msgContextMenu__divider" />
          <button
            type="button"
            className="messenger-msgContextMenu__item isDestructive"
            onClick={() => {
              void handleDeleteMessage(msgContextMenu.message);
              setMsgContextMenu(null);
            }}>
            <FiTrash2 size={15} /> Delete
          </button>
        </div>
      )}

      {/* ── CONVERSATION CONTEXT MENU ─────────────── */}
      {convContextMenu && (
        <div
          className="messenger-convContextMenu"
          style={{
            top: Math.min(convContextMenu.y, window.innerHeight - 240),
            left: Math.min(convContextMenu.x, window.innerWidth - 210),
          }}>
          <button
            type="button"
            className="messenger-convContextMenu__item"
            onClick={() => handlePinConversation(convContextMenu.conv.id)}>
            <FiBookmark size={15} />
            {pinnedConversations.has(convContextMenu.conv.id)
              ? "Unpin"
              : "Pin"}{" "}
            conversation
          </button>
          <button
            type="button"
            className="messenger-convContextMenu__item"
            onClick={() => handleMuteConversation(convContextMenu.conv.id)}>
            {mutedConversations.has(convContextMenu.conv.id) ? (
              <FiBell size={15} />
            ) : (
              <FiBellOff size={15} />
            )}
            {mutedConversations.has(convContextMenu.conv.id)
              ? "Unmute"
              : "Mute"}{" "}
            notifications
          </button>
          <button
            type="button"
            className="messenger-convContextMenu__item"
            onClick={() => handleArchiveConversation(convContextMenu.conv.id)}>
            <FiArchive size={15} />
            {convContextMenu.conv.archivedAt ? "Restore" : "Archive"} conversation
          </button>
          <div className="messenger-convContextMenu__divider" />
          <button
            type="button"
            className="messenger-convContextMenu__item isDestructive"
            onClick={() => {
              handleArchiveConversation(convContextMenu.conv.id);
            }}>
            <FiTrash2 size={15} /> Delete conversation
          </button>
        </div>
      )}
    </section>
  );
};

export default MessengerHub;
