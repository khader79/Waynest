import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  fetchConversationMessages,
  markConversationRead,
  sendMessage,
} from "@/services/social/social.service";
import "./SocialFeed.css";

const ConversationPage = () => {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const [messages, setMessages] = useState<Array<{ id: string; content: string; createdAt: string; senderId: string }>>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async (showToast = true) => {
    try {
      setLoadError(false);
      const payload = await fetchConversationMessages(id);
      setMessages(Array.isArray(payload) ? payload : []);
      await markConversationRead(id);
    } catch (error) {
      setLoadError(true);
      if (showToast) {
        toast.error(
          getApiErrorMessage(
            error,
            t("social.conversation.loadFailed", { defaultValue: "Failed to load conversation" }),
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load(false);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [id]);

  return (
    <section className="social-feed-page">
      <h1>{t("social.conversation.title", { defaultValue: "Conversation" })}</h1>
      {loading ? (
        <p className="social-loading">
          {t("social.conversation.loading", { defaultValue: "Loading messages..." })}
        </p>
      ) : null}
      {!loading && loadError ? (
        <p className="social-empty">
          {t("social.conversation.error", {
            defaultValue: "Could not load messages right now. Please try again.",
          })}
        </p>
      ) : null}
      {!loading && !loadError && messages.length === 0 ? (
        <p className="social-empty">
          {t("social.conversation.empty", { defaultValue: "No messages yet." })}
        </p>
      ) : null}
      {!loading && !loadError && messages.length > 0 ? (
        <div className="social-post-list">
          {messages.map((message) => (
            <article key={message.id} className="social-post-card">
              <p>{message.content}</p>
              <small>{new Date(message.createdAt).toLocaleString()}</small>
            </article>
          ))}
        </div>
      ) : null}
      <article className="social-composer">
        <textarea
          placeholder={t("social.conversation.placeholder", {
            defaultValue: "Write a message...",
          })}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <button
          type="button"
          disabled={sending || !content.trim()}
          onClick={async () => {
            if (!content.trim()) {
              return;
            }
            const optimisticContent = content.trim();
            const optimisticMessage = {
              id: `tmp-${Date.now()}`,
              content: optimisticContent,
              createdAt: new Date().toISOString(),
              senderId: "me",
            };
            try {
              setSending(true);
              setMessages((current) => [...current, optimisticMessage]);
              setContent("");
              await sendMessage(id, optimisticContent);
              await load(false);
            } catch (error) {
              setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
              setContent(optimisticContent);
              toast.error(
                getApiErrorMessage(
                  error,
                  t("social.conversation.sendFailed", { defaultValue: "Failed to send message" }),
                ),
              );
            } finally {
              setSending(false);
            }
          }}>
          {sending
            ? t("social.conversation.sending", { defaultValue: "Sending..." })
            : t("social.conversation.send", { defaultValue: "Send" })}
        </button>
      </article>
    </section>
  );
};

export default ConversationPage;

