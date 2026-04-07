import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiBell, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  fetchNotifications,
  getNotificationHref,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/social";
import { useNotifications } from "@/context/NotificationsContext";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import { getApiErrorMessage } from "@/utils/errors";
import "./NavbarNotificationsMenu.css";

const PREVIEW_LIMIT = 10;

function formatNotifTime(iso, locale) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function actorInitials(item) {
  const a = item.actor;
  if (!a || typeof a !== "object") {
    const m = typeof item.message === "string" ? item.message.trim() : "";
    return m.charAt(0).toUpperCase() || "•";
  }
  const f = typeof a.firstName === "string" ? a.firstName.trim() : "";
  const l = typeof a.lastName === "string" ? a.lastName.trim() : "";
  if (f || l) {
    return (
      `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() ||
      (a.username || "?").charAt(0).toUpperCase()
    );
  }
  const u = typeof a.username === "string" ? a.username : "";
  return u.charAt(0).toUpperCase() || "?";
}

export function NavbarNotificationsMenu({
  open,
  onToggle,
  onNavigate,
  unreadCount,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { refreshUnreadCount } = useNotifications();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const payload = await fetchNotifications(PREVIEW_LIMIT);
        if (!active) {
          return;
        }
        setRows(Array.isArray(payload) ? payload : []);
      } catch (error) {
        if (active) {
          toast.error(
            getApiErrorMessage(
              error,
              t("social.notifications.loadFailed", {
                defaultValue: "Failed to load notifications",
              }),
            ),
          );
          setRows([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [open, t]);

  const handleRowActivate = async (item) => {
    const href = getNotificationHref(item);
    try {
      await markNotificationRead(item.id);
      await refreshUnreadCount();
      onNavigate?.();
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
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      await refreshUnreadCount();
      const payload = await fetchNotifications(PREVIEW_LIMIT);
      setRows(Array.isArray(payload) ? payload : []);
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
  };

  return (
    <div className="public-navbar-notifications">
      <button
        type="button"
        className="public-navbar-messages-trigger"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("navbar.notificationsMenu", {
          defaultValue: "Notifications",
        })}>
        <FiBell className="public-navbar-messages-icon" aria-hidden />
        {unreadCount > 0 ? (
          <span className="public-navbar-messages-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="public-navbar-notifications-dropdown" role="menu">
          <div className="public-navbar-notifications-head">
            <span className="public-navbar-notifications-head__title">
              {t("social.notifications.title", {
                defaultValue: "Notifications",
              })}
            </span>
            <div className="public-navbar-notifications-head-actions">
              {rows.some((r) => !r.isRead) ? (
                <button
                  type="button"
                  className="public-navbar-notifications-markall"
                  onClick={() => void handleMarkAll()}>
                  {t("social.notifications.markAllRead", {
                    defaultValue: "Mark all as read",
                  })}
                </button>
              ) : null}
              <button
                type="button"
                className="public-navbar-notifications-close"
                aria-label={t("common.close", { defaultValue: "Close" })}
                onClick={() => onToggle?.()}>
                <FiX aria-hidden />
              </button>
            </div>
          </div>

          {loading && rows.length === 0 ? (
            <p className="public-navbar-messages-empty">
              {t("common.loading", { defaultValue: "Loading…" })}
            </p>
          ) : null}

          {!loading && rows.length === 0 ? (
            <p className="public-navbar-messages-empty">
              {t("social.notifications.empty", {
                defaultValue: "No notifications yet.",
              })}
            </p>
          ) : null}

          <ul className="public-navbar-notifications-list">
            {rows.map((item) => {
              const href = getNotificationHref(item);
              const avatarUrl = getResolvedAvatarUrl(item.actor);
              const timeLabel = formatNotifTime(item.createdAt, i18n.language);

              return (
                <li key={item.id}>
                  {href ? (
                    <Link
                      role="menuitem"
                      to={href}
                      className={`public-navbar-notif-row${item.isRead ? "" : " public-navbar-notif-row--unread"}`}
                      onClick={(e) => {
                        e.preventDefault();
                        void handleRowActivate(item);
                      }}>
                      <span
                        className="public-navbar-notif-row__avatar"
                        aria-hidden>
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="public-navbar-notif-row__avatarImg"
                            onError={handleAvatarImageError}
                          />
                        ) : (
                          <span className="public-navbar-notif-row__avatarLetter">
                            {actorInitials(item)}
                          </span>
                        )}
                      </span>
                      <div className="public-navbar-notif-row__body">
                        <p className="public-navbar-notif-row__msg">
                          {item.message}
                        </p>
                        <span className="public-navbar-notif-row__time">
                          {timeLabel}
                        </span>
                      </div>
                      {!item.isRead ? (
                        <span
                          className="public-navbar-notif-row__dot"
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      className={`public-navbar-notif-row public-navbar-notif-row--button${item.isRead ? "" : " public-navbar-notif-row--unread"}`}
                      onClick={() => void handleRowActivate(item)}>
                      <span
                        className="public-navbar-notif-row__avatar"
                        aria-hidden>
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="public-navbar-notif-row__avatarImg"
                            onError={handleAvatarImageError}
                          />
                        ) : (
                          <span className="public-navbar-notif-row__avatarLetter">
                            {actorInitials(item)}
                          </span>
                        )}
                      </span>
                      <div className="public-navbar-notif-row__body">
                        <p className="public-navbar-notif-row__msg">
                          {item.message}
                        </p>
                        <span className="public-navbar-notif-row__time">
                          {timeLabel}
                        </span>
                      </div>
                      {!item.isRead ? (
                        <span
                          className="public-navbar-notif-row__dot"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <Link
            className="public-navbar-messages-footer"
            to="/notifications"
            role="menuitem"
            onClick={() => onNavigate?.()}>
            {t("navbar.notificationsSeeAll", {
              defaultValue: "See all notifications",
            })}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
