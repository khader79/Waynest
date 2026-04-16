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

export function NotificationsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?.id ?? user?.userId ?? null;
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadCountRef = useRef(0);
  const socketRef = useRef(null);
  const dedupeRef = useRef(new Map());

  const announce = useCallback(({ title, body, href, dedupeKey }) => {
    const text = typeof body === "string" ? body.trim() : "";
    if (!text) {
      return;
    }

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
      toast.info(text, {
        toastId: dedupeKey ? `notif-toast:${dedupeKey}` : undefined,
        onClick: () => {
          if (typeof window !== "undefined") {
            window.location.assign(destination);
          }
        },
      });
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
      const browserNotification = new Notification(title, {
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
  }, []);

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

      const title = uiIsRTL() ? "إشعار جديد" : "New notification";
      announce({
        title,
        body: latest.message,
        href: getNotificationHref(latest) || "/notifications",
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

    if (typeof Notification === "undefined") {
      return undefined;
    }

    if (Notification.permission !== "granted") {
      return undefined;
    }

    let active = true;
    void (async () => {
      try {
        const prefs = await fetchNotificationPreferences();
        if (!active) {
          return;
        }
        if (prefs?.channels?.push) {
          void enablePushNotifications();
        }
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
      const title = senderName
        ? uiIsRTL()
          ? `${senderName} بعثلك رسالة`
          : `${senderName} sent you a message`
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
        body,
        href: conversationId
          ? `/inbox/${encodeURIComponent(String(conversationId))}`
          : "/notifications",
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
