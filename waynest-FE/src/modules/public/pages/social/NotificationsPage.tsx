import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/social/social.service";
import "./SocialFeed.css";

type NotificationItem = {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const NotificationsPage = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = async () => {
    try {
      const payload = await fetchNotifications();
      setItems(Array.isArray(payload) ? payload : []);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.notifications.loadFailed", { defaultValue: "Failed to load notifications" }),
        ),
      );
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="social-feed-page">
      <div className="social-feed-header">
        <h1>{t("social.notifications.title", { defaultValue: "Notifications" })}</h1>
        <button
          type="button"
          onClick={async () => {
            try {
              await markAllNotificationsRead();
              await load();
            } catch (error) {
              toast.error(
                getApiErrorMessage(
                  error,
                  t("social.notifications.markFailed", {
                    defaultValue: "Failed to mark notifications",
                  }),
                ),
              );
            }
          }}>
          {t("social.notifications.markAllRead", { defaultValue: "Mark all as read" })}
        </button>
      </div>
      <div className="social-post-list">
        {items.map((item) => (
          <article
            key={item.id}
            className="social-post-card"
            onClick={() => void markNotificationRead(item.id)}
            style={{ opacity: item.isRead ? 0.72 : 1 }}>
            <p>{item.message}</p>
            <small>{new Date(item.createdAt).toLocaleString()}</small>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="social-empty">
            {t("social.notifications.empty", { defaultValue: "No notifications yet." })}
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default NotificationsPage;

