import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  createConversation,
  fetchInbox,
  fetchGlobalMessages,
} from "@/services/social/social.service";
import "./SocialFeed.css";

const InboxPage = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      conversationId: string;
      content: string;
      createdAt: string;
      senderId: string;
      unreadCount?: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const payload = await fetchInbox();
      const inboxRows = Array.isArray(payload) ? payload : [];

      const unreadByConversation = new Map(
        inboxRows.map((row: { id: string; unreadCount?: number }) => [row.id, row.unreadCount ?? 0]),
      );

      const global = await fetchGlobalMessages({ limit: 30 });
      const merged = (Array.isArray(global) ? global : []).map((msg) => ({
        ...msg,
        unreadCount: unreadByConversation.get(msg.conversationId) ?? 0,
      }));

      setMessages(merged);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.inbox.loadFailed", { defaultValue: "Failed to load inbox" }),
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
      <h1>{t("social.messages.title", { defaultValue: "Messages" })}</h1>
      <article className="social-composer">
        <h3>{t("social.inbox.startConversation", { defaultValue: "Start a conversation" })}</h3>
        <input
          type="text"
          placeholder={t("social.inbox.recipientId", { defaultValue: "Recipient user id" })}
          value={participantId}
          onChange={(event) => setParticipantId(event.target.value)}
        />
        <textarea
          placeholder={t("social.inbox.firstMessage", { defaultValue: "Your first message" })}
          value={firstMessage}
          onChange={(event) => setFirstMessage(event.target.value)}
        />
        <button
          type="button"
          disabled={creating || !participantId.trim() || !firstMessage.trim()}
          onClick={async () => {
            try {
              setCreating(true);
              await createConversation({
                participantIds: [participantId.trim()],
                firstMessage: firstMessage.trim(),
              });
              setParticipantId("");
              setFirstMessage("");
              toast.success(
                t("social.inbox.created", { defaultValue: "Conversation created" }),
              );
              await load();
            } catch (error) {
              toast.error(
                getApiErrorMessage(
                  error,
                  t("social.inbox.createFailed", {
                    defaultValue: "Failed to create conversation",
                  }),
                ),
              );
            } finally {
              setCreating(false);
            }
          }}>
          {creating
            ? t("social.inbox.creating", { defaultValue: "Creating..." })
            : t("social.inbox.createConversation", { defaultValue: "Create conversation" })}
        </button>
      </article>
      {loading ? (
        <p className="social-loading">
          {t("social.inbox.loading", { defaultValue: "Loading conversations..." })}
        </p>
      ) : messages.length === 0 ? (
        <p className="social-empty">
          {t("social.inbox.empty", { defaultValue: "No conversations yet." })}
        </p>
      ) : (
        <div className="social-post-list">
          {messages.map((row) => (
            <Link key={row.id} to={`/inbox/${row.conversationId}`} className="social-post-card">
              <strong>{row.content}</strong>
              <small>{new Date(row.createdAt).toLocaleString()}</small>
              {row.unreadCount && row.unreadCount > 0 ? (
                <span className="social-feed-header__btn" style={{ paddingInline: 10, minHeight: 28 }}>
                  {t("social.inbox.unreadCount", {
                    defaultValue: "Unread: {{count}}",
                    count: row.unreadCount ?? 0,
                  })}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default InboxPage;

