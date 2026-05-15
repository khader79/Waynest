import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import {
  FiPlus,
  FiSearch,
  FiSend,
  FiCopy,
  FiPaperclip,
  FiFile,
  FiDownload,
  FiLoader,
  FiUsers,
  FiX,
  FiCheck,
  FiMessageSquare,
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiChevronDown,
  FiArrowLeft,
  FiSettings,
  FiUser,
  FiUserPlus,
  FiUserMinus,
  FiLogOut,
  FiCpu,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { API_BASE_URL } from "@/api/client";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { copyTextToClipboard } from "@/utils/clipboard";
import {
  createConversation,
  fetchFriends,
  fetchInbox,
  fetchConversationMessages,
  sendMessage,
  uploadChatAttachment,
  markConversationRead,
  normalizeMessageItem,
  addConversationMembers,
  removeConversationMember,
  setConversationMemberRole,
  leaveConversation,
  openAiConversation,
} from "@/api/social";
import { useTranslation } from "react-i18next";
import "./MessengerHub.css";

const getConvDisplayName = (conv, currentUserId, t) => {
  if (!conv) return t("messenger.chatFallback", { defaultValue: "Chat" });
  if (conv.isGroup) return conv.title || t("messenger.group", { defaultValue: "Group" });
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
      return name || t("messenger.savedMessages", { defaultValue: "Saved Messages" });
    }
  }
  return conv.title || t("messenger.privateChatFallback", { defaultValue: "Private Chat" });
};

const getConvAvatarInfo = (conv, currentUserId, t) => {
  if (!conv) return { type: "initial", value: "?" };
  if (conv.isGroup) return { type: "icon" };
  if (conv.members?.length) {
    const other = conv.members.find((m) => m.userId !== currentUserId);
    const target = other ?? conv.members[0];
    const avatarSrc = getResolvedAvatarUrl(target);
    if (avatarSrc) return { type: "img", src: avatarSrc };
    const name = getConvDisplayName(conv, currentUserId, t);
    return { type: "initial", value: (name[0] || "?").toUpperCase() };
  }
  const name = getConvDisplayName(conv, currentUserId, t);
  return { type: "initial", value: (name[0] || "?").toUpperCase() };
};

const getDirectPeer = (conv, currentUserId) => {
  if (!conv || conv.isGroup || !Array.isArray(conv.members)) return null;
  return conv.members.find((m) => m.userId !== currentUserId) ?? null;
};

const isAiAssistantConversation = (conv, currentUserId) => {
  const peer = getDirectPeer(conv, currentUserId);
  if (!peer) return false;

  const username = String(peer.username ?? "")
    .trim()
    .toLowerCase();
  const displayName = `${peer.firstName || ""} ${peer.lastName || ""}`
    .trim()
    .toLowerCase();

  return (
    username === "waynest.ai" ||
    username === "waynest_ai" ||
    username === "waynest-assistant" ||
    displayName === "waynest ai"
  );
};

const AI_PROMPT_SUGGESTIONS = [
  { key: "messenger.aiPrompts.planTrip3", fallback: "Plan a 3-day trip for me" },
  { key: "messenger.aiPrompts.findPlaces", fallback: "Find places I might love" },
  { key: "messenger.aiPrompts.romanticSpots", fallback: "Suggest romantic spots for my destination" },
  { key: "messenger.aiPrompts.wishlistSuggestion", fallback: "What should I add to my wishlist next?" },
];

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

const toMessageTimestamp = (value) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const sortMessagesByCreatedAt = (rows) =>
  [...rows].sort((left, right) => {
    const byCreatedAt =
      toMessageTimestamp(left?.createdAt) -
      toMessageTimestamp(right?.createdAt);

    if (byCreatedAt !== 0) return byCreatedAt;

    return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
  });

const createLocalMessageId = () =>
  `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const MESSAGE_URL_REGEX =
  /((?:https?:\/\/|www\.)[^\s]+|(?:\/(?:social|inbox|u|p|provider|place|places|events|trip|trips)\S*)|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:[/?#][^\s]*)?)/gi;
const MESSAGE_IMAGE_REGEX = /\.(avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/i;
const MESSAGE_VIDEO_REGEX = /\.(mp4|m4v|mov|webm|ogv|ogg|avi|mkv)(?:$|[?#])/i;
const UPLOAD_PATH_PREFIX_REGEX = /^\/uploads\//i;
const IMAGE_FILE_NAME_REGEX = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const VIDEO_FILE_NAME_REGEX = /\.(mp4|m4v|mov|webm|ogv|ogg|avi|mkv)$/i;
const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024;
const CHAT_PENDING_ATTACHMENTS_LIMIT = 10;

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

const decodeUploadFileName = (fileName) => {
  if (typeof fileName !== "string" || !fileName) {
    return "file";
  }

  try {
    const decoded = decodeURIComponent(fileName);
    return decoded || fileName;
  } catch {
    return fileName;
  }
};

const isImageLikeFile = (file) => {
  if (!file) return false;

  const mime = typeof file.type === "string" ? file.type.toLowerCase() : "";
  if (mime.startsWith("image/")) {
    return true;
  }

  const name = typeof file.name === "string" ? file.name.toLowerCase() : "";
  return IMAGE_FILE_NAME_REGEX.test(name);
};

const isVideoLikeFile = (file) => {
  if (!file) return false;

  const mime = typeof file.type === "string" ? file.type.toLowerCase() : "";
  if (mime.startsWith("video/")) {
    return true;
  }

  const name = typeof file.name === "string" ? file.name.toLowerCase() : "";
  return VIDEO_FILE_NAME_REGEX.test(name);
};

const formatFileSize = (sizeInBytes) => {
  const bytes = Number(sizeInBytes);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(gb >= 100 ? 0 : 1)} GB`;
};

