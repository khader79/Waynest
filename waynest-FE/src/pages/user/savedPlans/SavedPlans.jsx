import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useGlobalShare } from "@/context/GlobalShareContext";
import {
  fetchSavedTripPlans,
  deleteTripPlan,
  publishTripPlan,
} from "@/api/trips";
import { extractTripPlans } from "@/utils/trips/dataNormalizers";
import { formatTripPlanDisplayName } from "@/utils/trips/formatTripPlanDisplayName";
import { shareTripToCalendar } from "@/api/calendar";
import { fetchFriends } from "@/api/social";

import "./SavedPlans.css";

const buildShareUrl = (shareSlug) => {
  if (!shareSlug || typeof window === "undefined") {
    return "";
  }
  return `${window.location.origin}/trip/${shareSlug}`;
};

const toLocalTripUrl = (rawUrl, shareSlug) => {
  if (shareSlug) {
    return buildShareUrl(shareSlug);
  }
  if (!rawUrl || typeof window === "undefined") {
    return "";
  }
  try {
    const parsed = new URL(rawUrl);
    return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "";
  }
};

const SavedPlans = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openShare } = useGlobalShare();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [workingId, setWorkingId] = useState(null);
  const [calSharePlan, setCalSharePlan] = useState(null);
  const [calSearch, setCalSearch] = useState("");
  const [calFriends, setCalFriends] = useState([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calSelectedId, setCalSelectedId] = useState(null);
  const [calSharing, setCalSharing] = useState(false);
  const calTimerRef = useRef(null);

  const loadCalFriends = useCallback(async (q) => {
    try {
      setCalLoading(true);
      const list = await fetchFriends(q || "");
      setCalFriends(list);
    } catch {
      setCalFriends([]);
    } finally {
      setCalLoading(false);
    }
  }, []);

  const onCalSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setCalSearch(value);
      clearTimeout(calTimerRef.current);
      calTimerRef.current = setTimeout(() => loadCalFriends(value), 240);
    },
    [loadCalFriends],
  );

  const openCalShare = useCallback((plan) => {
    setCalSharePlan(plan);
    setCalSearch("");
    setCalFriends([]);
    setCalSelectedId(null);
    loadCalFriends("");
  }, [loadCalFriends]);

  const closeCalShare = useCallback(() => {
    setCalSharePlan(null);
    setCalSearch("");
    setCalFriends([]);
    setCalSelectedId(null);
  }, []);

  const confirmCalShare = useCallback(async () => {
    if (!calSharePlan || !calSelectedId) return;
    try {
      setCalSharing(true);
      await shareTripToCalendar(calSharePlan.id, calSelectedId);
      toast.success(t("toasts.savedPlans.tripSharedToCalendar"));
      closeCalShare();
    } catch {
      toast.error(t("toasts.savedPlans.failedToShareToCalendar"));
    } finally {
      setCalSharing(false);
    }
  }, [calSharePlan, calSelectedId, closeCalShare]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const payload = await fetchSavedTripPlans();
      const nextPlans = extractTripPlans(payload).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setPlans(nextPlans);
    } catch {
      toast.error(t("toasts.savedPlans.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return plans;
    }

    return plans.filter((plan) => {
      const label = formatTripPlanDisplayName(plan, t).toLowerCase();
      const city = (plan.cityName ?? plan.cityId ?? "").toLowerCase();
      const date = new Date(plan.createdAt).toLocaleDateString().toLowerCase();
      return label.includes(q) || city.includes(q) || date.includes(q);
    });
  }, [plans, search, t]);

  const openPlan = (plan) => {
    if (plan?.shareSlug) {
      navigate(`/trip/${encodeURIComponent(plan.shareSlug)}`);
      return;
    }

    navigate(`/saved-plans/${encodeURIComponent(plan.id)}`);
  };

  const removePlan = async (planId) => {
    const confirmed = window.confirm(t("savedPlans.confirmDelete"));
    if (!confirmed) {
      return;
    }

    try {
      setWorkingId(planId);
      await deleteTripPlan(planId);
      setPlans((current) => current.filter((plan) => plan.id !== planId));
      toast.success(t("toasts.savedPlans.planDeleted"));
    } catch {
      toast.error(t("toasts.savedPlans.failedToDeletePlan"));
    } finally {
      setWorkingId(null);
    }
  };

  const sharePlan = async (plan) => {
    try {
      setWorkingId(plan.id);
      let shareUrl = toLocalTripUrl(undefined, plan.shareSlug);
      let nextShareSlug = plan.shareSlug ?? null;
      let isPublic = Boolean(plan.isPublic);

      if (!shareUrl) {
        const confirmed = window.confirm(t("savedPlans.confirmShare"));
        if (!confirmed) {
          setWorkingId(null);
          return;
        }

        const response = await publishTripPlan(plan.id, {
          shareVisibility: "PUBLIC",
          title: plan.title ?? `Untitled Trip`,
          description: plan.description ?? undefined,
        });

        nextShareSlug = response.shareSlug ?? nextShareSlug;
        shareUrl = toLocalTripUrl(response.shareUrl, nextShareSlug);
        isPublic = response.isPublic ?? true;

        setPlans((current) =>
          current.map((item) =>
            item.id === plan.id
              ? {
                  ...item,
                  shareSlug: nextShareSlug,
                  isPublic,
                  shareVisibility: response.shareVisibility ?? "PUBLIC",
                }
              : item,
          ),
        );
      }

      if (!shareUrl) {
        throw new Error("Share link unavailable");
      }

      const planLabel = formatTripPlanDisplayName(plan, t);
      const planCity =
        plan.cityName ?? plan.city?.name ?? plan.destination ?? "";

      openShare({
        dialogTitle: t("tripPlanner.shareTrip", {
          defaultValue: "Share itinerary",
        }),
        title: plan.title?.trim() || planLabel,
        text: [planCity, `${plan.days} days`, `${plan.budget} ILS budget`]
          .filter(Boolean)
          .join(" · "),
        url: shareUrl,
      });
    } catch {
      toast.error(t("toasts.savedPlans.failedToCopyLink"));
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="saved-plans-page">
      <div className="saved-plans-head">
        <h1>{t("savedPlans.title")}</h1>
        <input
          type="search"
          placeholder={t("savedPlans.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="saved-plans-search"
        />
      </div>

      {loading ? (
        <div className="saved-plans-muted">{t("savedPlans.loading")}</div>
      ) : filteredPlans.length === 0 ? (
        <div className="saved-plans-empty">
          <p>{t("savedPlans.empty")}</p>
          <button type="button" onClick={() => navigate("/plan")}>
            {t("savedPlans.createNewPlan")}
          </button>
        </div>
      ) : (
        <div className="saved-plans-list">
          {filteredPlans.map((plan) => (
            <article key={plan.id} className="saved-plan-card">
              <div className="saved-plan-main">
                <h3>{formatTripPlanDisplayName(plan, t)}</h3>
                <p>
                  {t("savedPlans.cityDaysBudget", { city: plan.cityName ?? plan.city?.name ?? plan.destination ?? "—", days: plan.days, budget: plan.budget })}
                </p>
                <small>
                  {t("savedPlans.createdDate", { date: new Date(plan.createdAt).toLocaleDateString() })} |{" "}
                  {t("savedPlans.estimatedCost", { cost: (plan.totalEstimatedCost ?? 0).toFixed(0) })}
                </small>
              </div>

              <div className="saved-plan-actions">
                <button type="button" onClick={() => openPlan(plan)}>
                  {t("savedPlans.open")}
                </button>
                <button
                  type="button"
                  onClick={() => void sharePlan(plan)}
                  disabled={workingId === plan.id}>
                  {t("savedPlans.shareCopy")}
                </button>
                <button
                  type="button"
                  onClick={() => openCalShare(plan)}
                  disabled={workingId === plan.id || calSharing}>
                  {t("savedPlans.calendar")}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => void removePlan(plan.id)}
                  disabled={workingId === plan.id}>
                  {t("savedPlans.delete")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {calSharePlan && (
        <div className="cal-share-overlay" onClick={closeCalShare}>
          <div className="cal-share-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{t("savedPlans.shareToCalendarTitle")}</h3>
            <p className="cal-share-plan-name">
              {formatTripPlanDisplayName(calSharePlan, t)}
            </p>

            <input
              type="search"
              placeholder={t("savedPlans.searchFriendsPlaceholder")}
              value={calSearch}
              onChange={onCalSearchChange}
              className="cal-share-search"
              autoFocus
            />

            <div className="cal-share-list">
              {calLoading ? (
                <div className="cal-share-muted">{t("savedPlans.loadingFriends")}</div>
              ) : calFriends.length === 0 ? (
                <div className="cal-share-muted">{t("savedPlans.noFriends")}</div>
              ) : (
                calFriends.map((friend) => (
                  <div
                    key={friend.userId}
                    className={`cal-share-friend${calSelectedId === friend.userId ? " selected" : ""}`}
                    onClick={() => setCalSelectedId(friend.userId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setCalSelectedId(friend.userId);
                      }
                    }}>
                    <img
                      src={friend.avatarUrl || "/default-avatar.png"}
                      alt=""
                      className="cal-share-avatar"
                    />
                    <span>
                      {friend.firstName || friend.username || "Unknown"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="cal-share-actions">
              <button type="button" onClick={closeCalShare}>
                Cancel
              </button>
              <button
                type="button"
                className="cal-share-confirm"
                disabled={!calSelectedId || calSharing}
                onClick={confirmCalShare}>
                {calSharing ? "Sharing..." : "Share"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SavedPlans;
