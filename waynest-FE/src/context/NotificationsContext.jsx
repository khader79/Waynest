/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import {
  fetchNotificationPreferences,
  fetchNotifications,
  fetchUnreadNotificationCount,
  getNotificationHref,
} from "@/api/social";
import { API_BASE_URL } from "@/api/client";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { ensureWebPushSubscription, supportsWebPush } from "@/utils/webPush";

const NotificationsContext = createContext(undefined);

const REFRESH_INTERVAL_MS = 15_000;
const DEDUPE_TTL_MS = 90_000;

const pageIsVisible = () =>
  typeof document !== "undefined" && document.visibilityState === "visible";

const viewingConversation = (conversationId) => {
  if (!conversationId || typeof window === "undefined") {
    return false;
  }

  const currentPath = window.location.pathname || "";
  const targetId = String(conversationId);

  if (currentPath.startsWith("/inbox/")) {
    const rawId = currentPath.slice("/inbox/".length);
    try {
      return decodeURIComponent(rawId) === targetId;
    } catch {
      return rawId === targetId;
    }
  }

  if (currentPath === "/social") {
    return (
      new URLSearchParams(window.location.search).get("conversation") ===
      targetId
    );
  }

  return false;
};

const uiIsRTL = () =>
  typeof document !== "undefined" && document.documentElement?.dir === "rtl";

const pushPromptSessionKey = (userId) => `waynest:push-prompted:${userId}`;

const resolveSenderName = (sender) => {
  if (!sender || typeof sender !== "object") {
    return "";
  }

  const first =
    typeof sender.firstName === "string" ? sender.firstName.trim() : "";
  const last =
    typeof sender.lastName === "string" ? sender.lastName.trim() : "";
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return typeof sender.username === "string" ? sender.username.trim() : "";
};

const resolveSenderAvatar = (sender) => {
  if (!sender || typeof sender !== "object") {
    return "";
  }

  const candidates = [
    sender.avatarUrl,
    sender.avatar_url,
    sender.profilePicture,
    sender.profile_picture,
    sender.imageUrl,
    sender.image_url,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const getAvatarInitials = (value, rtl) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return rtl ? "ش" : "N";
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0] || "")
    .join("")
    .toUpperCase();

  return initials || (rtl ? "ش" : "N");
};

const normalizeMessageStatus = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "read" ||
    normalized === "delivered" ||
    normalized === "new"
  ) {
    return normalized;
  }

  return "";
};

const resolveMessageStatusFromReceipt = (receipt) => {
  if (!receipt || typeof receipt !== "object") {
    return "new";
  }

  if (receipt.readAt || receipt.read_at) {
    return "read";
  }

  if (receipt.deliveredAt || receipt.delivered_at) {
    return "delivered";
  }

  return "new";
};

const IMAGE_CONTENT_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:\?.*)?$/i;
const UPLOAD_CONTENT_PATTERN = /^\/?uploads\/|\/uploads\//i;

const isUploadedMessageContent = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }

  return UPLOAD_CONTENT_PATTERN.test(trimmed);
};

const isImageMessageContent = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const isUploadPath = isUploadedMessageContent(trimmed);
  const isImageUrl =
    /^(https?:\/\/|\/)/i.test(trimmed) && IMAGE_CONTENT_PATTERN.test(trimmed);
  return isImageUrl || (isUploadPath && IMAGE_CONTENT_PATTERN.test(trimmed));
};

const isFileMessageContent = (value) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return false;
  }

  return isUploadedMessageContent(trimmed) && !isImageMessageContent(trimmed);
};

