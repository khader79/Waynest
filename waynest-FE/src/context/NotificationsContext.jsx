/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchUnreadNotificationCount } from "@/api/social";

const NotificationsContext = createContext(undefined);

export function NotificationsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetchUnreadNotificationCount();
      const n = typeof res?.count === "number" ? res.count : Number(res?.count);
      setUnreadCount(Number.isFinite(n) ? n : 0);
    } catch {
      setUnreadCount(0);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }
    const id = window.setInterval(() => {
      void refreshUnreadCount();
    }, 45_000);
    const onFocus = () => {
      void refreshUnreadCount();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, refreshUnreadCount]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount }),
    [unreadCount, refreshUnreadCount],
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
