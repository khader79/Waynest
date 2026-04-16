import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import {
  FiPlus,
  FiSearch,
  FiSend,
  FiImage,
  FiLoader,
  FiUsers,
  FiX,
  FiCheck,
  FiMessageSquare,
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
  FiArrowLeft,
  FiSettings,
  FiUser,
  FiUserPlus,
  FiUserMinus,
  FiLogOut,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { API_BASE_URL } from "@/api/client";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import {
  createConversation,
  fetchFriends,
  fetchInbox,
  fetchConversationMessages,
  sendMessage,
  uploadChatImage,
  markConversationRead,
  normalizeMessageItem,
  addConversationMembers,
  removeConversationMember,
  setConversationMemberRole,
  leaveConversation,
} from "@/api/social";
import "./MessengerHub.css";

const getConvDisplayName = (conv, currentUserId) => {
  if (!conv) return "Chat";
  if (conv.isGroup) return conv.title || "Group";
  if (conv.members?.length) {
    const other = conv.members.find((m) => m.userId !== currentUserId);
    if (other) {
      const name = `${other.firstName || ""} ${other.lastName || ""}`.trim();
      if (name) return name;
      if (other.username) return other.username;
    }
    if (conv.members.length === 1) {
      const self = conv.members[0];
      const name = `${self.firstName || ""} ${self.lastName || ""}`.trim();
      return name || "Saved Messages";
    }
  }
  return conv.title || "Private Chat";
};

const getConvAvatarInfo = (conv, currentUserId) => {
  if (!conv) return { type: "initial", value: "?" };
  if (conv.isGroup) return { type: "icon" };
  if (conv.members?.length) {
    const other = conv.members.find((m) => m.userId !== currentUserId);
    const target = other ?? conv.members[0];
    const avatarSrc = getResolvedAvatarUrl(target);
    if (avatarSrc) return { type: "img", src: avatarSrc };
    const name = getConvDisplayName(conv, currentUserId);
    return { type: "initial", value: (name[0] || "?").toUpperCase() };
  }
  const name = getConvDisplayName(conv, currentUserId);
  return { type: "initial", value: (name[0] || "?").toUpperCase() };
};

const getDirectPeer = (conv, currentUserId) => {
  if (!conv || conv.isGroup || !Array.isArray(conv.members)) return null;
  return conv.members.find((m) => m.userId !== currentUserId) ?? null;
};

const getApiErrorMessage = (error) => {
  const message = error?.response?.data?.message;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message) && message.length > 0) {
    const first = message[0];
    if (typeof first === "string" && first.trim()) return first;
  }
  return null;
};

const toConversationTimestamp = (value) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const sortConversationsByRecent = (rows) =>
  [...rows].sort((left, right) => {
    const byLastMessageAt =
      toConversationTimestamp(right?.lastMessageAt) -
      toConversationTimestamp(left?.lastMessageAt);

    if (byLastMessageAt !== 0) return byLastMessageAt;

    return (
      toConversationTimestamp(right?.updatedAt) -
      toConversationTimestamp(left?.updatedAt)
    );
  });

const MESSAGE_URL_REGEX =
  /((?:https?:\/\/|www\.)[^\s]+|(?:\/(?:social|inbox|u|p|provider|place|places|events|trip|trips)\S*)|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:[/?#][^\s]*)?)/gi;
const MESSAGE_IMAGE_REGEX = /\.(avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/i;
const CHAT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const splitTrailingPunctuation = (value) => {
  if (typeof value !== "string" || !value) {
    return { token: value, trailing: "" };
  }

  const trailingMatch = value.match(/[),.!?;:]+$/);
  if (!trailingMatch) return { token: value, trailing: "" };

  const trailing = trailingMatch[0];
  const token = value.slice(0, -trailing.length);
  if (!token) return { token: value, trailing: "" };

  return { token, trailing };
};

const toMessageLinkMeta = (rawToken) => {
  if (typeof rawToken !== "string") {
    return { href: "", internalPath: null };
  }

  const baseOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : null;

  const normalizedToken = rawToken.startsWith("/")
    ? rawToken
    : rawToken.startsWith("http://") || rawToken.startsWith("https://")
      ? rawToken
      : `https://${rawToken}`;

  try {
    const parsed = baseOrigin
      ? new URL(normalizedToken, baseOrigin)
      : new URL(normalizedToken);

    const internalPath =
      baseOrigin && parsed.origin === baseOrigin
        ? `${parsed.pathname}${parsed.search}${parsed.hash}`
        : null;

    return { href: parsed.href, internalPath };
  } catch {
    return { href: normalizedToken, internalPath: null };
  }
};

const getMessageImageUrl = (content) => {
  if (typeof content !== "string") {
    return null;
  }

  const trimmed = content.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return null;
  }

  const resolved = resolveMediaUrl(trimmed);
  if (typeof resolved !== "string" || !resolved.trim()) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("/uploads/") ||
    lower.startsWith("uploads/") ||
    lower.startsWith("./uploads/")
  ) {
    return resolved;
  }

  try {
    const parsed = new URL(
      resolved,
      typeof window !== "undefined" ? window.location.origin : undefined,
    );
    const pathname = parsed.pathname.toLowerCase();
    if (
      pathname.startsWith("/uploads/") ||
      MESSAGE_IMAGE_REGEX.test(pathname)
    ) {
      return parsed.href;
    }
  } catch {
    if (MESSAGE_IMAGE_REGEX.test(resolved)) {
      return resolved;
    }
  }

  return null;
};

const getConversationPreviewText = (content, isRTL) => {
  const text = typeof content === "string" ? content.trim() : "";
  if (!text) {
    return isRTL ? "ابدأ المحادثة" : "Start chatting";
  }

  return getMessageImageUrl(text) ? (isRTL ? "📷 صورة" : "📷 Photo") : text;
};

const isFileDragEvent = (event) => {
  const types = event?.dataTransfer?.types;
  if (!types) {
    return false;
  }
  return Array.from(types).includes("Files");
};

