import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/core/providers/AuthContext";
import { getApiErrorMessage } from "@/core/utils/errors";
import { fetchGlobalMessages, fetchInbox } from "@/services/social/social.service";

type ContactRow = {
  conversationId: string;
  content: string;
  createdAt: string;
  unreadCount: number;
};

const RightSidebar = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<ContactRow[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setContacts([]);
      return;
    }

    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const [inboxRows, globalRows] = await Promise.all([
          fetchInbox(),
          fetchGlobalMessages({ limit: 10 }),
        ]);

        const inboxMap = new Map<string, number>(
          (Array.isArray(inboxRows) ? inboxRows : []).map((row: any) => [
            String(row.id ?? ""),
            Number(row.unreadCount ?? 0),
          ]),
        );

        const merged: ContactRow[] = (Array.isArray(globalRows) ? globalRows : []).map(
          (msg: any) => ({
            conversationId: String(msg.conversationId ?? ""),
            content: String(msg.content ?? ""),
            createdAt: String(msg.createdAt ?? new Date().toISOString()),
            unreadCount: inboxMap.get(String(msg.conversationId ?? "")) ?? 0,
          }),
        );

        if (active) {
          setContacts(merged.filter((c) => Boolean(c.conversationId)));
        }
      } catch (error) {
        if (active) {
          toast.error(
            getApiErrorMessage(
              error,
              t("sidebar.contactsLoadFailed", { defaultValue: "Could not load contacts." }),
            ),
          );
          setContacts([]);
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
  }, [isAuthenticated, t]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="fb3-card">
        <h3 className="fb3-cardTitle">{t("sidebar.birthdays", { defaultValue: "Birthdays" })}</h3>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", fontWeight: 800 }}>
          {t("sidebar.birthdaysPlaceholder", { defaultValue: "No birthdays today." })}
        </p>
      </div>

      <div className="fb3-card">
        <h3 className="fb3-cardTitle">{t("sidebar.contacts", { defaultValue: "Contacts" })}</h3>
        {loading ? (
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontWeight: 800 }}>
            {t("common.loading", { defaultValue: "Loading…" })}
          </p>
        ) : contacts.length === 0 ? (
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontWeight: 800 }}>
            {t("sidebar.contactsEmpty", { defaultValue: "No recent chats yet." })}
          </p>
        ) : (
          <ul className="fb3-contactList">
            {contacts.map((contact) => (
              <li key={contact.conversationId}>
                <Link
                  className="fb3-contactLink"
                  to={`/inbox/${encodeURIComponent(contact.conversationId)}`}>
                  <div className="fb3-contactSnippet">
                    <span>{contact.content.trim().slice(0, 44) || "…"}</span>
                    {contact.unreadCount > 0 ? (
                      <span className="fb3-unreadBadge">{contact.unreadCount}</span>
                    ) : null}
                  </div>
                  <small style={{ color: "var(--color-text-secondary)", fontWeight: 700 }}>
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;