const truncateText = (value, limit = 180) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length <= limit) {
    return text;
  }
  return `${text.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
};

const normalizeToastBody = (value, rtl) => {
  const text = truncateText(value);
  if (!text) {
    return rtl ? "وصلك إشعار جديد" : "You received a new notification";
  }
  if (isImageMessageContent(text)) {
    return rtl ? "📷 صورة" : "📷 Photo";
  }
  if (isFileMessageContent(text)) {
    return rtl ? "📎 ملف" : "📎 File";
  }
  return text;
};

const formatToastTime = (value, rtl) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat(rtl ? "ar" : "en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(parsed);
  } catch {
    return "";
  }
};

const getToastChannelLabel = (kind, rtl) => {
  if (kind === "message") {
    return rtl ? "رسالة" : "Message";
  }
  return rtl ? "إشعار" : "Notification";
};

const getToastStatusMeta = ({ kind, isRead, messageStatus, rtl }) => {
  if (kind === "message") {
    const normalized = normalizeMessageStatus(messageStatus);
    if (normalized === "read" || (!normalized && isRead)) {
      return {
        label: rtl ? "مقروءة" : "Read",
        variant: "is-read",
      };
    }

    if (normalized === "delivered") {
      return {
        label: rtl ? "وصلت" : "Delivered",
        variant: "is-delivered",
      };
    }

    return {
      label: rtl ? "جديدة" : "New",
      variant: "is-new",
    };
  }

  return isRead
    ? {
        label: rtl ? "مقروءة" : "Read",
        variant: "is-read",
      }
    : {
        label: rtl ? "غير مقروءة" : "Unread",
        variant: "is-unread",
      };
};

const renderNotificationToastContent = ({
  heading,
  body,
  channelLabel,
  statusLabel,
  statusVariant,
  timeLabel,
  avatarUrl,
  rtl,
}) => (
  <div className="toast-notification-content">
    <div
      className={`toast-notification-avatar${avatarUrl ? " has-image" : ""}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={rtl ? "صورة المرسل" : "Sender avatar"}
          className="toast-notification-avatar-image"
        />
      ) : (
        <span>{getAvatarInitials(heading, rtl)}</span>
      )}
    </div>
    <div className="toast-notification-copy">
      <div className="toast-notification-head">
        <span className="toast-notification-heading">{heading}</span>
        <span className={`toast-notification-status ${statusVariant}`}>
          {statusLabel}
        </span>
      </div>
      <p className="toast-notification-body">{body}</p>
      <div className="toast-notification-meta">
        <span>{channelLabel}</span>
        {timeLabel ? (
          <span className="toast-notification-time">{timeLabel}</span>
        ) : null}
      </div>
    </div>
  </div>
);