const renderMessageContent = (content, navigate) => {
  if (typeof content !== "string" || !content) return content;

  MESSAGE_URL_REGEX.lastIndex = 0;
  const nodes = [];
  let lastIndex = 0;
  let match = null;

  while ((match = MESSAGE_URL_REGEX.exec(content)) !== null) {
    const matchStart = match.index;
    const rawToken = match[0];

    if (matchStart > lastIndex) {
      nodes.push(content.slice(lastIndex, matchStart));
    }

    const { token, trailing } = splitTrailingPunctuation(rawToken);

    const isBareDomainToken =
      typeof token === "string" &&
      token.length > 0 &&
      !token.startsWith("/") &&
      !/^https?:\/\//i.test(token) &&
      !/^www\./i.test(token);

    if (
      isBareDomainToken &&
      matchStart > 0 &&
      content[matchStart - 1] === "@"
    ) {
      nodes.push(rawToken);
      lastIndex = matchStart + rawToken.length;
      continue;
    }

    if (!token) {
      nodes.push(rawToken);
      lastIndex = matchStart + rawToken.length;
      continue;
    }

    const { href, internalPath } = toMessageLinkMeta(token);

    nodes.push(
      <a
        key={`msg-link-${matchStart}-${nodes.length}`}
        className="mh-msg-link"
        href={href}
        target={internalPath ? undefined : "_blank"}
        rel={internalPath ? undefined : "noreferrer noopener"}
        onClick={(event) => {
          if (!internalPath) return;
          event.preventDefault();
          navigate(internalPath);
        }}>
        {token}
      </a>,
    );

    if (trailing) {
      nodes.push(trailing);
    }

    lastIndex = matchStart + rawToken.length;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : content;
};

const MessengerHub = () => {
  const { user } = useAuth();
  const { refreshUnreadCount } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserId = user?.id ?? user?.userId;
  const isRTL = document.documentElement.dir === "rtl";

  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [groupSelectedToAdd, setGroupSelectedToAdd] = useState([]);
  const [isGroupUpdating, setIsGroupUpdating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [activeImageViewerUrl, setActiveImageViewerUrl] = useState("");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const imageInputRef = useRef(null);
  const pendingImagePreviewUrlRef = useRef("");
  const typingTimeouts = useRef({});
  const typingEmitTimeout = useRef(null);
  const joinedConversationRef = useRef(null);
  const selectedConversationIdRef = useRef(null);
  const conversationsRef = useRef([]);

  const selectedConversationId = searchParams.get("conversation");
  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  );

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    setIsGroupSettingsOpen(false);
    setGroupMemberSearch("");
    setGroupSelectedToAdd([]);
    setIsDragActive(false);
    setActiveImageViewerUrl("");

    setPendingImageFile(null);
    if (pendingImagePreviewUrlRef.current) {
      URL.revokeObjectURL(pendingImagePreviewUrlRef.current);
      pendingImagePreviewUrlRef.current = "";
    }
    setPendingImagePreviewUrl("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (!activeImageViewerUrl) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveImageViewerUrl("");
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeImageViewerUrl]);

  useEffect(
    () => () => {
      if (pendingImagePreviewUrlRef.current) {
        URL.revokeObjectURL(pendingImagePreviewUrlRef.current);
      }
    },
    [],
  );

  const setPendingImagePreview = useCallback((nextUrl) => {
    if (pendingImagePreviewUrlRef.current) {
      URL.revokeObjectURL(pendingImagePreviewUrlRef.current);
    }
    pendingImagePreviewUrlRef.current = nextUrl || "";
    setPendingImagePreviewUrl(nextUrl || "");
  }, []);

  const clearPendingImage = useCallback(() => {
    setPendingImageFile(null);
    setPendingImagePreview("");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [setPendingImagePreview]);

  const queuePendingImage = useCallback(
    (file) => {
      if (!file) {
        return false;
      }

      if (!file.type?.startsWith("image/")) {
        toast.error(isRTL ? "الملف لازم يكون صورة" : "Please choose an image");
        return false;
      }

      if (file.size > CHAT_IMAGE_MAX_SIZE_BYTES) {
        toast.error(
          isRTL
            ? "حجم الصورة لازم يكون 5MB أو أقل"
            : "Image size must be 5MB or less",
        );
        return false;
      }

      setPendingImageFile(file);
      setPendingImagePreview(URL.createObjectURL(file));
      return true;
    },
    [isRTL, setPendingImagePreview],
  );

  const handleChatDragOver = useCallback(
    (event) => {
      if (!selectedConversationId || !isFileDragEvent(event)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsDragActive(true);
    },
    [selectedConversationId],
  );

  const handleChatDragLeave = useCallback((event) => {
    if (!isFileDragEvent(event)) {
      return;
    }

    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setIsDragActive(false);
  }, []);

  const handleChatDrop = useCallback(
    (event) => {
      if (!selectedConversationId || !isFileDragEvent(event)) {
        return;
      }

      event.preventDefault();
      setIsDragActive(false);
      const droppedFile = event.dataTransfer?.files?.[0];
      if (!droppedFile || isUploadingImage) {
        return;
      }

      queuePendingImage(droppedFile);
    },
    [isUploadingImage, queuePendingImage, selectedConversationId],
  );

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadInbox = useCallback(async () => {
    try {
      const data = await fetchInbox();
      setConversations(
        sortConversationsByRecent(Array.isArray(data) ? data : []),
      );
    } catch {}
  }, []);

  const joinCurrentRoom = useCallback(() => {
    const convId = selectedConversationIdRef.current;
    if (!convId) return;
    const prev = joinedConversationRef.current;
    if (prev && prev !== convId) {
      socketRef.current?.emit("leave", { conversationId: prev });
      joinedConversationRef.current = null;
    }
    socketRef.current?.emit("join", { conversationId: convId }, (res) => {
      if (res?.ok) joinedConversationRef.current = convId;
    });
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    const base = API_BASE_URL.replace(/\/$/, "");
    socketRef.current = io(`${base}/chat`, {
      auth: { token },
      query: { userId: currentUserId },
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current.on("connect", () => joinCurrentRoom());

    const onMessage = (payload) => {
      try {
        const normMsg =
          payload?.message && typeof normalizeMessageItem === "function"
            ? normalizeMessageItem(payload.message, payload.conversationId)
            : payload?.message;

        const conversationId =
          payload?.conversationId ??
          normMsg?.conversationId ??
          (payload?.message && typeof payload.message === "object"
            ? payload.message.conversationId
            : null);

        const conversationExists = conversationId
          ? conversationsRef.current.some(
              (conversation) => conversation.id === conversationId,
            )
          : false;

        if (conversationId === selectedConversationIdRef.current) {
          setMessages((prev) => {
            if (!normMsg?.id) return prev;
            if (prev.some((m) => m.id === normMsg.id)) return prev;
            const merged = [...prev, normMsg];
            merged.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
            return merged;
          });
        }

        setConversations((prev) => {
          if (!conversationId) return prev;

          const conversationIndex = prev.findIndex(
            (conversation) => conversation.id === conversationId,
          );
          if (conversationIndex < 0) return prev;

          const conversation = prev[conversationIndex];

          const incomingSenderId =
            normMsg?.senderId ??
            (payload?.message && typeof payload.message === "object"
              ? payload.message.senderId
              : null);

          const isActiveConversation =
            conversationId === selectedConversationIdRef.current;
          const shouldIncrementUnread =
            !isActiveConversation &&
            incomingSenderId &&
            String(incomingSenderId) !== String(currentUserId);

          const updatedConversation = {
            ...conversation,
            lastMessage: normMsg?.content ?? conversation.lastMessage,
            lastMessageAt:
              normMsg?.createdAt ??
              conversation.lastMessageAt ??
              new Date().toISOString(),
            lastMessageSenderId:
              incomingSenderId ?? conversation.lastMessageSenderId,
            unreadCount: isActiveConversation
              ? 0
              : shouldIncrementUnread
                ? (Number(conversation.unreadCount) || 0) + 1
                : Number(conversation.unreadCount) || 0,
          };

          return [
            updatedConversation,
            ...prev.slice(0, conversationIndex),
            ...prev.slice(conversationIndex + 1),
          ];
        });

        if (!conversationExists) {
          void loadInbox();
        }

        window.dispatchEvent(
          new CustomEvent("chat:message", { detail: payload }),
        );
      } catch {}
    };

    const onConversationUpsert = (payload) => {
      if (!payload?.id) return;
      setConversations((prev) => {
        const normalizedPayload = {
          ...payload,
          unreadCount:
            payload.id === selectedConversationIdRef.current
              ? 0
              : Number(payload.unreadCount) || 0,
          lastMessageAt:
            payload.lastMessageAt ??
            payload.updatedAt ??
            new Date().toISOString(),
        };

        const index = prev.findIndex(
          (conversation) => conversation.id === payload.id,
        );

        if (index < 0) {
          return [normalizedPayload, ...prev];
        }

        const mergedConversation = {
          ...prev[index],
          ...normalizedPayload,
        };

        return [
          mergedConversation,
          ...prev.slice(0, index),
          ...prev.slice(index + 1),
        ];
      });
    };

    const onTyping = ({ conversationId, userId }) => {
      if (
        conversationId === selectedConversationIdRef.current &&
        userId !== currentUserId
      ) {
        setTypingUsers((prev) => ({ ...prev, [userId]: true }));
        clearTimeout(typingTimeouts.current[userId]);
        typingTimeouts.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const n = { ...prev };
            delete n[userId];
            return n;
          });
        }, 3500);
      }
    };

    const onStopTyping = ({ userId }) => {
      clearTimeout(typingTimeouts.current[userId]);
      setTypingUsers((prev) => {
        const n = { ...prev };
        delete n[userId];
        return n;
      });
    };

    socketRef.current.on("message:new", onMessage);
    socketRef.current.on("conversation:upsert", onConversationUpsert);
    socketRef.current.on("typing", onTyping);
    socketRef.current.on("stop_typing", onStopTyping);

    return () => {
      socketRef.current?.off("message:new", onMessage);
      socketRef.current?.off("conversation:upsert", onConversationUpsert);
      socketRef.current?.off("typing", onTyping);
      socketRef.current?.off("stop_typing", onStopTyping);
      socketRef.current?.disconnect();
      Object.values(typingTimeouts.current).forEach(clearTimeout);
    };
  }, [currentUserId, loadInbox, joinCurrentRoom]);

  useEffect(() => {
    loadInbox();
    fetchFriends()
      .then(setFriends)
      .catch(() => {});
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedConversationId) return;
    setMessages([]);

    fetchConversationMessages(selectedConversationId)
      .then((msgs) => {
        setMessages(msgs);
        setTimeout(() => scrollToBottom(false), 60);
      })
      .catch(() => {});

    markConversationRead(selectedConversationId)
      .then(() => {
        setConversations((prev) =>
          sortConversationsByRecent(
            prev.map((c) =>
              c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c,
            ),
          ),
        );

        void refreshUnreadCount({ announceNew: false });
      })
      .catch(() => {});

    inputRef.current?.focus();

    const joinRoom = () => {
      const prev = joinedConversationRef.current;
      if (prev && prev !== selectedConversationId) {
        socketRef.current?.emit("leave", { conversationId: prev });
        joinedConversationRef.current = null;
      }
      socketRef.current?.emit(
        "join",
        { conversationId: selectedConversationId },
        (res) => {
          if (res?.ok) joinedConversationRef.current = selectedConversationId;
        },
      );
    };

    if (socketRef.current?.connected) joinRoom();
    else socketRef.current?.once("connect", joinRoom);

    return () => {
      if (joinedConversationRef.current) {
        socketRef.current?.emit("leave", {
          conversationId: joinedConversationRef.current,
        });
        joinedConversationRef.current = null;
      }
    };
  }, [refreshUnreadCount, selectedConversationId, scrollToBottom]);

  const handleInputChange = (e) => {
    setMessageDraft(e.target.value);
    if (socketRef.current && selectedConversationId) {
      socketRef.current.emit("typing", {
        conversationId: selectedConversationId,
        isTyping: true,
      });
      clearTimeout(typingEmitTimeout.current);
      typingEmitTimeout.current = setTimeout(() => {
        socketRef.current?.emit("typing", {
          conversationId: selectedConversationId,
          isTyping: false,
        });
      }, 3500);
    }
  };

  const handleCreateChat = async () => {
    if (!firstMessage.trim()) {
      toast.error(
        isRTL ? "اكتب رسالتك الأولى أولاً" : "Write your first message",
      );
      return;
    }
    if (selectedFriends.length === 0) {
      toast.error(
        isRTL ? "اختر شخصاً على الأقل" : "Select at least one person",
      );
      return;
    }
    setIsCreating(true);
    try {
      const res = await createConversation({
        participantIds: selectedFriends,
        title: isGroupMode && groupTitle.trim() ? groupTitle.trim() : undefined,
        firstMessage: firstMessage.trim(),
      });
      setSearchParams({ conversation: res.conversation.id });
      setMobileShowChat(true);
      setIsModalOpen(false);
      resetModal();
      loadInbox();
    } catch {
      toast.error(
        isRTL ? "فشل إنشاء المحادثة" : "Failed to create conversation",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const resetModal = () => {
    setIsGroupMode(false);
    setSelectedFriends([]);
    setGroupTitle("");
    setFriendSearch("");
    setFirstMessage("");
  };

  const toggleFriendSelection = (id) => {
    if (isGroupMode) {
      setSelectedFriends((prev) =>
        prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id],
      );
    } else {
      setSelectedFriends([id]);
    }
  };

  const toggleGroupAddSelection = (userId) => {
    setGroupSelectedToAdd((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const openGroupSettings = () => {
    setGroupMemberSearch("");
    setGroupSelectedToAdd([]);
    setIsGroupSettingsOpen(true);
  };

  const handleOpenDirectProfile = () => {
    const peer = getDirectPeer(selectedConversation, currentUserId);
    if (!peer?.username) {
      toast.error(
        isRTL ? "لا يوجد اسم مستخدم لهذا الحساب" : "No username available",
      );
      return;
    }
    navigate(`/u/${encodeURIComponent(peer.username)}`);
  };

  const handleAddMembersToGroup = async () => {
    if (!selectedConversation?.id || !selectedConversation?.isGroup) return;
    if (groupSelectedToAdd.length === 0) {
      toast.error(
        isRTL ? "اختر صديقاً واحداً على الأقل" : "Select at least one friend",
      );
      return;
    }

    setIsGroupUpdating(true);
    try {
      const response = await addConversationMembers(selectedConversation.id, {
        userIds: groupSelectedToAdd,
      });
      const addedCount =
        typeof response?.addedCount === "number"
          ? response.addedCount
          : groupSelectedToAdd.length;

      toast.success(
        isRTL
          ? `تمت إضافة ${addedCount} عضو بنجاح`
          : `${addedCount} member${addedCount === 1 ? "" : "s"} added`,
      );
      setGroupSelectedToAdd([]);
      setGroupMemberSearch("");
      await loadInbox();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ||
          (isRTL ? "فشل إضافة الأعضاء" : "Failed to add members"),
      );
    } finally {
      setIsGroupUpdating(false);
    }
  };

  const handleRemoveMemberFromGroup = async (member) => {
    if (!selectedConversation?.id || !member?.userId) return;
    const actorMember = (selectedConversation.members || []).find(
      (entry) => entry.userId === currentUserId,
    );
    const actorIsOwner = selectedConversation.ownerUserId === currentUserId;
    const actorIsAdmin = actorMember?.conversationRole === "ADMIN";
    const actorCanRemove = actorIsOwner || actorIsAdmin;

    if (!actorCanRemove) {
      toast.error(
        isRTL
          ? "فقط الأونر أو الأدمن يمكنه حذف الأعضاء"
          : "Only owner/admin can remove members",
      );
      return;
    }

    if (member.userId === selectedConversation.ownerUserId) {
      toast.error(
        isRTL ? "لا يمكن حذف الأونر من الجروب" : "Owner cannot be removed",
      );
      return;
    }

    if (!actorIsOwner && member.conversationRole === "ADMIN") {
      toast.error(
        isRTL
          ? "الأدمن لا يمكنه حذف أدمن آخر"
          : "Admins cannot remove other admins",
      );
      return;
    }

    const confirmed = window.confirm(
      isRTL
        ? `هل تريد طرد ${member.firstName || member.username || "هذا العضو"} من المجموعة؟`
        : `Remove ${member.firstName || member.username || "this member"} from the group?`,
    );
    if (!confirmed) return;

    setIsGroupUpdating(true);
    try {
      await removeConversationMember(selectedConversation.id, member.userId);
      toast.success(
        isRTL ? "تم طرد العضو من المجموعة" : "Member removed from group",
      );
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                members: (conversation.members || []).filter(
                  (entry) => entry.userId !== member.userId,
                ),
              }
            : conversation,
        ),
      );
      await loadInbox();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ||
          (isRTL ? "فشل حذف العضو" : "Failed to remove member"),
      );
    } finally {
      setIsGroupUpdating(false);
    }
  };

  const handleToggleMemberAdmin = async (member) => {
    if (!selectedConversation?.id || !member?.userId) return;
    if (selectedConversation.ownerUserId !== currentUserId) {
      toast.error(
        isRTL
          ? "فقط الأونر يمكنه تغيير صلاحيات الأدمن"
          : "Only owner can manage admins",
      );
      return;
    }
    if (member.userId === selectedConversation.ownerUserId) {
      return;
    }

    const nextRole = member.conversationRole === "ADMIN" ? "MEMBER" : "ADMIN";

    setIsGroupUpdating(true);
    try {
      await setConversationMemberRole(
        selectedConversation.id,
        member.userId,
        nextRole,
      );
      toast.success(
        isRTL
          ? nextRole === "ADMIN"
            ? "تم تعيين العضو كأدمن"
            : "تمت إزالة صلاحية الأدمن"
          : nextRole === "ADMIN"
            ? "Member promoted to admin"
            : "Admin role removed",
      );

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                members: (conversation.members || []).map((entry) =>
                  entry.userId === member.userId
                    ? { ...entry, conversationRole: nextRole }
                    : entry,
                ),
              }
            : conversation,
        ),
      );
      await loadInbox();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ||
          (isRTL ? "فشل تحديث الصلاحية" : "Failed to update role"),
      );
    } finally {
      setIsGroupUpdating(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedConversation?.id || !selectedConversation?.isGroup) return;

    const confirmed = window.confirm(
      isRTL
        ? "هل تريد مغادرة هذه المجموعة؟"
        : "Are you sure you want to leave this group?",
    );
    if (!confirmed) return;

    setIsGroupUpdating(true);
    try {
      await leaveConversation(selectedConversation.id);
      toast.success(isRTL ? "تمت مغادرة المجموعة" : "You left the group");
      setIsGroupSettingsOpen(false);
      setGroupMemberSearch("");
      setGroupSelectedToAdd([]);
      setSearchParams({});
      setMessages([]);
      setMobileShowChat(false);
      setConversations((prev) =>
        prev.filter(
          (conversation) => conversation.id !== selectedConversation.id,
        ),
      );
      await loadInbox();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ||
          (isRTL ? "فشل مغادرة المجموعة" : "Failed to leave group"),
      );
    } finally {
      setIsGroupUpdating(false);
    }
  };

  const handleSelectImage = (event) => {
    const file = event?.target?.files?.[0];
    if (event?.target) {
      event.target.value = "";
    }

    if (!file || !selectedConversationId || isUploadingImage) return;

    queuePendingImage(file);
  };

  const handleSend = async () => {
    const content = messageDraft.trim();
    const hasText = Boolean(content);
    const hasImage = Boolean(pendingImageFile);

    if (
      (!hasText && !hasImage) ||
      !selectedConversationId ||
      isUploadingImage
    ) {
      return;
    }

    const imageFile = pendingImageFile;
    const optimisticAt = new Date().toISOString();
    const optimisticPreview = hasText
      ? content
      : isRTL
        ? "📷 صورة"
        : "📷 Photo";

    setConversations((prev) => {
      const index = prev.findIndex(
        (conversation) => conversation.id === selectedConversationId,
      );
      if (index < 0) return prev;

      const updatedConversation = {
        ...prev[index],
        lastMessage: optimisticPreview,
        lastMessageAt: optimisticAt,
        lastMessageSenderId:
          currentUserId ?? prev[index].lastMessageSenderId ?? null,
        unreadCount: 0,
      };

      return [
        updatedConversation,
        ...prev.slice(0, index),
        ...prev.slice(index + 1),
      ];
    });

    setMessageDraft("");
    clearPendingImage();
    clearTimeout(typingEmitTimeout.current);
    socketRef.current?.emit("typing", {
      conversationId: selectedConversationId,
      isTyping: false,
    });

    if (hasImage) {
      setIsUploadingImage(true);
    }

    try {
      if (hasImage && imageFile) {
        const uploadedPath = await uploadChatImage(imageFile);
        const imageContent =
          typeof uploadedPath === "string" ? uploadedPath.trim() : "";

        if (!imageContent) {
          throw new Error("Image upload did not return a URL");
        }

        await sendMessage(selectedConversationId, imageContent);
      }

      if (hasText) {
        await sendMessage(selectedConversationId, content);
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, isRTL ? "خطأ في الإرسال" : "Send error"),
      );
      void loadInbox();
    } finally {
      setIsUploadingImage(false);
      inputRef.current?.focus();
    }
  };

  const openConversation = (id) => {
    setSearchParams({ conversation: id });
    setMobileShowChat(true);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString(isRTL ? "ar-EG" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatConvTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString(isRTL ? "ar-EG" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    return d.toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
    });
  };

  const filteredConversations = sortConversationsByRecent(conversations).filter(
    (c) => {
      if (!sidebarSearch) return true;
      return getConvDisplayName(c, currentUserId)
        .toLowerCase()
        .includes(sidebarSearch.toLowerCase());
    },
  );

  const filteredFriends = friends.filter((f) => {
    if (!friendSearch) return true;
    return `${f.firstName} ${f.lastName} ${f.username || ""}`
      .toLowerCase()
      .includes(friendSearch.toLowerCase());
  });

  const selectedConversationMembers = selectedConversation?.members || [];
  const currentConversationMember = selectedConversationMembers.find(
    (member) => member.userId === currentUserId,
  );

  const isSelectedConversationOwner =
    selectedConversation?.ownerUserId === currentUserId;
  const isSelectedConversationAdmin =
    currentConversationMember?.conversationRole === "ADMIN";
  const canManageGroupMembers =
    isSelectedConversationOwner || isSelectedConversationAdmin;
  const canManageGroupAdmins = isSelectedConversationOwner;

  const selectedConversationMemberIds = new Set(
    (selectedConversation?.members || []).map((member) => member.userId),
  );

  const groupAddCandidates = friends.filter((friend) => {
    if (selectedConversationMemberIds.has(friend.userId)) return false;
    if (friend.userId === currentUserId) return false;
    if (!groupMemberSearch.trim()) return true;

    const haystack =
      `${friend.firstName || ""} ${friend.lastName || ""} ${friend.username || ""}`
        .toLowerCase()
        .trim();
    return haystack.includes(groupMemberSearch.toLowerCase().trim());
  });

  const groupMembers = selectedConversationMembers;

  const directPeer = getDirectPeer(selectedConversation, currentUserId);
  const canOpenDirectProfile = Boolean(
    directPeer && !selectedConversation?.isGroup && directPeer.username,
  );

  const typingCount = Object.keys(typingUsers).length;
  const convDisplayName = selectedConversation
    ? getConvDisplayName(selectedConversation, currentUserId)
    : "";
  const ChevronIcon = isRTL ? FiChevronLeft : FiChevronRight;

  const [isMobileWidth, setIsMobileWidth] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 640px)").matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e) => setIsMobileWidth(e.matches);
    // set initial
    setIsMobileWidth(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  const showMobileBackBtn = isMobileWidth && mobileShowChat;

  const renderAvatarContent = (avatarInfo, fallbackName, isGroup = false) => {
    if (isGroup) return <FiUsers size={17} />;
    if (avatarInfo?.type === "img")
      return (
        <img
          src={avatarInfo.src}
          alt={fallbackName}
          onError={handleAvatarImageError}
        />
      );
    return avatarInfo?.value || "?";
  };

  return (
    <div className="mh-root">
      <aside
        className={`mh-sidebar${mobileShowChat ? " mh-sidebar--slide-out" : ""}`}>
        <header className="mh-sidebar-header">
          <h1 className="mh-sidebar-title">{isRTL ? "الرسائل" : "Messages"}</h1>
          <button
            className="mh-new-btn"
            onClick={() => setIsModalOpen(true)}
            aria-label="New">
            <FiPlus size={18} />
          </button>
        </header>

        <div className="mh-sidebar-search">
          <FiSearch size={14} />
          <input
            placeholder={
              isRTL ? "بحث في المحادثات..." : "Search conversations..."
            }
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
        </div>

        <nav className="mh-conv-list">
          {filteredConversations.length === 0 && (
            <div className="mh-empty-list">
              <FiMessageSquare size={30} />
              <p>{isRTL ? "لا توجد محادثات بعد" : "No conversations yet"}</p>
              <button
                className="mh-empty-new-btn"
                onClick={() => setIsModalOpen(true)}>
                <FiPlus size={12} />
                {isRTL ? "ابدأ محادثة" : "Start a chat"}
              </button>
            </div>
          )}

          {filteredConversations.map((conv) => {
            const isActive = selectedConversationId === conv.id;
            const hasUnread = conv.unreadCount > 0;
            const displayName = getConvDisplayName(conv, currentUserId);
            const avatarInfo = getConvAvatarInfo(conv, currentUserId);

            return (
              <div
                key={conv.id}
                className={`mh-conv-item${isActive ? " active" : ""}${hasUnread ? " unread" : ""}`}
                onClick={() => openConversation(conv.id)}>
                <div
                  className={`mh-conv-avatar${conv?.isGroup ? " group" : ""}`}>
                  {renderAvatarContent(
                    avatarInfo,
                    displayName,
                    conv?.isGroup ?? false,
                  )}
                </div>
                <div className="mh-conv-body">
                  <div className="mh-conv-top">
                    <span className="mh-conv-name">{displayName}</span>
                    <span className="mh-conv-time">
                      {formatConvTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="mh-conv-bottom">
                    <span className="mh-conv-preview">
                      {getConversationPreviewText(conv.lastMessage, isRTL)}
                    </span>
                    {hasUnread && (
                      <span className="mh-unread-badge">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main
        className={`mh-chat${mobileShowChat ? " mh-chat--slide-in" : ""}${isDragActive ? " mh-chat--drag-active" : ""}`}
        onDragOver={handleChatDragOver}
        onDragEnter={handleChatDragOver}
        onDragLeave={handleChatDragLeave}
        onDrop={handleChatDrop}>
        {isDragActive && selectedConversationId ? (
          <div className="mh-chat-drop-overlay" aria-hidden>
            <FiImage size={24} />
            <p>{isRTL ? "اسحب الصورة هون" : "Drop image to attach"}</p>
          </div>
        ) : null}
        {selectedConversationId ? (
          <>
            <header className="mh-chat-header">
              {showMobileBackBtn && (
                <button
                  className="mh-back-btn"
                  onClick={() => setMobileShowChat(false)}
                  aria-label={isRTL ? "رجوع" : "Back"}>
                  {isRTL ? (
                    <FiChevronRight size={20} />
                  ) : (
                    <FiArrowLeft size={20} />
                  )}
                </button>
              )}
              <div
                className={`mh-chat-header-avatar${selectedConversation?.isGroup ? " group" : ""}`}>
                {renderAvatarContent(
                  getConvAvatarInfo(selectedConversation, currentUserId),
                  convDisplayName,
                  selectedConversation?.isGroup ?? false,
                )}
              </div>
              <div className="mh-chat-header-info">
                <h2>{convDisplayName}</h2>
                {typingCount > 0 ? (
                  <p className="mh-typing-text">
                    {typingCount > 1
                      ? isRTL
                        ? `${typingCount} أشخاص يكتبون`
                        : `${typingCount} people typing`
                      : isRTL
                        ? "يكتب..."
                        : "typing..."}
                    <span className="mh-typing-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                  </p>
                ) : (selectedConversation?.isGroup ?? false) ? (
                  <p className="mh-chat-header-sub">
                    {isRTL ? "مجموعة" : "Group"}
                  </p>
                ) : null}
              </div>
              <div className="mh-chat-header-actions">
                {selectedConversation?.isGroup ? (
                  <button
                    className="mh-header-action-btn"
                    onClick={openGroupSettings}
                    disabled={isGroupUpdating}
                    type="button">
                    <FiSettings size={15} />
                    <span>{isRTL ? "إعدادات المجموعة" : "Group settings"}</span>
                  </button>
                ) : canOpenDirectProfile ? (
                  <button
                    className="mh-header-action-btn"
                    onClick={handleOpenDirectProfile}
                    type="button">
                    <FiUser size={15} />
                    <span>{isRTL ? "الملف الشخصي" : "Profile"}</span>
                  </button>
                ) : null}
              </div>
            </header>

            <div className="mh-messages">
              {messages.length === 0 && (
                <div className="mh-messages-empty">
                  <FiMessageSquare size={34} />
                  <p>
                    {isRTL ? "ابدأ المحادثة الآن!" : "Start the conversation!"}
                  </p>
                </div>
              )}

              {messages.map((m, idx) => {
                const isOwn = m.senderId === currentUserId;
                const grouped =
                  idx > 0 && messages[idx - 1]?.senderId === m.senderId;
                const showName =
                  !isOwn &&
                  (selectedConversation?.isGroup ?? false) &&
                  !grouped;
                const senderAvatarSrc = getResolvedAvatarUrl(m.sender);
                const messageImageUrl = getMessageImageUrl(m.content);

                return (
                  <div
                    key={m.id}
                    className={`mh-msg-row${isOwn ? " own" : ""}${grouped ? " grouped" : ""}`}>
                    {!isOwn && (
                      <div
                        className={`mh-msg-avatar${grouped ? " hidden" : ""}`}>
                        {!grouped &&
                          (senderAvatarSrc ? (
                            <img
                              src={senderAvatarSrc}
                              alt=""
                              onError={handleAvatarImageError}
                            />
                          ) : (
                            (m.sender?.firstName?.[0] || "?").toUpperCase()
                          ))}
                      </div>
                    )}
                    <div className="mh-msg-content-group">
                      {showName && (
                        <span className="mh-msg-sender-name">
                          {m.sender?.firstName} {m.sender?.lastName}
                        </span>
                      )}
                      <div
                        className={`mh-msg-bubble${isOwn ? " own" : ""}${messageImageUrl ? " mh-msg-bubble--image" : ""}`}>
                        {m.replyToMessage && (
                          <div className="mh-reply-preview">
                            <span className="mh-reply-bar" />
                            <span className="mh-reply-text">
                              {m.replyToMessage.content}
                            </span>
                          </div>
                        )}
                        {messageImageUrl ? (
                          <button
                            className="mh-msg-image-button"
                            type="button"
                            onClick={() =>
                              setActiveImageViewerUrl(messageImageUrl)
                            }
                            aria-label={isRTL ? "عرض الصورة" : "View image"}>
                            <img
                              src={messageImageUrl}
                              alt={isRTL ? "صورة مرسلة" : "Sent image"}
                              className="mh-msg-image"
                              loading="lazy"
                            />
                          </button>
                        ) : (
                          <span className="mh-msg-text">
                            {renderMessageContent(m.content, navigate)}
                          </span>
                        )}
                        <div className="mh-msg-meta">
                          <span className="mh-msg-time">
                            {formatTime(m.createdAt)}
                          </span>
                          {m.editedAt && (
                            <span className="mh-edited-tag">
                              {isRTL ? "معدّل" : "edited"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {pendingImagePreviewUrl ? (
              <div className="mh-attachment-preview">
                <img
                  src={pendingImagePreviewUrl}
                  alt={isRTL ? "معاينة الصورة" : "Image preview"}
                  className="mh-attachment-preview-img"
                />
                <div className="mh-attachment-preview-meta">
                  <span>{isRTL ? "صورة مرفقة" : "Image attached"}</span>
                  {pendingImageFile?.name ? (
                    <small>{pendingImageFile.name}</small>
                  ) : null}
                </div>
                <button
                  className="mh-attachment-remove"
                  type="button"
                  onClick={clearPendingImage}
                  aria-label={isRTL ? "إزالة الصورة" : "Remove image"}>
                  <FiX size={14} />
                </button>
              </div>
            ) : null}

            <div className="mh-input-area">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
                className="mh-image-input"
                onChange={handleSelectImage}
              />
              <button
                className={`mh-attach-btn${isUploadingImage ? " uploading" : ""}`}
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingImage}
                type="button"
                aria-label={isRTL ? "إرسال صورة" : "Send image"}
                title={isRTL ? "إرسال صورة" : "Send image"}>
                {isUploadingImage ? (
                  <FiLoader className="mh-spinning-icon" size={16} />
                ) : (
                  <FiImage size={16} />
                )}
              </button>
              <input
                ref={inputRef}
                className="mh-input"
                value={messageDraft}
                onChange={handleInputChange}
                placeholder={isRTL ? "اكتب رسالة..." : "Write a message..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                className={`mh-send-btn${(messageDraft.trim() || pendingImageFile) && !isUploadingImage ? " active" : ""}`}
                onClick={handleSend}
                disabled={
                  (!messageDraft.trim() && !pendingImageFile) ||
                  isUploadingImage
                }>
                <FiSend size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="mh-no-chat">
            <div className="mh-no-chat-icon">
              <FiMessageSquare size={46} />
            </div>
            <h3>{isRTL ? "مرحباً بك في الرسائل" : "Welcome to Messages"}</h3>
            <p>
              {isRTL
                ? "اختر محادثة موجودة أو ابدأ محادثة جديدة"
                : "Select a conversation or start a new one"}
            </p>
            <button
              className="mh-no-chat-btn"
              onClick={() => setIsModalOpen(true)}>
              <FiPlus size={14} />
              {isRTL ? "محادثة جديدة" : "New conversation"}
            </button>
          </div>
        )}
      </main>

      {activeImageViewerUrl ? (
        <div
          className="mh-image-viewer-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={isRTL ? "عرض الصورة" : "Image viewer"}
          onClick={() => setActiveImageViewerUrl("")}>
          <button
            className="mh-image-viewer-close"
            type="button"
            onClick={() => setActiveImageViewerUrl("")}
            aria-label={isRTL ? "إغلاق" : "Close"}>
            <FiX size={18} />
          </button>
          <div
            className="mh-image-viewer-frame"
            onClick={(event) => event.stopPropagation()}>
            <img
              src={activeImageViewerUrl}
              alt={isRTL ? "صورة محادثة" : "Chat image"}
              className="mh-image-viewer-image"
            />
          </div>
        </div>
      ) : null}

      {isGroupSettingsOpen && selectedConversation?.isGroup && (
        <div
          className="mh-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isGroupUpdating) {
              setIsGroupSettingsOpen(false);
              setGroupMemberSearch("");
              setGroupSelectedToAdd([]);
            }
          }}>
          <div className="mh-modal mh-group-modal">
            <div className="mh-modal-header">
              <h2>{isRTL ? "إعدادات المجموعة" : "Group settings"}</h2>
              <button
                className="mh-modal-close"
                onClick={() => {
                  setIsGroupSettingsOpen(false);
                  setGroupMemberSearch("");
                  setGroupSelectedToAdd([]);
                }}
                disabled={isGroupUpdating}
                type="button">
                <FiX size={17} />
              </button>
            </div>

            <div className="mh-group-section">
              <p className="mh-group-section-title">
                <FiUserPlus size={14} />
                <span>{isRTL ? "إضافة أعضاء" : "Add members"}</span>
              </p>

              <div className="mh-modal-search mh-group-search">
                <FiSearch size={14} />
                <input
                  placeholder={
                    isRTL
                      ? "ابحث عن الأصدقاء للإضافة..."
                      : "Search friends to add..."
                  }
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                  disabled={isGroupUpdating}
                />
              </div>

              <div className="mh-friends-list mh-group-candidates">
                {groupAddCandidates.map((friend) => {
                  const isSelected = groupSelectedToAdd.includes(friend.userId);
                  const friendAvatarSrc = getResolvedAvatarUrl(friend);
                  return (
                    <div
                      key={friend.userId}
                      className={`mh-friend-item${isSelected ? " selected" : ""}`}
                      onClick={() => toggleGroupAddSelection(friend.userId)}>
                      <div className="mh-friend-avatar">
                        {friendAvatarSrc ? (
                          <img
                            src={friendAvatarSrc}
                            alt={
                              friend.firstName || friend.username || "Friend"
                            }
                            onError={handleAvatarImageError}
                          />
                        ) : (
                          (
                            friend.firstName?.[0] ||
                            friend.username?.[0] ||
                            "?"
                          ).toUpperCase()
                        )}
                      </div>
                      <div className="mh-friend-info">
                        <span className="mh-friend-name">
                          {friend.firstName} {friend.lastName}
                        </span>
                        {friend.username && (
                          <span className="mh-friend-sub">
                            @{friend.username}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <span className="mh-friend-check">
                          <FiCheck size={13} />
                        </span>
                      )}
                    </div>
                  );
                })}

                {groupAddCandidates.length === 0 && (
                  <div className="mh-friends-empty">
                    {isRTL
                      ? "لا يوجد أصدقاء متاحون للإضافة"
                      : "No available friends to add"}
                  </div>
                )}
              </div>

              {groupSelectedToAdd.length > 0 && (
                <div className="mh-selected-chips">
                  {groupSelectedToAdd.map((selectedId) => {
                    const friend = friends.find(
                      (item) => item.userId === selectedId,
                    );
                    if (!friend) return null;
                    return (
                      <span key={selectedId} className="mh-chip">
                        {friend.firstName}
                        <button
                          onClick={() => toggleGroupAddSelection(selectedId)}
                          type="button">
                          <FiX size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <button
                className="mh-confirm-btn mh-group-action-btn"
                onClick={handleAddMembersToGroup}
                disabled={groupSelectedToAdd.length === 0 || isGroupUpdating}
                type="button">
                {isGroupUpdating ? (
                  <span className="mh-spinner" />
                ) : (
                  <>
                    <FiUserPlus size={15} />
                    <span>{isRTL ? "إضافة إلى المجموعة" : "Add to group"}</span>
                  </>
                )}
              </button>
            </div>

            <div className="mh-group-divider" />

            <div className="mh-group-section">
              <p className="mh-group-section-title mh-group-section-title-danger">
                <FiUserMinus size={14} />
                <span>{isRTL ? "طرد عضو" : "Remove member"}</span>
              </p>

              <div className="mh-group-members-list">
                {groupMembers.map((member) => {
                  const memberAvatarSrc = getResolvedAvatarUrl(member);
                  const memberDisplayName =
                    `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
                    member.username ||
                    (isRTL ? "عضو" : "Member");
                  const isOwnerMember =
                    member.userId === selectedConversation?.ownerUserId;
                  const isAdminMember = member.conversationRole === "ADMIN";
                  const canToggleAdminTarget =
                    canManageGroupAdmins &&
                    !isOwnerMember &&
                    member.userId !== currentUserId;
                  const canRemoveTarget =
                    canManageGroupMembers &&
                    !isOwnerMember &&
                    member.userId !== currentUserId &&
                    (isSelectedConversationOwner || !isAdminMember);

                  return (
                    <div key={member.userId} className="mh-group-member-row">
                      <div className="mh-group-member-main">
                        <div className="mh-friend-avatar">
                          {memberAvatarSrc ? (
                            <img
                              src={memberAvatarSrc}
                              alt={memberDisplayName}
                              onError={handleAvatarImageError}
                            />
                          ) : (
                            (memberDisplayName[0] || "?").toUpperCase()
                          )}
                        </div>
                        <div className="mh-friend-info">
                          <div className="mh-group-member-name-line">
                            <span className="mh-friend-name">
                              {memberDisplayName}
                            </span>
                            {isOwnerMember ? (
                              <span className="mh-member-badge mh-member-badge--owner">
                                {isRTL ? "أونر" : "Owner"}
                              </span>
                            ) : isAdminMember ? (
                              <span className="mh-member-badge mh-member-badge--admin">
                                {isRTL ? "أدمن" : "Admin"}
                              </span>
                            ) : null}
                          </div>
                          {member.username && (
                            <span className="mh-friend-sub">
                              @{member.username}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mh-group-member-actions">
                        {canToggleAdminTarget && (
                          <button
                            className="mh-group-admin-btn"
                            onClick={() => handleToggleMemberAdmin(member)}
                            disabled={isGroupUpdating}
                            type="button">
                            {isAdminMember
                              ? isRTL
                                ? "إزالة أدمن"
                                : "Remove admin"
                              : isRTL
                                ? "تعيين أدمن"
                                : "Make admin"}
                          </button>
                        )}
                        {canRemoveTarget && (
                          <button
                            className="mh-group-remove-btn"
                            onClick={() => handleRemoveMemberFromGroup(member)}
                            disabled={isGroupUpdating}
                            type="button">
                            {isRTL ? "طرد" : "Remove"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {groupMembers.length === 0 && (
                  <div className="mh-friends-empty">
                    {isRTL ? "لا يوجد أعضاء في المجموعة" : "No group members"}
                  </div>
                )}
              </div>

              <p className="mh-group-note">
                {isRTL
                  ? "ملاحظة: يجب أن يبقى على الأقل عضوان داخل المجموعة."
                  : "Note: at least two participants must stay in the group."}
              </p>

              <button
                className="mh-group-leave-btn"
                onClick={handleLeaveGroup}
                disabled={isGroupUpdating}
                type="button">
                <FiLogOut size={14} />
                <span>{isRTL ? "مغادرة المجموعة" : "Leave group"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="mh-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
              resetModal();
            }
          }}>
          <div className="mh-modal">
            <div className="mh-modal-header">
              <h2>
                {isGroupMode
                  ? isRTL
                    ? "إنشاء مجموعة"
                    : "Create Group"
                  : isRTL
                    ? "محادثة جديدة"
                    : "New Conversation"}
              </h2>
              <button
                className="mh-modal-close"
                onClick={() => {
                  setIsModalOpen(false);
                  resetModal();
                }}>
                <FiX size={17} />
              </button>
            </div>

            <div className="mh-type-toggle">
              <button
                className={`mh-type-btn${!isGroupMode ? " active" : ""}`}
                onClick={() => {
                  setIsGroupMode(false);
                  setSelectedFriends([]);
                }}>
                <FiMessageSquare size={14} />
                {isRTL ? "فردية" : "Direct"}
              </button>
              <button
                className={`mh-type-btn${isGroupMode ? " active" : ""}`}
                onClick={() => {
                  setIsGroupMode(true);
                  setSelectedFriends([]);
                }}>
                <FiUsers size={14} />
                {isRTL ? "مجموعة" : "Group"}
              </button>
            </div>

            {isGroupMode && (
              <div className="mh-modal-field">
                <label className="mh-modal-label">
                  {isRTL ? "اسم المجموعة" : "Group name"}
                </label>
                <input
                  className="mh-modal-input"
                  placeholder={
                    isRTL ? "مثال: فريق العمل..." : "e.g. Work team..."
                  }
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  maxLength={200}
                />
              </div>
            )}

            <div className="mh-modal-search">
              <FiSearch size={14} />
              <input
                placeholder={isRTL ? "ابحث عن أصدقاء..." : "Search friends..."}
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
              />
            </div>

            <div className="mh-friends-list">
              {!isGroupMode && (
                <div
                  className={`mh-friend-item self${selectedFriends[0] === currentUserId ? " selected" : ""}`}
                  onClick={() => setSelectedFriends([currentUserId])}>
                  <div className="mh-friend-avatar self">
                    <FiBookmark size={14} />
                  </div>
                  <div className="mh-friend-info">
                    <span className="mh-friend-name">
                      {isRTL ? "رسائل محفوظة" : "Saved Messages"}
                    </span>
                    <span className="mh-friend-sub">
                      {isRTL
                        ? "احفظ ملاحظاتك ووصلاتك"
                        : "Save your notes and links"}
                    </span>
                  </div>
                  {selectedFriends[0] === currentUserId && (
                    <span className="mh-friend-check">
                      <FiCheck size={13} />
                    </span>
                  )}
                </div>
              )}

              {filteredFriends.map((f) => {
                const isSelected = selectedFriends.includes(f.userId);
                const friendAvatarSrc = getResolvedAvatarUrl(f);
                return (
                  <div
                    key={f.userId}
                    className={`mh-friend-item${isSelected ? " selected" : ""}`}
                    onClick={() => toggleFriendSelection(f.userId)}>
                    <div className="mh-friend-avatar">
                      {friendAvatarSrc ? (
                        <img
                          src={friendAvatarSrc}
                          alt={f.firstName}
                          onError={handleAvatarImageError}
                        />
                      ) : (
                        f.firstName[0].toUpperCase()
                      )}
                    </div>
                    <div className="mh-friend-info">
                      <span className="mh-friend-name">
                        {f.firstName} {f.lastName}
                      </span>
                      {f.username && (
                        <span className="mh-friend-sub">@{f.username}</span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="mh-friend-check">
                        <FiCheck size={13} />
                      </span>
                    )}
                  </div>
                );
              })}

              {filteredFriends.length === 0 && (
                <div className="mh-friends-empty">
                  {isRTL ? "لا يوجد أصدقاء مطابقون" : "No matching friends"}
                </div>
              )}
            </div>

            {isGroupMode && selectedFriends.length > 0 && (
              <div className="mh-selected-chips">
                {selectedFriends.map((fid) => {
                  const fr = friends.find((f) => f.userId === fid);
                  if (!fr) return null;
                  return (
                    <span key={fid} className="mh-chip">
                      {fr.firstName}
                      <button onClick={() => toggleFriendSelection(fid)}>
                        <FiX size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="mh-modal-field">
              <label className="mh-modal-label">
                {isRTL ? "الرسالة الأولى" : "First message"}
              </label>
              <input
                className="mh-modal-input"
                placeholder={
                  isRTL
                    ? "اكتب رسالتك الأولى..."
                    : "Write your first message..."
                }
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isCreating && handleCreateChat()
                }
              />
            </div>

            <button
              className="mh-confirm-btn"
              disabled={
                selectedFriends.length === 0 ||
                !firstMessage.trim() ||
                isCreating
              }
              onClick={handleCreateChat}>
              {isCreating ? (
                <span className="mh-spinner" />
              ) : (
                <>
                  {isGroupMode
                    ? isRTL
                      ? "إنشاء المجموعة"
                      : "Create Group"
                    : isRTL
                      ? "بدء المحادثة"
                      : "Start Chat"}
                  <ChevronIcon size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessengerHub;