const createPendingAttachmentId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const revokePendingAttachmentPreview = (attachment) => {
  if (attachment?.previewUrl) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
};

const getMessageUploadMeta = (content) => {
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

  const baseOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost";

  try {
    const parsed = new URL(resolved, baseOrigin);
    const pathname = parsed.pathname || "";
    if (!UPLOAD_PATH_PREFIX_REGEX.test(pathname)) {
      return null;
    }

    const fileNameRaw = pathname.split("/").pop() || "";
    const fileName = decodeUploadFileName(fileNameRaw || "file");
    const normalizedPath = pathname.toLowerCase();
    const isImage = MESSAGE_IMAGE_REGEX.test(normalizedPath);
    const isVideo = !isImage && MESSAGE_VIDEO_REGEX.test(normalizedPath);

    return {
      url: parsed.href,
      pathname,
      fileName,
      isImage,
      isVideo,
    };
  } catch {
    return null;
  }
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
  const uploadMeta = getMessageUploadMeta(content);
  if (!uploadMeta?.isImage) {
    return null;
  }
  return uploadMeta.url;
};

const getMessageVideoMeta = (content) => {
  const uploadMeta = getMessageUploadMeta(content);
  if (!uploadMeta?.isVideo) {
    return null;
  }
  return uploadMeta;
};

const getMessageFileMeta = (content) => {
  const uploadMeta = getMessageUploadMeta(content);
  if (!uploadMeta || uploadMeta.isImage || uploadMeta.isVideo) {
    return null;
  }
  return uploadMeta;
};