export function NotificationsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?.id ?? user?.userId ?? null;
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadCountRef = useRef(0);
  const socketRef = useRef(null);
  const dedupeRef = useRef(new Map());

  const announce = useCallback(
    ({
      title,
      body,
      href,
      dedupeKey,
      senderName = "",
      avatarUrl = "",
      isRead = false,
      kind = "notification",
      messageStatus = "",
      createdAt = null,
    }) => {
      const rtl = uiIsRTL();
      const text = normalizeToastBody(body, rtl);
      if (!text) {
        return;
      }

      const normalizedTitle =
        typeof title === "string" && title.trim()
          ? title.trim()
          : rtl
            ? "إشعار جديد"
            : "New notification";

      const normalizedSender =
        typeof senderName === "string" ? senderName.trim() : "";
      const normalizedAvatar =
        typeof avatarUrl === "string" ? avatarUrl.trim() : "";
      const heading = normalizedSender || normalizedTitle;
      const statusMeta = getToastStatusMeta({
        kind,
        isRead: Boolean(isRead),
        messageStatus,
        rtl,
      });
      const channelLabel = getToastChannelLabel(kind, rtl);
      const timeLabel = formatToastTime(createdAt, rtl);

      const now = Date.now();
      for (const [key, expiresAt] of dedupeRef.current.entries()) {
        if (expiresAt <= now) {
          dedupeRef.current.delete(key);
        }
      }

      if (dedupeKey) {
        const cached = dedupeRef.current.get(dedupeKey);
        if (cached && cached > now) {
          return;
        }
        dedupeRef.current.set(dedupeKey, now + DEDUPE_TTL_MS);
      }

      const destination = href || "/notifications";

      if (pageIsVisible()) {
        toast(
          renderNotificationToastContent({
            heading,
            body: text,
            channelLabel,
            statusLabel: statusMeta.label,
            statusVariant: statusMeta.variant,
            timeLabel,
            avatarUrl: normalizedAvatar,
            rtl,
          }),
          {
            toastId: dedupeKey ? `notif-toast:${dedupeKey}` : undefined,
            type: kind === "message" ? "info" : isRead ? "default" : "info",
            onClick: () => {
              if (typeof window !== "undefined") {
                window.location.assign(destination);
              }
            },
          },
        );
      }

      if (
        typeof window === "undefined" ||
        typeof Notification === "undefined" ||
        pageIsVisible() ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      try {
        const browserNotification = new Notification(normalizedTitle, {
          body: text,
          icon: "/images/waynest%20icon.svg",
          tag: dedupeKey || undefined,
        });
        browserNotification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          window.location.assign(destination);
          browserNotification.close();
        };
      } catch {
        // Browser notification is best-effort only.
      }
    },
    [],
  );

  const announceLatestNotification = useCallback(async () => {
    if (!isAuthenticated || !currentUserId) {
      return;
    }

    try {
      const rows = await fetchNotifications(5);
      if (!Array.isArray(rows) || rows.length === 0) {
        return;
      }

      const latest = rows.find((item) => !item.isRead) ?? rows[0];
      if (!latest?.id) {
        return;
      }

      const senderName = resolveSenderName(latest.actor);
      const senderAvatarUrl = resolveSenderAvatar(latest.actor);
      const title =
        senderName || (uiIsRTL() ? "إشعار جديد" : "New notification");
      announce({
        title,
        senderName,
        avatarUrl: senderAvatarUrl,
        body: latest.message,
        href: getNotificationHref(latest) || "/notifications",
        isRead: Boolean(latest.isRead),
        kind: latest.type === "MESSAGE" ? "message" : "notification",
        createdAt: latest.createdAt,
        dedupeKey: `notif:${latest.id}`,
      });
    } catch {
      // Skip announcement when polling latest item fails.
    }
  }, [announce, currentUserId, isAuthenticated]);

  const enablePushNotifications = useCallback(async () => {
    if (!isAuthenticated || !currentUserId) {
      return { ok: false, reason: "unauthenticated" };
    }

    if (!supportsWebPush()) {
      return { ok: false, reason: "unsupported" };
    }

    try {
      return await ensureWebPushSubscription();
    } catch {
      return { ok: false, reason: "failed" };
    }
  }, [currentUserId, isAuthenticated]);

  const refreshUnreadCount = useCallback(
    async ({ announceNew = true } = {}) => {
      if (!isAuthenticated || !currentUserId) {
        unreadCountRef.current = 0;
        setUnreadCount(0);
        return;
      }

      try {
        const res = await fetchUnreadNotificationCount();
        const n =
          typeof res?.count === "number" ? res.count : Number(res?.count);
        const next = Number.isFinite(n) ? n : 0;
        const prev = unreadCountRef.current;
        unreadCountRef.current = next;
        setUnreadCount(next);

        if (announceNew && next > prev) {
          void announceLatestNotification();
        }
      } catch {
        unreadCountRef.current = 0;
        setUnreadCount(0);
      }
    },
    [announceLatestNotification, currentUserId, isAuthenticated],
  );

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) {
      return undefined;
    }

    if (!supportsWebPush()) {
      return undefined;
    }

    if (typeof Notification === "undefined") {
      return undefined;
    }

    if (Notification.permission === "denied") {
      return undefined;
    }

    let active = true;
    void (async () => {
      try {
        const prefs = await fetchNotificationPreferences();
        if (!active) {
          return;
        }

        if (!prefs?.channels?.push) {
          return;
        }

        const shouldSkipPromptThisSession =
          Notification.permission === "default" &&
          typeof window !== "undefined" &&
          window.sessionStorage?.getItem(
            pushPromptSessionKey(currentUserId),
          ) === "1";

        if (shouldSkipPromptThisSession) {
          return;
        }

        if (
          Notification.permission === "default" &&
          typeof window !== "undefined"
        ) {
          window.sessionStorage?.setItem(
            pushPromptSessionKey(currentUserId),
            "1",
          );
        }

        void enablePushNotifications();
      } catch {
        // Skip auto-subscribe when preference lookup fails.
      }
    })();

    return () => {
      active = false;
    };
  }, [currentUserId, enablePushNotifications, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    const id = window.setInterval(() => {
      void refreshUnreadCount();
    }, REFRESH_INTERVAL_MS);

    const onFocus = () => {
      void refreshUnreadCount();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, refreshUnreadCount]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return undefined;
    }

    const onServiceWorkerMessage = (event) => {
      const data = event?.data;
      if (!data || data.type !== "push:notification") {
        return;
      }

      const payload =
        data.payload && typeof data.payload === "object" ? data.payload : null;
      if (!payload) {
        return;
      }

      const payloadType =
        typeof payload.type === "string" ? payload.type.toUpperCase() : "";
      const senderName =
        typeof payload.senderName === "string" ? payload.senderName.trim() : "";
      const senderAvatarUrl =
        typeof payload.senderAvatarUrl === "string" &&
        payload.senderAvatarUrl.trim()
          ? payload.senderAvatarUrl.trim()
          : typeof payload.avatarUrl === "string" && payload.avatarUrl.trim()
            ? payload.avatarUrl.trim()
            : "";
      const messageStatus = normalizeMessageStatus(payload.messageStatus);

      announce({
        title:
          typeof payload.title === "string" && payload.title.trim()
            ? payload.title
            : uiIsRTL()
              ? "إشعار جديد"
              : "New notification",
        body: typeof payload.body === "string" ? payload.body : "",
        href:
          typeof payload.href === "string" && payload.href.trim()
            ? payload.href
            : "/notifications",
        senderName,
        avatarUrl: senderAvatarUrl,
        isRead: typeof payload.isRead === "boolean" ? payload.isRead : false,
        kind: payloadType === "MESSAGE" ? "message" : "notification",
        messageStatus,
        createdAt:
          typeof payload.createdAt === "string" ? payload.createdAt : null,
        dedupeKey:
          typeof payload.tag === "string" && payload.tag
            ? payload.tag
            : undefined,
      });

      void refreshUnreadCount({ announceNew: false });
    };

    navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        onServiceWorkerMessage,
      );
    };
  }, [announce, refreshUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    if (!token) {
      return undefined;
    }

    const base = API_BASE_URL.replace(/\/$/, "");
    const socket = io(`${base}/chat`, {
      auth: { token },
      query: { userId: currentUserId },
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    const onNewMessage = (payload) => {
      const conversationId =
        payload?.conversationId ?? payload?.message?.conversationId ?? null;
      const senderId = payload?.message?.senderId ?? payload?.senderId ?? null;

      if (senderId && String(senderId) === String(currentUserId)) {
        return;
      }

      if (conversationId && viewingConversation(conversationId)) {
        void refreshUnreadCount({ announceNew: false });
        return;
      }

      const senderName = resolveSenderName(payload?.message?.sender);
      const senderAvatarUrl = resolveSenderAvatar(payload?.message?.sender);
      const messageStatus = resolveMessageStatusFromReceipt(
        payload?.message?.receipt,
      );
      const title = senderName
        ? uiIsRTL()
          ? `${senderName} بعثلك رسالة جديدة`
          : `${senderName} sent you a new message`
        : uiIsRTL()
          ? "رسالة جديدة"
          : "New message";
      const body =
        typeof payload?.message?.content === "string" &&
        payload.message.content.trim()
          ? payload.message.content.trim()
          : uiIsRTL()
            ? "وصلك رسالة جديدة"
            : "You received a new message";

      announce({
        title,
        senderName,
        avatarUrl: senderAvatarUrl,
        body,
        href: conversationId
          ? `/inbox/${encodeURIComponent(String(conversationId))}`
          : "/notifications",
        isRead: Boolean(payload?.message?.receipt?.readAt),
        kind: "message",
        messageStatus,
        createdAt: payload?.message?.createdAt ?? null,
        dedupeKey: payload?.message?.id
          ? `msg:${payload.message.id}`
          : `msg:${conversationId || "unknown"}:${payload?.message?.createdAt || ""}`,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chat:message", { detail: payload }),
        );
      }

      void refreshUnreadCount({ announceNew: false });
    };

    socket.on("message:new", onNewMessage);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [announce, currentUserId, isAuthenticated, refreshUnreadCount]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount, enablePushNotifications }),
    [enablePushNotifications, unreadCount, refreshUnreadCount],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used inside NotificationsProvider",
    );
  }
  return ctx;
}
