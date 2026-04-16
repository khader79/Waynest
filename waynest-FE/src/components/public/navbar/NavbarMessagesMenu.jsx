import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiMessageCircle, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { fetchInbox } from "@/api/social";
import { getApiErrorMessage } from "@/utils/errors";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./NavbarMessagesMenu.css";

const PREVIEW_MAX = 72;
const LIST_LIMIT = 6;
const PREVIEW_IMAGE_REGEX = /\.(avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/i;

const sortByRecent = (rows) =>
  [...rows].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

const truncateOneLine = (text, max = PREVIEW_MAX) => {
  if (!text || typeof text !== "string") {
    return "";
  }
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
};

const getMessageImageUrl = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
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
      PREVIEW_IMAGE_REGEX.test(pathname)
    ) {
      return parsed.href;
    }
  } catch {
    if (PREVIEW_IMAGE_REGEX.test(resolved)) {
      return resolved;
    }
  }

  return null;
};

const conversationTitle = (conversation, currentUserId, fallback) => {
  if (conversation.isGroup) {
    return conversation.title?.trim() || fallback;
  }
  const peer = conversation.members?.find((m) => m.userId !== currentUserId);
  return (
    `${peer?.firstName ?? ""} ${peer?.lastName ?? ""}`.trim() ||
    peer?.username ||
    fallback
  );
};

export function NavbarMessagesMenu({ open, onToggle, onNavigate }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { enablePushNotifications } = useNotifications();
  const currentUserId = user?.id ?? user?.userId ?? "";
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
        const payload = await fetchInbox();

        if (!active) {
          return;
        }
        setRows(sortByRecent(Array.isArray(payload) ? payload : []));
      } catch (error) {
        if (active) {
          toast.error(
            getApiErrorMessage(
              error,
              t("social.inbox.loadFailed", {
                defaultValue: "Failed to load inbox",
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

  // Refresh inbox when a chat message arrives elsewhere in the app
  useEffect(() => {
    let active = true;
    const onChatMessage = async () => {
      try {
        const payload = await fetchInbox();

        if (!active) return;
        setRows(sortByRecent(Array.isArray(payload) ? payload : []));
      } catch (err) {
        // ignore - don't override existing state on failure
      }
    };

    window.addEventListener("chat:message", onChatMessage);
    return () => {
      active = false;
      window.removeEventListener("chat:message", onChatMessage);
    };
  }, []);

  const items = rows.slice(0, LIST_LIMIT);
  const totalUnread = rows.reduce(
    (sum, row) => sum + (Number(row.unreadCount) || 0),
    0,
  );

  return (
    <div className="public-navbar-messages">
      <button
        type="button"
        className="public-navbar-messages-trigger"
        onClick={() => {
          void enablePushNotifications();
          onToggle?.();
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("navbar.messagesMenu", { defaultValue: "Messages" })}
      >
        <FiMessageCircle className="public-navbar-messages-icon" aria-hidden />
        {totalUnread > 0 ? (
          <span className="public-navbar-messages-badge">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="public-navbar-messages-dropdown" role="menu">
          <div className="public-navbar-messages-head">
            <span>
              {t("navbar.messagesTitle", { defaultValue: "Messages" })}
            </span>
            <button
              type="button"
              className="public-navbar-messages-close"
              aria-label={t("common.close", { defaultValue: "Close" })}
              onClick={() => onToggle?.()}
            >
              <FiX aria-hidden />
            </button>
          </div>

          {loading && items.length === 0 ? (
            <p className="public-navbar-messages-empty">
              {t("common.loading", { defaultValue: "Loading…" })}
            </p>
          ) : null}

          {!loading && items.length === 0 ? (
            <p className="public-navbar-messages-empty">
              {t("navbar.messagesEmpty", {
                defaultValue:
                  "No conversations yet. Start one from the messenger.",
              })}
            </p>
          ) : null}

          <ul className="public-navbar-messages-list">
            {items.map((conversation) => {
              const isYou = conversation.initiatorId
                ? currentUserId === conversation.initiatorId
                : Array.isArray(conversation.members) &&
                  conversation.members.length === 1 &&
                  conversation.members[0]?.userId === currentUserId;
              const fallback = isYou
                ? t("sidebar.youLabel", { defaultValue: "You" })
                : t("sidebar.unknownLabel", { defaultValue: "Unknown" });
              const title = conversationTitle(
                conversation,
                currentUserId,
                fallback,
              );
              const previewImageUrl = getMessageImageUrl(
                conversation.lastMessage,
              );
              const preview = truncateOneLine(conversation.lastMessage);
              const unread = Number(conversation.unreadCount) || 0;

              return (
                <li key={conversation.id}>
                  <Link
                    role="menuitem"
                    className="public-navbar-messages-row"
                    to={`/social?conversation=${encodeURIComponent(conversation.id)}`}
                    onClick={() => onNavigate?.()}
                  >
                    <span className="public-navbar-messages-row-title">
                      <span className="public-navbar-messages-row-name">
                        {title}
                      </span>
                      {unread > 0 ? (
                        <span className="public-navbar-messages-row-unread">
                          {unread}
                        </span>
                      ) : null}
                    </span>
                    {previewImageUrl ? (
                      <span
                        className="public-navbar-messages-row-preview public-navbar-messages-row-preview--image"
                        title={t("navbar.imageMessage", {
                          defaultValue: "Photo",
                        })}
                      >
                        <img
                          src={previewImageUrl}
                          alt={t("navbar.imageMessageAlt", {
                            defaultValue: "Sent image",
                          })}
                          loading="lazy"
                        />
                      </span>
                    ) : preview ? (
                      <span
                        className="public-navbar-messages-row-preview"
                        title={preview}
                      >
                        {preview}
                      </span>
                    ) : (
                      <span className="public-navbar-messages-row-preview public-navbar-messages-row-preview--muted">
                        {t("navbar.noMessagesYet", {
                          defaultValue: "No messages yet",
                        })}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            className="public-navbar-messages-footer"
            to="/social"
            role="menuitem"
            onClick={() => onNavigate?.()}
          >
            {t("navbar.openAllMessages", { defaultValue: "Open messenger" })}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