const getConversationPreviewText = (content, isRTL, t) => {
  const text = typeof content === "string" ? content.trim() : "";
  if (!text) {
    return t("messenger.startChatting");
  }

  const uploadMeta = getMessageUploadMeta(text);
  if (uploadMeta?.isImage) {
    return t("messenger.photo");
  }
  if (uploadMeta?.isVideo) {
    return t("messenger.video");
  }
  if (uploadMeta) {
    return t("messenger.file");
  }

  return text;
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
  const { t } = useTranslation();

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
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isOpeningAi, setIsOpeningAi] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [draggingPendingAttachmentId, setDraggingPendingAttachmentId] =
    useState("");
  const [dropPendingAttachmentId, setDropPendingAttachmentId] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [activeImageViewerUrl, setActiveImageViewerUrl] = useState("");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const imageInputRef = useRef(null);
  const pendingAttachmentsRef = useRef([]);
  const pendingAttachmentDragRef = useRef("");
  const typingTimeouts = useRef({});
  const typingEmitTimeout = useRef(null);
  const joinedConversationRef = useRef(null);
  const selectedConversationIdRef = useRef(null);
  const conversationsRef = useRef([]);
  const readSyncTimersRef = useRef(new Map());

  const selectedConversationId = searchParams.get("conversation");
  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  );
  const isAiConversation = isAiAssistantConversation(
    selectedConversation,
    currentUserId,
  );

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    setIsGroupSettingsOpen(false);
    setGroupMemberSearch("");
    setGroupSelectedToAdd([]);
    setDraggingPendingAttachmentId("");
    setDropPendingAttachmentId("");
    pendingAttachmentDragRef.current = "";
    setIsDragActive(false);
    setActiveImageViewerUrl("");

    setPendingAttachments((current) => {
      current.forEach(revokePendingAttachmentPreview);
      return [];
    });

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
      pendingAttachmentsRef.current.forEach(revokePendingAttachmentPreview);
    },
    [],
  );

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((current) => {
      current.forEach(revokePendingAttachmentPreview);
      return [];
    });
    pendingAttachmentDragRef.current = "";
    setDraggingPendingAttachmentId("");
    setDropPendingAttachmentId("");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, []);

  const removePendingAttachment = useCallback((attachmentId) => {
    setPendingAttachments((current) => {
      const next = [];
      for (const attachment of current) {
        if (attachment.id === attachmentId) {
          revokePendingAttachmentPreview(attachment);
          continue;
        }
        next.push(attachment);
      }
      return next;
    });
    if (pendingAttachmentDragRef.current === attachmentId) {
      pendingAttachmentDragRef.current = "";
      setDraggingPendingAttachmentId("");
      setDropPendingAttachmentId("");
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, []);

  const reorderPendingAttachments = useCallback((sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }

    setPendingAttachments((current) => {
      const sourceIndex = current.findIndex(
        (attachment) => attachment.id === sourceId,
      );
      const targetIndex = current.findIndex(
        (attachment) => attachment.id === targetId,
      );

      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }, []);

  const movePendingAttachmentByOffset = useCallback((attachmentId, offset) => {
    if (!attachmentId || !Number.isFinite(offset) || offset === 0) {
      return;
    }

    setPendingAttachments((current) => {
      const sourceIndex = current.findIndex(
        (attachment) => attachment.id === attachmentId,
      );
      if (sourceIndex < 0) {
        return current;
      }

      const targetIndex = sourceIndex + offset;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }, []);

  const handlePendingAttachmentDragStart = useCallback(
    (attachmentId, event) => {
      if (!attachmentId) {
        return;
      }

      pendingAttachmentDragRef.current = attachmentId;
      setDraggingPendingAttachmentId(attachmentId);
      setDropPendingAttachmentId("");

      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        try {
          event.dataTransfer.setData("text/plain", attachmentId);
        } catch {}
      }
    },
    [],
  );

  const handlePendingAttachmentDragOver = useCallback((attachmentId, event) => {
    const sourceId = pendingAttachmentDragRef.current;
    if (!sourceId || sourceId === attachmentId) {
      return;
    }

    event.preventDefault();
    if (event?.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    setDropPendingAttachmentId((current) =>
      current === attachmentId ? current : attachmentId,
    );
  }, []);

  const handlePendingAttachmentDrop = useCallback(
    (attachmentId, event) => {
      event.preventDefault();

      const sourceId = pendingAttachmentDragRef.current;
      if (sourceId && sourceId !== attachmentId) {
        reorderPendingAttachments(sourceId, attachmentId);
      }

      pendingAttachmentDragRef.current = "";
      setDraggingPendingAttachmentId("");
      setDropPendingAttachmentId("");
    },
    [reorderPendingAttachments],
  );

  const handlePendingAttachmentDragEnd = useCallback(() => {
    pendingAttachmentDragRef.current = "";
    setDraggingPendingAttachmentId("");
    setDropPendingAttachmentId("");
  }, []);

  const queuePendingAttachments = useCallback(
    (files) => {
      const incomingFiles = Array.isArray(files)
        ? files
        : Array.from(files ?? []);

      if (!incomingFiles.length) {
        return 0;
      }

      let rejectedBySize = 0;
      const prepared = [];

      for (const file of incomingFiles) {
        if (!file) continue;

        if (file.size > CHAT_ATTACHMENT_MAX_SIZE_BYTES) {
          rejectedBySize += 1;
          continue;
        }

        const imageLike = isImageLikeFile(file);
        const videoLike = !imageLike && isVideoLikeFile(file);
        prepared.push({
          id: createPendingAttachmentId(),
          file,
          name:
            typeof file.name === "string" && file.name.trim()
              ? file.name
              : t("messenger.fileFallbackName"),
          size: Number.isFinite(file.size) ? file.size : 0,
          isImage: imageLike,
          isVideo: videoLike,
          previewUrl: imageLike ? URL.createObjectURL(file) : "",
        });
      }

      if (rejectedBySize > 0) {
        toast.error(t("messenger.filesExceedSizeLimit"));
      }

      if (!prepared.length) {
        return 0;
      }

      let acceptedAttachments = [];
      let rejectedAttachments = [];

      setPendingAttachments((current) => {
        const remainingSlots = Math.max(
          0,
          CHAT_PENDING_ATTACHMENTS_LIMIT - current.length,
        );

        if (remainingSlots <= 0) {
          rejectedAttachments = prepared;
          return current;
        }

        acceptedAttachments = prepared.slice(0, remainingSlots);
        rejectedAttachments = prepared.slice(remainingSlots);
        return [...current, ...acceptedAttachments];
      });

      if (rejectedAttachments.length > 0) {
        rejectedAttachments.forEach(revokePendingAttachmentPreview);
        toast.info(t("messenger.maxFilesPerMessage", { limit: CHAT_PENDING_ATTACHMENTS_LIMIT }),
        );
      }

      return acceptedAttachments.length;
    },
    [],
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
      const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
      if (!droppedFiles.length || isUploadingAttachment) {
        return;
      }

      queuePendingAttachments(droppedFiles);
    },
    [isUploadingAttachment, queuePendingAttachments, selectedConversationId],
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

  const applyConversationReadState = useCallback((conversationId) => {
    if (!conversationId) {
      return;
    }

    setConversations((prev) =>
      sortConversationsByRecent(
        prev.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      ),
    );

    window.dispatchEvent(
      new CustomEvent("chat:read", {
        detail: { conversationId },
      }),
    );
  }, []);

  const scheduleConversationReadSync = useCallback(
    (conversationId, { immediate = false } = {}) => {
      if (!conversationId) {
        return;
      }

      applyConversationReadState(conversationId);

      const existingTimer = readSyncTimersRef.current.get(conversationId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const run = () => {
        readSyncTimersRef.current.delete(conversationId);
        markConversationRead(conversationId)
          .then(() => {
            applyConversationReadState(conversationId);
            void refreshUnreadCount({ announceNew: false });
          })
          .catch(() => {});
      };

      if (immediate) {
        run();
        return;
      }

      const timer = setTimeout(run, 140);
      readSyncTimersRef.current.set(conversationId, timer);
    },
    [applyConversationReadState, refreshUnreadCount],
  );

  const handleOpenAiConcierge = useCallback(async () => {
    if (isOpeningAi) return;

    setIsOpeningAi(true);
    try {
      const response = await openAiConversation();
      const conversationId = response?.conversation?.id;
      if (!conversationId) {
        throw new Error("Missing AI conversation id");
      }
      setSearchParams({ conversation: conversationId });
      setMobileShowChat(true);
      await loadInbox();
    } catch {
      toast.error(t("messenger.couldNotOpenAI"));
    } finally {
      setIsOpeningAi(false);
    }
  }, [isOpeningAi, loadInbox, setSearchParams]);

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

        const incomingSenderId =
          normMsg?.senderId ??
          (payload?.message && typeof payload.message === "object"
            ? payload.message.senderId
            : null);

        if (conversationId === selectedConversationIdRef.current) {
          setMessages((prev) => {
            if (!normMsg?.id) return prev;
            if (prev.some((m) => m.id === normMsg.id)) return prev;
            return sortMessagesByCreatedAt([...prev, normMsg]);
          });
        }

        setConversations((prev) => {
          if (!conversationId) return prev;

          const conversationIndex = prev.findIndex(
            (conversation) => conversation.id === conversationId,
          );
          if (conversationIndex < 0) return prev;

          const conversation = prev[conversationIndex];

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

        const shouldAutoMarkRead =
          conversationId === selectedConversationIdRef.current &&
          incomingSenderId &&
          String(incomingSenderId) !== String(currentUserId) &&
          document.visibilityState === "visible" &&
          (typeof document.hasFocus !== "function" || document.hasFocus());

        if (shouldAutoMarkRead) {
          scheduleConversationReadSync(conversationId);
        }

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
  }, [currentUserId, loadInbox, joinCurrentRoom, scheduleConversationReadSync]);

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

    scheduleConversationReadSync(selectedConversationId, { immediate: true });

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
  }, [scheduleConversationReadSync, selectedConversationId, scrollToBottom]);

  useEffect(
    () => () => {
      readSyncTimersRef.current.forEach((timer) => clearTimeout(timer));
      readSyncTimersRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const syncWhenFocused = () => {
      if (
        document.visibilityState === "visible" &&
        (typeof document.hasFocus !== "function" || document.hasFocus())
      ) {
        scheduleConversationReadSync(selectedConversationId, {
          immediate: true,
        });
      }
    };

    window.addEventListener("focus", syncWhenFocused);
    document.addEventListener("visibilitychange", syncWhenFocused);

    return () => {
      window.removeEventListener("focus", syncWhenFocused);
      document.removeEventListener("visibilitychange", syncWhenFocused);
    };
  }, [scheduleConversationReadSync, selectedConversationId]);

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
      toast.error(t("messenger.writeFirstMessage"));
      return;
    }
    if (selectedFriends.length === 0) {
      toast.error(t("messenger.selectAtLeastOnePerson"),
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
      toast.error(t("messenger.failedToCreate"),
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
      toast.error(t("messenger.noUsername"),
      );
      return;
    }
    navigate(`/u/${encodeURIComponent(peer.username)}`);
  };

  const handleAddMembersToGroup = async () => {
    if (!selectedConversation?.id || !selectedConversation?.isGroup) return;
    if (groupSelectedToAdd.length === 0) {
      toast.error(t("messenger.selectAtLeastOneFriend"),
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

      toast.success(t("messenger.membersAdded", { count: addedCount }),
      );
      setGroupSelectedToAdd([]);
      setGroupMemberSearch("");
      await loadInbox();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ||
          t("messenger.failedToAddMembers"),
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
      toast.error(t("messenger.onlyOwnerAdminCanRemove"),
      );
      return;
    }

    if (member.userId === selectedConversation.ownerUserId) {
      toast.error(t("messenger.ownerCannotBeRemoved"),
      );
      return;
    }

    if (!actorIsOwner && member.conversationRole === "ADMIN") {
      toast.error(t("messenger.adminCannotRemove"));
      return;
    }

    const confirmed = window.confirm(
      t("messenger.confirmRemoveMember", { member: member.firstName || member.username || t("messenger.thisMember") }),
    );
    if (!confirmed) return;

    setIsGroupUpdating(true);
    try {
      await removeConversationMember(selectedConversation.id, member.userId);
      toast.success(t("messenger.memberRemoved"),
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
          t("messenger.failedToRemoveMember"),
      );
    } finally {
      setIsGroupUpdating(false);
    }
  };

  const handleToggleMemberAdmin = async (member) => {
    if (!selectedConversation?.id || !member?.userId) return;
    if (selectedConversation.ownerUserId !== currentUserId) {
      toast.error(t("messenger.onlyOwnerCanManageAdmins"),
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
        nextRole === "ADMIN"
          ? t("messenger.memberPromotedToAdmin")
          : t("messenger.adminRoleRemoved"),
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
          t("messenger.failedToUpdateRole"),
      );
    } finally {
      setIsGroupUpdating(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedConversation?.id || !selectedConversation?.isGroup) return;

    const confirmed = window.confirm(t("messenger.confirmLeaveGroup"),
    );
    if (!confirmed) return;

    setIsGroupUpdating(true);
    try {
      await leaveConversation(selectedConversation.id);
      toast.success(t("messenger.leftGroup"));
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
          t("messenger.failedToLeaveGroup"),
      );
    } finally {
      setIsGroupUpdating(false);
    }
  };

  const handleSelectAttachment = (event) => {
    const files = Array.from(event?.target?.files ?? []);
    if (event?.target) {
      event.target.value = "";
    }

    if (!files.length || !selectedConversationId || isUploadingAttachment)
      return;

    queuePendingAttachments(files);
  };

  const handleChatPaste = useCallback(
    (event) => {
      if (!selectedConversationId || isUploadingAttachment) {
        return;
      }

      const clipboardData = event?.clipboardData;
      const clipboardItems = clipboardData?.items;
      if (!clipboardItems?.length) {
        return;
      }

      const pastedFiles = Array.from(clipboardItems)
        .filter((item) => item?.kind === "file")
        .map((item) => item.getAsFile?.())
        .filter(Boolean);

      if (!pastedFiles.length) {
        return;
      }

      const pastedText = clipboardData.getData("text/plain");
      if (!pastedText) {
        event.preventDefault();
      }

      const queuedCount = queuePendingAttachments(pastedFiles);
      if (queuedCount > 0 && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    },
    [isUploadingAttachment, queuePendingAttachments, selectedConversationId],
  );

  const handleCopyMessageContent = useCallback(
    async (message) => {
      const rawContent =
        typeof message?.content === "string" ? message.content.trim() : "";
      if (!rawContent) {
        return;
      }

      const uploadMeta = getMessageUploadMeta(rawContent);
      const valueToCopy = uploadMeta?.url || rawContent;

      try {
        await copyTextToClipboard(valueToCopy);
        toast.success(
          uploadMeta?.isImage
            ? t("messenger.imageLinkCopied")
            : uploadMeta?.isVideo
              ? t("messenger.videoLinkCopied")
              : uploadMeta
                ? t("messenger.fileLinkCopied")
                : t("messenger.messageCopied"),
        );
      } catch {
        toast.error(t("messenger.copyFailed"));
      }
    },
    [],
  );

  const appendMessageIfActive = useCallback((conversationId, message) => {
    if (!conversationId || !message?.id) return;
    if (selectedConversationIdRef.current !== conversationId) return;

    setMessages((prev) => {
      if (prev.some((entry) => entry.id === message.id)) {
        return prev;
      }
      return sortMessagesByCreatedAt([...prev, message]);
    });
  }, []);

  const replaceMessageIfActive = useCallback(
    (conversationId, oldMessageId, message) => {
      if (!conversationId) return;
      if (selectedConversationIdRef.current !== conversationId) return;

      setMessages((prev) => {
        const next = oldMessageId
          ? prev.filter((entry) => entry.id !== oldMessageId)
          : prev;

        if (!message?.id) {
          return next;
        }

        if (next.some((entry) => entry.id === message.id)) {
          return next;
        }

        return sortMessagesByCreatedAt([...next, message]);
      });
    },
    [],
  );

  const handleSend = async () => {
    const content = messageDraft.trim();
    const hasText = Boolean(content);
    const hasAttachments = pendingAttachments.length > 0;
    const conversationId = selectedConversationId;

    if (
      (!hasText && !hasAttachments) ||
      !conversationId ||
      isUploadingAttachment
    ) {
      return;
    }

    const attachmentsToSend = pendingAttachments;
    const firstAttachment = attachmentsToSend[0] ?? null;
    const attachmentCount = attachmentsToSend.length;
    const optimisticAt = new Date().toISOString();
    let optimisticTextMessageId = "";
    const optimisticPreview = hasText
      ? content
      : attachmentCount > 1
        ? t("messenger.multipleFiles", { count: attachmentCount })
        : firstAttachment?.isImage
          ? t("messenger.photoWithIcon")
          : firstAttachment?.isVideo
            ? t("messenger.videoWithIcon")
            : t("messenger.fileWithIcon");

    setConversations((prev) => {
      const index = prev.findIndex(
        (conversation) => conversation.id === conversationId,
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
    clearPendingAttachments();
    clearTimeout(typingEmitTimeout.current);

    if (hasText) {
      const optimisticMessage = {
        id: createLocalMessageId(),
        conversationId,
        content,
        senderId: String(currentUserId ?? ""),
        createdAt: optimisticAt,
      };
      optimisticTextMessageId = optimisticMessage.id;
      appendMessageIfActive(conversationId, optimisticMessage);
    }

    socketRef.current?.emit("typing", {
      conversationId,
      isTyping: false,
    });

    if (hasAttachments) {
      setIsUploadingAttachment(true);
    }

    try {
      if (hasText) {
        const sentTextMessage = await sendMessage(conversationId, content);
        replaceMessageIfActive(
          conversationId,
          optimisticTextMessageId,
          sentTextMessage,
        );
      }

      if (hasAttachments) {
        let attachmentFailureCount = 0;

        for (const attachment of attachmentsToSend) {
          try {
            const uploadedPath = await uploadChatAttachment(attachment.file);
            const attachmentContent =
              typeof uploadedPath === "string" ? uploadedPath.trim() : "";

            if (!attachmentContent) {
              throw new Error("Attachment upload did not return a URL");
            }

            await sendMessage(conversationId, attachmentContent);
          } catch {
            attachmentFailureCount += 1;
          }
        }

        if (attachmentFailureCount > 0) {
          toast.error(t("messenger.someAttachmentsFailed"));
          void loadInbox();
        }
      }
    } catch (error) {
      if (optimisticTextMessageId) {
        replaceMessageIfActive(conversationId, optimisticTextMessageId, null);
      }
      toast.error(
        getApiErrorMessage(error) || t("messenger.sendError"),
      );
      void loadInbox();
    } finally {
      setIsUploadingAttachment(false);
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
    ? getConvDisplayName(selectedConversation, currentUserId, t)
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
          <h1 className="mh-sidebar-title">{t("messenger.title")}</h1>
          <div className="mh-sidebar-header-actions">
            <button
              className={`mh-ai-btn${isOpeningAi ? " loading" : ""}`}
              onClick={handleOpenAiConcierge}
              disabled={isOpeningAi}
              type="button">
              <FiCpu size={15} />
              <span>{t("messenger.aiName")}</span>
            </button>
            <button
              className="mh-new-btn"
              onClick={() => setIsModalOpen(true)}
              aria-label={t("aria.messenger.new")}>
              <FiPlus size={18} />
            </button>
          </div>
        </header>

        <div className="mh-sidebar-search">
          <FiSearch size={14} />
          <input
            placeholder={
              t("messenger.searchConversations")
            }
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
        </div>

        <nav className="mh-conv-list">
          {filteredConversations.length === 0 && (
            <div className="mh-empty-list">
              <FiMessageSquare size={30} />
              <p>{t("messenger.noConversations")}</p>
              <button
                className="mh-empty-ai-btn"
                onClick={handleOpenAiConcierge}
                disabled={isOpeningAi}>
                <FiCpu size={13} />
                {t("messenger.startWithAI")}
              </button>
              <button
                className="mh-empty-new-btn"
                onClick={() => setIsModalOpen(true)}>
                <FiPlus size={12} />
                {t("messenger.startChat")}
              </button>
            </div>
          )}

          {filteredConversations.map((conv) => {
            const isActive = selectedConversationId === conv.id;
            const hasUnread = conv.unreadCount > 0;
            const displayName = getConvDisplayName(conv, currentUserId, t);
            const avatarInfo = getConvAvatarInfo(conv, currentUserId, t);

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
                      {getConversationPreviewText(conv.lastMessage, isRTL, t)}
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
        onDrop={handleChatDrop}
        onPaste={handleChatPaste}>
        {isDragActive && selectedConversationId ? (
          <div className="mh-chat-drop-overlay" aria-hidden>
            <FiPaperclip size={24} />
            <p>{t("messenger.dropFileToAttach")}</p>
          </div>
        ) : null}
        {selectedConversationId ? (
          <>
            <header className="mh-chat-header">
              {showMobileBackBtn && (
                <button
                  className="mh-back-btn"
                  onClick={() => setMobileShowChat(false)}
                  aria-label={t("aria.messenger.back")}>
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
                  getConvAvatarInfo(selectedConversation, currentUserId, t),
                  convDisplayName,
                  selectedConversation?.isGroup ?? false,
                )}
              </div>
              <div className="mh-chat-header-info">
                <h2>{convDisplayName}</h2>
                {typingCount > 0 ? (
                  <p className="mh-typing-text">
                    {typingCount > 1
                      ? t("messenger.peopleTyping", { count: typingCount })
                      : t("messenger.typing")}
                    <span className="mh-typing-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                  </p>
                ) : isAiConversation ? (
                  <p className="mh-chat-header-sub">
                    {t("messenger.aiConciergeDesc")}
                  </p>
                ) : (selectedConversation?.isGroup ?? false) ? (
                  <p className="mh-chat-header-sub">
                    {t("messenger.groupBadge")}
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
                    <span>{t("messenger.groupSettings")}</span>
                  </button>
                ) : canOpenDirectProfile ? (
                  <button
                    className="mh-header-action-btn"
                    onClick={handleOpenDirectProfile}
                    type="button">
                    <FiUser size={15} />
                    <span>{t("messenger.profile")}</span>
                  </button>
                ) : null}
              </div>
            </header>

            <div className="mh-messages">
              {messages.length === 0 && (
                <div className="mh-messages-empty">
                  <FiMessageSquare size={34} />
                  <p>
                    {isAiConversation
                      ? t("messenger.aiEmptyPrompt")
                      : t("messenger.startConversation")}
                  </p>
                  {isAiConversation ? (
                    <div className="mh-ai-suggestions">
                      {AI_PROMPT_SUGGESTIONS.map(({ key: promptKey, fallback }) => (
                        <button
                          key={promptKey}
                          type="button"
                          className="mh-ai-suggestion-chip"
                          onClick={() => {
                            setMessageDraft(t(promptKey, { defaultValue: fallback }));
                            inputRef.current?.focus();
                          }}>
                          {t(promptKey, { defaultValue: fallback })}
                        </button>
                      ))}
                    </div>
                  ) : null}
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
                const messageVideoMeta = getMessageVideoMeta(m.content);
                const messageFileMeta = getMessageFileMeta(m.content);
                const hasMessageContent =
                  typeof m.content === "string" && Boolean(m.content.trim());

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
                        className={`mh-msg-bubble${isOwn ? " own" : ""}${messageImageUrl ? " mh-msg-bubble--image" : ""}${messageVideoMeta ? " mh-msg-bubble--video" : ""}${messageFileMeta ? " mh-msg-bubble--file" : ""}`}>
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
                            aria-label={t("aria.messenger.viewImage")}>
                            <img
                              src={messageImageUrl}
                              alt={t("messenger.sentImage")}
                              className="mh-msg-image"
                              loading="lazy"
                            />
                          </button>
                        ) : messageVideoMeta ? (
                          <video
                            className="mh-msg-video"
                            controls
                            preload="metadata"
                            playsInline>
                            <source src={messageVideoMeta.url} />
                            {t("messenger.videoNotSupported")}
                          </video>
                        ) : messageFileMeta ? (
                          <a
                            className="mh-msg-file-link"
                            href={messageFileMeta.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            download={messageFileMeta.fileName}>
                            <span className="mh-msg-file-icon" aria-hidden>
                              <FiFile size={16} />
                            </span>
                            <span className="mh-msg-file-main">
                              <span className="mh-msg-file-name">
                                {messageFileMeta.fileName}
                              </span>
                              <span className="mh-msg-file-cta">
                                {t("messenger.openOrDownload")}
                              </span>
                            </span>
                            <FiDownload
                              size={13}
                              className="mh-msg-file-download"
                              aria-hidden
                            />
                          </a>
                        ) : (
                          <span className="mh-msg-text">
                            {renderMessageContent(m.content, navigate)}
                          </span>
                        )}
                        <div className="mh-msg-meta">
                          {hasMessageContent ? (
                            <button
                              className="mh-msg-copy-btn"
                              type="button"
                              onClick={() => handleCopyMessageContent(m)}
                              aria-label={
                                messageImageUrl
                                  ? t("aria.messenger.copyImageLink")
                                  : messageVideoMeta
                                    ? t("aria.messenger.copyVideoLink")
                                    : messageFileMeta
                                      ? t("aria.messenger.copyFileLink")
                                      : t("aria.messenger.copyMessage")
                              }
                              title={
                                messageImageUrl
                                  ? t("aria.messenger.copyImageLink")
                                  : messageVideoMeta
                                    ? t("aria.messenger.copyVideoLink")
                                    : messageFileMeta
                                      ? t("aria.messenger.copyFileLink")
                                      : t("aria.messenger.copyMessage")
                              }>
                              <FiCopy size={12} />
                              <span>{t("messenger.copy")}</span>
                            </button>
                          ) : null}
                          <span className="mh-msg-time">
                            {formatTime(m.createdAt)}
                          </span>
                          {m.editedAt && (
                            <span className="mh-edited-tag">
                              {t("messenger.edited")}
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

            {pendingAttachments.length > 0 ? (
              <div className="mh-attachment-preview-list">
                {pendingAttachments.map((attachment, attachmentIndex) => (
                  <div
                    className={`mh-attachment-preview${draggingPendingAttachmentId === attachment.id ? " is-dragging" : ""}${dropPendingAttachmentId === attachment.id && draggingPendingAttachmentId !== attachment.id ? " is-drop-target" : ""}`}
                    key={attachment.id}
                    draggable
                    onDragStart={(event) =>
                      handlePendingAttachmentDragStart(attachment.id, event)
                    }
                    onDragOver={(event) =>
                      handlePendingAttachmentDragOver(attachment.id, event)
                    }
                    onDrop={(event) =>
                      handlePendingAttachmentDrop(attachment.id, event)
                    }
                    onDragEnd={handlePendingAttachmentDragEnd}>
                    {attachment.previewUrl ? (
                      <img
                        src={attachment.previewUrl}
                        alt={t("messenger.imagePreview")}
                        className="mh-attachment-preview-img"
                      />
                    ) : (
                      <span className="mh-attachment-preview-icon" aria-hidden>
                        <FiFile size={18} />
                      </span>
                    )}
                    <div className="mh-attachment-preview-meta">
                      <span>
                        {attachment.isImage
                          ? t("messenger.imageAttached")
                          : attachment.isVideo
                            ? t("messenger.videoAttached")
                            : t("messenger.fileAttached")}
                      </span>
                      <small>
                        {attachment.name}
                        {Number.isFinite(attachment.size)
                          ? ` • ${formatFileSize(attachment.size)}`
                          : ""}
                      </small>
                    </div>
                    <div className="mh-attachment-preview-controls">
                      <div className="mh-attachment-reorder-actions">
                        <button
                          className="mh-attachment-reorder-btn"
                          type="button"
                          onClick={() =>
                            movePendingAttachmentByOffset(attachment.id, -1)
                          }
                          disabled={
                            attachmentIndex === 0 || isUploadingAttachment
                          }
                          aria-label={t("aria.messenger.moveUp")}
                          title={t("aria.messenger.moveUp")}>
                          <FiChevronUp size={12} />
                        </button>
                        <button
                          className="mh-attachment-reorder-btn"
                          type="button"
                          onClick={() =>
                            movePendingAttachmentByOffset(attachment.id, 1)
                          }
                          disabled={
                            attachmentIndex === pendingAttachments.length - 1 ||
                            isUploadingAttachment
                          }
                          aria-label={t("aria.messenger.moveDown")}
                          title={t("aria.messenger.moveDown")}>
                          <FiChevronDown size={12} />
                        </button>
                      </div>
                      <button
                        className="mh-attachment-remove"
                        type="button"
                        onClick={() => removePendingAttachment(attachment.id)}
                        aria-label={t("aria.messenger.removeAttachment")}>
                        <FiX size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mh-input-area">
              <input
                ref={imageInputRef}
                type="file"
                accept="*/*"
                multiple
                className="mh-image-input"
                onChange={handleSelectAttachment}
              />
              <button
                className={`mh-attach-btn${isUploadingAttachment ? " uploading" : ""}`}
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingAttachment}
                type="button"
                aria-label={t("aria.messenger.attachFiles")}
                title={t("aria.messenger.attachFiles")}>
                {isUploadingAttachment ? (
                  <FiLoader className="mh-spinning-icon" size={16} />
                ) : (
                  <FiPaperclip size={16} />
                )}
              </button>
              <input
                ref={inputRef}
                className="mh-input"
                value={messageDraft}
                onChange={handleInputChange}
                placeholder={
                  isAiConversation
                    ? t("messenger.aiInputPlaceholder")
                    : t("messenger.writeMessage")
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                className={`mh-send-btn${(messageDraft.trim() || pendingAttachments.length > 0) && !isUploadingAttachment ? " active" : ""}`}
                onClick={handleSend}
                disabled={
                  (!messageDraft.trim() && pendingAttachments.length === 0) ||
                  isUploadingAttachment
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
            <h3>{t("messenger.welcome")}</h3>
            <p>{t("messenger.welcomeDesc")}</p>
            <button
              className="mh-no-chat-ai-btn"
              onClick={handleOpenAiConcierge}
              disabled={isOpeningAi}>
              <FiCpu size={14} />
              {t("messenger.openWaynestAI")}
            </button>
            <button
              className="mh-no-chat-btn"
              onClick={() => setIsModalOpen(true)}>
              <FiPlus size={14} />
              {t("messenger.newConversation")}
            </button>
          </div>
        )}
      </main>

      {activeImageViewerUrl ? (
        <div
          className="mh-image-viewer-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t("aria.messenger.imageViewer")}
          onClick={() => setActiveImageViewerUrl("")}>
          <button
            className="mh-image-viewer-close"
            type="button"
            onClick={() => setActiveImageViewerUrl("")}
            aria-label={t("aria.messenger.close")}>
            <FiX size={18} />
          </button>
          <div
            className="mh-image-viewer-frame"
            onClick={(event) => event.stopPropagation()}>
            <img
              src={activeImageViewerUrl}
              alt={t("messenger.chatImage")}
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
              <h2>{t("messenger.groupSettings")}</h2>
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
                <span>{t("messenger.addMembers")}</span>
              </p>

              <div className="mh-modal-search mh-group-search">
                <FiSearch size={14} />
                <input
                  placeholder={t("messenger.searchFriendsToAdd")}
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
                              friend.firstName || friend.username || t("messenger.friendFallback", { defaultValue: "Friend" })
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
                    {t("messenger.noAvailableFriends")}
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
                    <span>{t("messenger.addToGroup")}</span>
                  </>
                )}
              </button>
            </div>

            <div className="mh-group-divider" />

            <div className="mh-group-section">
              <p className="mh-group-section-title mh-group-section-title-danger">
                <FiUserMinus size={14} />
                <span>{t("messenger.removeMember")}</span>
              </p>

              <div className="mh-group-members-list">
                {groupMembers.map((member) => {
                  const memberAvatarSrc = getResolvedAvatarUrl(member);
                  const memberDisplayName =
                    `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
                    member.username ||
                    t("messenger.member");
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
                                {t("messenger.owner")}
                              </span>
                            ) : isAdminMember ? (
                              <span className="mh-member-badge mh-member-badge--admin">
                                {t("messenger.admin")}
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
                              ? t("messenger.removeAdmin")
                              : t("messenger.makeAdmin")}
                          </button>
                        )}
                        {canRemoveTarget && (
                          <button
                            className="mh-group-remove-btn"
                            onClick={() => handleRemoveMemberFromGroup(member)}
                            disabled={isGroupUpdating}
                            type="button">
                            {t("messenger.removeMemberShort")}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {groupMembers.length === 0 && (
                  <div className="mh-friends-empty">
                    {t("messenger.noGroupMembers")}
                  </div>
                )}
              </div>

              <p className="mh-group-note">{t("messenger.groupNote")}</p>

              <button
                className="mh-group-leave-btn"
                onClick={handleLeaveGroup}
                disabled={isGroupUpdating}
                type="button">
                <FiLogOut size={14} />
                <span>{t("messenger.leaveGroup")}</span>
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
                  ? t("messenger.createGroup")
                  : t("messenger.newConversationTitle")}
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
                {t("messenger.direct")}
              </button>
              <button
                className={`mh-type-btn${isGroupMode ? " active" : ""}`}
                onClick={() => {
                  setIsGroupMode(true);
                  setSelectedFriends([]);
                }}>
                <FiUsers size={14} />
                {t("messenger.group")}
              </button>
            </div>

            {isGroupMode && (
              <div className="mh-modal-field">
                <label className="mh-modal-label">
                  {t("messenger.groupNameLabel")}
                </label>
                <input
                  className="mh-modal-input"
                  placeholder={
                    t("messenger.groupNamePlaceholder")
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
                placeholder={t("messenger.searchFriendsPlaceholder")}
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
                      {t("messenger.savedMessages")}
                    </span>
                    <span className="mh-friend-sub">
                      {t("messenger.savedMessagesDescription")}
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
                  {t("messenger.noMatchingFriends")}
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
                {t("messenger.firstMessage")}
              </label>
              <input
                className="mh-modal-input"
                placeholder={
                  t("messenger.firstMessagePlaceholder")
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
                    ? t("messenger.createGroupBtn")
                    : t("messenger.startChatBtn")}
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
