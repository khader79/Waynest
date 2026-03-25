import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/core/providers/AuthContext";
import { getApiErrorMessage } from "@/core/utils/errors";
import { extractTripPlans } from "@/features/trip-planner/utils/dataNormalizers";
import {
  fetchGlobalMessages,
  fetchInbox,
  fetchIncomingFriendRequests,
} from "@/services/social/social.service";
import { fetchSavedTripPlans } from "@/services/tripPlanner/tripPlanner.service";

type ContactRow = {
  conversationId: string;
  content: string;
  createdAt: string;
  unreadCount: number;
};

type IncomingRequest = {
  requesterId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  requestedAt: string;
};

type SavedPlanCard = {
  id: string;
  title: string;
  createdAt: string;
  days: number;
  shareSlug: string | null;
};

const RightSidebar = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlanCard[]>([]);

  const showPlans = user?.role === "USER";

  useEffect(() => {
    if (!isAuthenticated) {
      setContacts([]);
      return;
    }

    let active = true;

    void (async () => {
      try {
        setLoadingContacts(true);
        const [inboxRows, globalRows] = await Promise.all([
          fetchInbox(),
          fetchGlobalMessages({ limit: 8 }),
        ]);

        const inboxMap = new Map<string, number>(
          (Array.isArray(inboxRows) ? inboxRows : []).map((row) => [
            String(row.id ?? ""),
            Number(row.unreadCount ?? 0),
          ]),
        );

        const merged: ContactRow[] = (Array.isArray(globalRows) ? globalRows : []).map(
          (message) => ({
            conversationId: String(message.conversationId ?? ""),
            content: String(message.content ?? ""),
            createdAt: String(message.createdAt ?? new Date().toISOString()),
            unreadCount: inboxMap.get(String(message.conversationId ?? "")) ?? 0,
          }),
        );

        if (active) {
          setContacts(
            merged
              .filter((contact) => Boolean(contact.conversationId))
              .slice(0, 5),
          );
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
          setLoadingContacts(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated, t]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRequests([]);
      return;
    }

    let active = true;
    void (async () => {
      try {
        setLoadingRequests(true);
        const payload = await fetchIncomingFriendRequests();
        if (active) {
          setRequests((Array.isArray(payload) ? payload : []).slice(0, 4));
        }
      } catch (error) {
        if (active) {
          toast.error(
            getApiErrorMessage(
              error,
              t("sidebar.requestsLoadFailed", {
                defaultValue: "Could not load connection requests.",
              }),
            ),
          );
          setRequests([]);
        }
      } finally {
        if (active) {
          setLoadingRequests(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated, t]);

  useEffect(() => {
    if (!showPlans) {
      setSavedPlans([]);
      return;
    }

    let active = true;
    void (async () => {
      try {
        setLoadingPlans(true);
        const payload = await fetchSavedTripPlans();
        const normalized = extractTripPlans(payload)
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
          .slice(0, 3)
          .map((plan) => ({
            id: plan.id,
            title:
              plan.title?.trim() ||
              t("tripPlanner.savedPlans", { defaultValue: "Saved plan" }),
            createdAt: plan.createdAt,
            days: plan.days,
            shareSlug: plan.shareSlug ?? null,
          }));

        if (active) {
          setSavedPlans(normalized);
        }
      } catch (error) {
        if (active) {
          toast.error(
            getApiErrorMessage(
              error,
              t("social.feed.savedPlansLoadFailed", {
                defaultValue: "Failed to load saved plans",
              }),
            ),
          );
          setSavedPlans([]);
        }
      } finally {
        if (active) {
          setLoadingPlans(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [showPlans, t]);

  const hasNetworkData = useMemo(
    () => requests.length > 0 || contacts.length > 0,
    [contacts.length, requests.length],
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="fb3-railList">
      {showPlans ? (
        <section className="fb3-card fb3-card--accent">
          <span className="fb3-miniTag">
            {t("sidebar.aiPlanner", { defaultValue: "AI planner" })}
          </span>
          <h3 className="fb3-cardTitle">
            {t("sidebar.savedPlansTitle", { defaultValue: "Quick planner" })}
          </h3>
          {loadingPlans ? (
            <p className="fb3-cardText">{t("common.loading", { defaultValue: "Loading…" })}</p>
          ) : savedPlans.length === 0 ? (
            <>
              <p className="fb3-cardText">
                {t("sidebar.savedPlansEmpty", {
                  defaultValue: "Your saved trips will appear here after you generate one.",
                })}
              </p>
              <div className="fb3-railActions">
                <Link to="/plan" className="fb3-railLinkButton fb3-railLinkButton--accent">
                  {t("sidebar.aiPlannerCta", { defaultValue: "Start planner" })}
                </Link>
              </div>
            </>
          ) : (
            <ul className="fb3-dataList">
              {savedPlans.map((plan) => (
                <li key={plan.id} className="fb3-dataRow">
                  <div className="fb3-dataRowText">
                    <strong>{plan.title}</strong>
                    <span>
                      {t("sidebar.planDays", {
                        defaultValue: "{{count}} days",
                        count: plan.days,
                      })}
                    </span>
                  </div>
                  <Link
                    to={plan.shareSlug ? `/trip/${encodeURIComponent(plan.shareSlug)}` : "/saved-plans"}
                    className="fb3-inlineLink">
                    {plan.shareSlug
                      ? t("sidebar.viewSharedPlan", { defaultValue: "Open" })
                      : t("sidebar.managePlans", { defaultValue: "Manage" })}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {requests.length > 0 || loadingRequests ? (
        <section className="fb3-card">
          <h3 className="fb3-cardTitle">
            {t("sidebar.connectionRequests", { defaultValue: "Connection requests" })}
          </h3>
          {loadingRequests ? (
            <p className="fb3-cardText">{t("common.loading", { defaultValue: "Loading…" })}</p>
          ) : (
            <ul className="fb3-dataList">
              {requests.map((request) => (
                <li key={request.requesterId} className="fb3-dataRow">
                  <div className="fb3-dataRowText">
                    <strong>{request.username}</strong>
                    <span>
                      {request.firstName || request.lastName
                        ? `${request.firstName} ${request.lastName}`.trim()
                        : t("sidebar.travelerLabel", { defaultValue: "Traveler" })}
                    </span>
                  </div>
                  <Link
                    to={`/u/${encodeURIComponent(request.username)}`}
                    className="fb3-inlineLink">
                    {t("sidebar.review", { defaultValue: "Review" })}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="fb3-card">
        <h3 className="fb3-cardTitle">
          {t("sidebar.contacts", { defaultValue: "Recent conversations" })}
        </h3>
        {loadingContacts ? (
          <p className="fb3-cardText">{t("common.loading", { defaultValue: "Loading…" })}</p>
        ) : contacts.length === 0 ? (
          <p className="fb3-cardText">
            {hasNetworkData
              ? t("sidebar.contactsEmpty", { defaultValue: "No recent chats yet." })
              : t("sidebar.networkQuiet", {
                  defaultValue: "When people message you or send requests, the activity will show here.",
                })}
          </p>
        ) : (
          <ul className="fb3-contactList">
            {contacts.map((contact) => (
              <li key={contact.conversationId}>
                <Link
                  className="fb3-contactLink"
                  to={`/inbox/${encodeURIComponent(contact.conversationId)}`}>
                  <div className="fb3-contactSnippet">
                    <span>{contact.content.trim().slice(0, 48) || "…"}</span>
                    {contact.unreadCount > 0 ? (
                      <span className="fb3-unreadBadge">{contact.unreadCount}</span>
                    ) : null}
                  </div>
                  <small className="fb3-contactDate">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default RightSidebar;
