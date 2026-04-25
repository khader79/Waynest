import { useEffect, useMemo, useState } from "react";
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
      toast.error("Failed to load saved plans");
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

  const openPlan = (planId) => {
    navigate(`/plan?planId=${encodeURIComponent(planId)}`);
  };

  const removePlan = async (planId) => {
    const confirmed = window.confirm("Delete this saved plan?");
    if (!confirmed) {
      return;
    }

    try {
      setWorkingId(planId);
      await deleteTripPlan(planId);
      setPlans((current) => current.filter((plan) => plan.id !== planId));
      toast.success("Plan deleted");
    } catch {
      toast.error("Failed to delete plan");
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

      if (!shareUrl || !isPublic) {
        const confirmed = window.confirm(
          "This will publish the plan publicly so it can be shared. Continue?",
        );
        if (!confirmed) {
          setWorkingId(null);
          return;
        }

        const response = await publishTripPlan(plan.id, {
          isPublic: true,
          title: plan.title ?? `Untitled Trip`,
          description: plan.description ?? undefined,
        });

        nextShareSlug = response.shareSlug ?? nextShareSlug;
        shareUrl = toLocalTripUrl(response.shareUrl, nextShareSlug);
        isPublic = response.isPublic ?? true;

        setPlans((current) =>
          current.map((item) =>
            item.id === plan.id
              ? { ...item, shareSlug: nextShareSlug, isPublic }
              : item,
          ),
        );
      }

      if (!shareUrl) {
        throw new Error("Share link unavailable");
      }

      const planLabel = formatTripPlanDisplayName(plan, t);
      const planCity = plan.cityName ?? plan.city?.name ?? plan.destination ?? "";

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
      toast.error("Failed to copy share link");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="saved-plans-page">
      <div className="saved-plans-head">
        <h1>Saved Plans</h1>
        <input
          type="search"
          placeholder="Search by title, city, or date..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="saved-plans-search"
        />
      </div>

      {loading ? (
        <div className="saved-plans-muted">Loading saved plans...</div>
      ) : filteredPlans.length === 0 ? (
        <div className="saved-plans-empty">
          <p>No saved plans found.</p>
          <button type="button" onClick={() => navigate("/plan")}>
            Create a new plan
          </button>
        </div>
      ) : (
        <div className="saved-plans-list">
          {filteredPlans.map((plan) => (
            <article key={plan.id} className="saved-plan-card">
              <div className="saved-plan-main">
                <h3>{formatTripPlanDisplayName(plan, t)}</h3>
                <p>
                  {plan.cityName ?? plan.city?.name ?? plan.destination ?? "—"}{" "}
                  · {plan.days} days · {plan.budget} ILS budget
                </p>
                <small>
                  Created: {new Date(plan.createdAt).toLocaleDateString()} |{" "}
                  {(plan.totalEstimatedCost ?? 0).toFixed(0)} ILS est.
                </small>
              </div>

              <div className="saved-plan-actions">
                <button type="button" onClick={() => openPlan(plan.id)}>
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => void sharePlan(plan)}
                  disabled={workingId === plan.id}
                >
                  Share/Copy
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => void removePlan(plan.id)}
                  disabled={workingId === plan.id}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default SavedPlans;
