import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/utils/errors";
import { extractTripPlans } from "@/utils/trips/dataNormalizers";
import {
  fetchFriends,
  fetchIncomingFriendRequests } from

"@/api/social";
import { fetchSavedTripPlans } from "@/api/trips";


















const formatFriendName = (friend, fallback) =>
friend.firstName || friend.lastName ?
`${friend.firstName} ${friend.lastName}`.trim() :
friend.username || fallback;

const RightSidebar = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);

  const showPlans = user?.role === "USER";

  useEffect(() => {
    if (!isAuthenticated) {
      setFriends([]);
      return;
    }

    let active = true;
    void (async () => {
      try {
        setLoadingFriends(true);
        const payload = await fetchFriends();
        if (active) {
          setFriends((Array.isArray(payload) ? payload : []).slice(0, 8));
        }
      } catch (error) {
        if (active) {
          toast.error(
            getApiErrorMessage(
              error,
              t("sidebar.friendsLoadFailed", {
                defaultValue: "Could not load your friends list."
              })
            )
          );
          setFriends([]);
        }
      } finally {
        if (active) {
          setLoadingFriends(false);
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
                defaultValue: "Could not load connection requests."
              })
            )
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
        const normalized = extractTripPlans(payload).
        sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).
        slice(0, 3).
        map((plan) => ({
          id: plan.id,
          title:
          plan.title?.trim() ||
          t("tripPlanner.savedPlans", { defaultValue: "Saved plan" }),
          createdAt: plan.createdAt,
          days: plan.days,
          shareSlug: plan.shareSlug ?? null
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
                defaultValue: "Failed to load saved plans"
              })
            )
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="fb3-railList">
      <section className="fb3-card">
        <h3 className="fb3-cardTitle">
          {t("sidebar.friendsTitle", { defaultValue: "Your friends" })}
        </h3>
        {loadingFriends ?
        <p className="fb3-cardText">{t("common.loading", { defaultValue: "Loading…" })}</p> :
        friends.length === 0 ?
        <p className="fb3-cardText">
            {t("sidebar.friendsEmpty", {
            defaultValue: "Accepted traveler connections will appear here for faster messaging."
          })}
          </p> :

        <ul className="fb3-dataList">
            {friends.map((friend) =>
          <li key={friend.userId} className="fb3-dataRow">
                <div className="fb3-dataRowText">
                  <strong>{formatFriendName(friend, t("sidebar.travelerLabel", { defaultValue: "Traveler" }))}</strong>
                  <span>{friend.username ? `@${friend.username}` : friend.role}</span>
                </div>
                <Link
              to={`/social?compose=${encodeURIComponent(friend.userId)}`}
              className="fb3-inlineLink">
                  {t("sidebar.messageFriend", { defaultValue: "Message" })}
                </Link>
              </li>
          )}
          </ul>
        }
      </section>

      {requests.length > 0 || loadingRequests ?
      <section className="fb3-card">
          <h3 className="fb3-cardTitle">
            {t("sidebar.connectionRequests", { defaultValue: "Connection requests" })}
          </h3>
          {loadingRequests ?
        <p className="fb3-cardText">{t("common.loading", { defaultValue: "Loading…" })}</p> :

        <ul className="fb3-dataList">
              {requests.map((request) =>
          <li key={request.requesterId} className="fb3-dataRow">
                  <div className="fb3-dataRowText">
                    <strong>{request.username}</strong>
                    <span>
                      {request.firstName || request.lastName ?
                `${request.firstName} ${request.lastName}`.trim() :
                t("sidebar.travelerLabel", { defaultValue: "Traveler" })}
                    </span>
                  </div>
                  <Link
              to={`/u/${encodeURIComponent(request.username)}`}
              className="fb3-inlineLink">
                    {t("sidebar.review", { defaultValue: "Review" })}
                  </Link>
                </li>
          )}
            </ul>
        }
        </section> :
      null}

      {showPlans ?
      <section className="fb3-card fb3-card--accent">
          <span className="fb3-miniTag">
            {t("sidebar.aiPlanner", { defaultValue: "AI planner" })}
          </span>
          <h3 className="fb3-cardTitle">
            {t("sidebar.savedPlansTitle", { defaultValue: "Quick planner" })}
          </h3>
          {loadingPlans ?
        <p className="fb3-cardText">{t("common.loading", { defaultValue: "Loading…" })}</p> :
        savedPlans.length === 0 ?
        <>
              <p className="fb3-cardText">
                {t("sidebar.savedPlansEmpty", {
              defaultValue: "Your saved trips will appear here after you generate one."
            })}
              </p>
              <div className="fb3-railActions">
                <Link to="/plan" className="fb3-railLinkButton fb3-railLinkButton--accent">
                  {t("sidebar.aiPlannerCta", { defaultValue: "Start planner" })}
                </Link>
              </div>
            </> :

        <ul className="fb3-dataList">
              {savedPlans.map((plan) =>
          <li key={plan.id} className="fb3-dataRow">
                  <div className="fb3-dataRowText">
                    <strong>{plan.title}</strong>
                    <span>
                      {t("sidebar.planDays", {
                  defaultValue: "{{count}} days",
                  count: plan.days
                })}
                    </span>
                  </div>
                  <Link
              to={plan.shareSlug ? `/trip/${encodeURIComponent(plan.shareSlug)}` : "/saved-plans"}
              className="fb3-inlineLink">
                    {plan.shareSlug ?
              t("sidebar.viewSharedPlan", { defaultValue: "Open" }) :
              t("sidebar.managePlans", { defaultValue: "Manage" })}
                  </Link>
                </li>
          )}
            </ul>
        }
        </section> :
      null}
    </div>);

};

export default RightSidebar;