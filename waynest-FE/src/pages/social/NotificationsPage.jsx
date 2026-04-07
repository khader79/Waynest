import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import {
  fetchNotifications,
  getNotificationHref,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/social";
import { useNotifications } from "@/context/NotificationsContext";
import "./SocialFeed.css";

const NOTIF_ICONS = {
  LIKE: "❤️",
  COMMENT: "💬",
  REPLY: "↩️",
  FOLLOW: "👤",
  MESSAGE: "✉️",
  PLAN_COPIED: "📋",
  FRIEND_REQUEST: "🤝",
  FRIEND_ACCEPTED: "✅",
  BOOKING_NEW: "📅",
  BOOKING_STATUS: "🔔",
  REVIEW_NEW: "⭐",
};

const NotificationsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUnreadCount } = useNotifications();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const payload = await fetchNotifications();
      setItems(Array.isArray(payload) ? payload : []);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.notifications.loadFailed", {
            defaultValue: "Failed to load notifications",
          }),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="social-feed-page">
      <div className="social-feed-header">
        <h1>
          {t("social.notifications.title", { defaultValue: "Notifications" })}
        </h1>
        <button
          type="button"
          onClick={async () => {
            try {
              await markAllNotificationsRead();
              await load();
              await refreshUnreadCount();
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
          }}
        >
          {t("social.notifications.markAllRead", {
            defaultValue: "Mark all as read",
          })}
        </button>
      </div>
      <div className="social-post-list">
        {loading ? (
          <div className="social-feed-skeletons">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="social-post-skeleton">
                <div className="social-skeleton-header">
                  <div className="social-skeleton-avatar" />
                  <div className="social-skeleton-meta">
                    <div className="social-skeleton-line social-skeleton-line--body" />
                    <div className="social-skeleton-line social-skeleton-line--date" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="social-empty">
            {t("social.notifications.empty", {
              defaultValue: "No notifications yet.",
            })}
          </p>
        ) : (
          items.map((item) => {
            const icon = NOTIF_ICONS[item.type] ?? "🔔";
            const href = getNotificationHref(item);
            return (
              <article
                key={item.id}
                className={`social-post-card notif-card${item.isRead ? " notif-card--read" : ""}`}
                role={href ? "button" : undefined}
                tabIndex={href ? 0 : undefined}
                onClick={async () => {
                  try {
                    await markNotificationRead(item.id);
                    await refreshUnreadCount();
                    if (href) {
                      navigate(href);
                    }
                  } catch (error) {
                    toast.error(
                      getApiErrorMessage(
                        error,
                        t("social.notifications.markFailed", {
                          defaultValue: "Failed to update notification",
                        }),
                      ),
                    );
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
              >
                <div className="notif-card-body">
                  <span className="notif-icon">{icon}</span>
                  <div className="notif-content">
                    <p>{item.message}</p>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </div>
                  {!item.isRead && <span className="notif-unread-dot" />}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

export default NotificationsPage;
