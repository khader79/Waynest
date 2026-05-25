import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import {
  fetchNotificationPreferences,
  fetchNotifications,
  getNotificationHref,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "@/api/social";
import { useNotifications } from "@/context/NotificationsContext";
import { removeWebPushSubscription } from "@/utils/webPush";
import {
  FaHeart,
  FaComment,
  FaReply,
  FaUserPlus,
  FaEnvelope,
  FaCopy,
  FaHandshake,
  FaCheckCircle,
  FaCalendarAlt,
  FaBell,
  FaStar,
  FaCheck,
  FaTimes,
  FaBellSlash,
  FaMailBulk,
  FaMobileAlt,
  FaInbox,
  FaCheckSquare,
  FaRegCheckCircle,
} from "react-icons/fa";
import {
  IoNotificationsCircle,
  IoNotificationsOutline,
} from "react-icons/io5";
import "./SocialFeed.css";
import "./NotificationsPage.css";

const NOTIF_ICONS = {
  LIKE: <FaHeart className="notif-icon notif-icon--like" />,
  COMMENT: <FaComment className="notif-icon notif-icon--comment" />,
  REPLY: <FaReply className="notif-icon notif-icon--reply" />,
  FOLLOW: <FaUserPlus className="notif-icon notif-icon--follow" />,
  MESSAGE: <FaEnvelope className="notif-icon notif-icon--message" />,
  PLAN_COPIED: <FaCopy className="notif-icon notif-icon--plan" />,
  FRIEND_REQUEST: <FaHandshake className="notif-icon notif-icon--friend-req" />,
  FRIEND_ACCEPTED: <FaCheckCircle className="notif-icon notif-icon--friend-accept" />,
  BOOKING_NEW: <FaCalendarAlt className="notif-icon notif-icon--booking" />,
  BOOKING_STATUS: <FaBell className="notif-icon notif-icon--booking-status" />,
  REVIEW_NEW: <FaStar className="notif-icon notif-icon--review" />,
};

const TYPE_PREF_OPTIONS = (t) => [
  { type: "MESSAGE", label: t("social.notifications.filter.messages", "Messages") },
  { type: "FRIEND_REQUEST", label: t("social.notifications.filter.friendRequests", "Friend requests") },
  { type: "FRIEND_ACCEPTED", label: t("social.notifications.filter.friendAccepted", "Friend accepted") },
  { type: "FOLLOW", label: t("social.notifications.filter.newFollowers", "New followers") },
  { type: "BOOKING_NEW", label: t("social.notifications.filter.newBookings", "New bookings") },
  { type: "BOOKING_STATUS", label: t("social.notifications.filter.bookingUpdates", "Booking updates") },
];

const DEFAULT_PREFERENCES = {
  channels: {
    inApp: true,
    push: true,
    email: false,
  },
  typePreferences: {},
};

const NotificationsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUnreadCount, enablePushNotifications } = useNotifications();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

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

  const loadPreferences = async () => {
    try {
      setPrefsLoading(true);
      const payload = await fetchNotificationPreferences();
      setPreferences({
        channels: {
          inApp:
            typeof payload?.channels?.inApp === "boolean"
              ? payload.channels.inApp
              : true,
          push:
            typeof payload?.channels?.push === "boolean"
              ? payload.channels.push
              : true,
          email:
            typeof payload?.channels?.email === "boolean"
              ? payload.channels.email
              : false,
        },
        typePreferences:
          payload?.typePreferences &&
          typeof payload.typePreferences === "object"
            ? payload.typePreferences
            : {},
      });
    } catch {
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setPrefsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadPreferences();
  }, []);

  const toggleChannel = (channelKey) => {
    setPreferences((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channelKey]: !prev.channels[channelKey],
      },
    }));
  };

  const toggleTypePreference = (type) => {
    setPreferences((prev) => {
      const currentEnabled = prev.typePreferences[type] !== false;
      return {
        ...prev,
        typePreferences: {
          ...prev.typePreferences,
          [type]: !currentEnabled,
        },
      };
    });
  };

  const savePreferences = async () => {
    try {
      setPrefsSaving(true);
      const payload = await updateNotificationPreferences({
        channels: preferences.channels,
        typePreferences: preferences.typePreferences,
      });

      const next = {
        channels: {
          inApp:
            typeof payload?.channels?.inApp === "boolean"
              ? payload.channels.inApp
              : preferences.channels.inApp,
          push:
            typeof payload?.channels?.push === "boolean"
              ? payload.channels.push
              : preferences.channels.push,
          email:
            typeof payload?.channels?.email === "boolean"
              ? payload.channels.email
              : preferences.channels.email,
        },
        typePreferences:
          payload?.typePreferences &&
          typeof payload.typePreferences === "object"
            ? payload.typePreferences
            : preferences.typePreferences,
      };

      setPreferences(next);

      if (next.channels.push) {
        const pushResult = await enablePushNotifications();
        if (!pushResult?.ok && pushResult?.reason === "denied") {
          toast.info(
            t("social.notifications.pushPermissionDenied", {
              defaultValue:
                "Browser notifications are blocked. Enable notifications from your browser settings.",
            }),
          );
        }
      } else {
        void removeWebPushSubscription();
      }

      toast.success(
        t("social.notifications.preferencesSaved", {
          defaultValue: "Notification preferences saved",
        }),
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.notifications.preferencesSaveFailed", {
            defaultValue: "Failed to save notification preferences",
          }),
        ),
      );
    } finally {
      setPrefsSaving(false);
    }
  };

  return (
    <section className="notif-page">
      <div className="notif-hero">
        <div className="notif-hero-bg" />
        <div className="notif-hero-inner">
          <IoNotificationsCircle className="notif-hero-icon" size={26} />
          <h1 className="notif-hero-title">
            {t("social.notifications.title", { defaultValue: "Notifications" })}
          </h1>
        </div>
        <p className="notif-hero-sub">
          {t("social.notifications.subtitle", {
            defaultValue: "Stay updated with your activity",
          })}
        </p>
        <button
          type="button"
          className="notif-mark-all-btn"
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
          }}>
          <FaCheckSquare size={14} />
          {t("social.notifications.markAllRead", {
            defaultValue: "Mark all as read",
          })}
        </button>
      </div>

      <div className="notif-preferences-card">
        <div className="notif-preferences-head">
          <h2>
            {t("social.notifications.preferencesTitle", {
              defaultValue: "Notification preferences",
            })}
          </h2>
          <button
            type="button"
            className="social-feed-header__btn social-feed-header__btn--primary"
            onClick={() => void savePreferences()}
            disabled={prefsLoading || prefsSaving}>
            {prefsSaving
              ? t("common.saving", { defaultValue: "Saving..." })
              : t("common.save", { defaultValue: "Save" })}
          </button>
        </div>

        <div className="notif-preferences-channels">
          <label className="notif-pref-toggle">
            <input
              type="checkbox"
              checked={Boolean(preferences.channels.inApp)}
              onChange={() => toggleChannel("inApp")}
              disabled={prefsLoading || prefsSaving}
            />
            <span>
              {t("social.notifications.channelInApp", {
                defaultValue: "In-app",
              })}
            </span>
          </label>
          <label className="notif-pref-toggle">
            <input
              type="checkbox"
              checked={Boolean(preferences.channels.push)}
              onChange={() => toggleChannel("push")}
              disabled={prefsLoading || prefsSaving}
            />
            <span>
              {t("social.notifications.channelPush", {
                defaultValue: "Push",
              })}
            </span>
          </label>
          <label className="notif-pref-toggle">
            <input
              type="checkbox"
              checked={Boolean(preferences.channels.email)}
              onChange={() => toggleChannel("email")}
              disabled={prefsLoading || prefsSaving}
            />
            <span>
              {t("social.notifications.channelEmail", {
                defaultValue: "Email fallback",
              })}
            </span>
          </label>
        </div>

        <div className="notif-preferences-types">
          {TYPE_PREF_OPTIONS(t).map(({ type, label }) => {
            const enabled = preferences.typePreferences[type] !== false;
            return (
              <label
                key={type}
                className="notif-pref-toggle notif-pref-toggle--type">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleTypePreference(type)}
                  disabled={prefsLoading || prefsSaving}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="notif-list">
        {loading ? (
          <div className="social-feed-skeletons">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="notif-skeleton">
                <div className="notif-skeleton-inner">
                  <div className="notif-sk-avatar" />
                  <div className="notif-sk-lines">
                    <div className="notif-sk-line notif-sk-line--wide" />
                    <div className="notif-sk-line" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="notif-empty">
            <IoNotificationsCircle size={40} />
            <p>
              {t("social.notifications.empty", {
                defaultValue: "No notifications yet.",
              })}
            </p>
          </div>
        ) : (
          items.map((item, idx) => {
            const icon = NOTIF_ICONS[item.type] ?? "🔔";
            const href = getNotificationHref(item);
            return (
              <article
                key={item.id}
                className={`notif-card${item.isRead ? " notif-card--read" : ""}`}
                style={{ animationDelay: `${idx * 40}ms` }}
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
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}>
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
