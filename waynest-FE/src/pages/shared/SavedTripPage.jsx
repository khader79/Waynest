import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiEye,
  FiMapPin,
  FiShare2,
  FiUsers,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { fetchTripPlanById, publishTripPlan } from "@/api/trips";
import { getApiErrorMessage, getApiErrorStatus } from "@/utils/errors";
import { normalizeTripPlanDetail } from "@/utils/trips/dataNormalizers";
import "@/pages/guest/tripShare/PublicTripPage.css";

const SavedTripPage = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!planId) {
      setTrip(null);
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadTrip = async () => {
      try {
        setLoading(true);
        const payload = await fetchTripPlanById(planId);
        const nextTrip = normalizeTripPlanDetail(payload);

        if (!isActive) {
          return;
        }

        if (!nextTrip) {
          throw new Error("Invalid trip data");
        }

        setTrip(nextTrip);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (getApiErrorStatus(error) !== 404) {
          toast.error(getApiErrorMessage(error, "Failed to load trip"));
        }
        setTrip(null);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadTrip();
    return () => {
      isActive = false;
    };
  }, [planId]);

  const handleShare = async () => {
    if (!trip) {
      return;
    }

    try {
      setSharing(true);
      const response = await publishTripPlan(trip.id, {
        shareVisibility: "PUBLIC",
        title: trip.title,
        description: trip.description ?? undefined,
      });

      const shareSlug =
        typeof response?.shareSlug === "string" ? response.shareSlug : null;
      if (!shareSlug) {
        throw new Error("Missing share slug");
      }

      setTrip((current) =>
        current
          ? {
              ...current,
              isPublic: response?.isPublic ?? true,
              shareSlug,
              shareVisibility: response?.shareVisibility ?? "PUBLIC",
            }
          : current,
      );
      toast.success("Trip shared successfully");
      navigate(`/trip/${encodeURIComponent(shareSlug)}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to share trip"));
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="public-trip-page">
        <div className="public-trip-hero public-trip-loading">
          <div className="public-trip-shimmer title" />
          <div className="public-trip-shimmer subtitle" />
          <div className="public-trip-shimmer stat" />
          <div className="public-trip-shimmer stat" />
          <div className="public-trip-shimmer stat" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="public-trip-page">
        <section className="public-trip-empty">
          <Link to="/saved-plans" className="public-trip-back">
            <FiArrowLeft size={16} />
            Back to saved plans
          </Link>
          <h1>Trip not found</h1>
          <p>This saved itinerary is no longer available.</p>
          <div className="public-trip-empty-actions">
            <Link to="/saved-plans" className="btn-primary">
              View saved plans
            </Link>
            <Link to="/plan" className="btn-secondary">
              Plan a new trip
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="public-trip-page">
      <section className="public-trip-hero">
        <div className="public-trip-hero-copy">
          <Link to="/saved-plans" className="public-trip-back">
            <FiArrowLeft size={16} />
            Back to saved plans
          </Link>
          <span className="public-trip-badge">
            <FiEye size={14} />
            Saved itinerary
          </span>
          <h1>{trip.title}</h1>
          <p>
            {trip.description ??
              `${trip.days}-day trip to ${trip.cityName ?? "this destination"} saved to your Waynest account.`}
          </p>

          <div className="public-trip-meta">
            <div className="public-trip-meta-item">
              <FiMapPin />
              <span>{trip.cityName ?? "Unknown destination"}</span>
            </div>
            <div className="public-trip-meta-item">
              <FiCalendar />
              <span>{trip.days} days</span>
            </div>
            <div className="public-trip-meta-item">
              <FiUsers />
              <span>{trip.persons} traveler(s)</span>
            </div>
            <div className="public-trip-meta-item">
              <FiEye />
              <span>{trip.viewCount} views</span>
            </div>
          </div>

          <div className="public-trip-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                navigate(`/plan?planId=${encodeURIComponent(trip.id)}`)
              }>
              Open in planner
            </button>
            {!trip.shareSlug ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void handleShare()}
                disabled={sharing}>
                <FiShare2 size={16} />
                {sharing ? "Sharing..." : "Share trip"}
              </button>
            ) : null}
            {trip.shareSlug ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(`/trip/${trip.shareSlug}`)}>
                Open shared view
              </button>
            ) : null}
          </div>
        </div>

        <aside className="public-trip-stats">
          <div className="public-trip-stat">
            <span>Budget</span>
            <strong>{trip.budget.toFixed(0)} ILS</strong>
          </div>
          <div className="public-trip-stat">
            <span>Estimated total</span>
            <strong>
              {trip.generatedPlan.totalEstimatedCost.toFixed(0)} ILS
            </strong>
          </div>
          <div className="public-trip-stat">
            <span>Days planned</span>
            <strong>{trip.generatedPlan.days.length}</strong>
          </div>
        </aside>
      </section>

      <section className="public-trip-summary">
        <div className="public-trip-summary-card">
          <div className="public-trip-summary-heading">
            <h2>At a glance</h2>
            <span>{trip.generatedPlan.tips.length} tips included</span>
          </div>
          <div className="public-trip-summary-grid">
            <article>
              <span>Days</span>
              <strong>{trip.generatedPlan.days.length}</strong>
            </article>
            <article>
              <span>Budget</span>
              <strong>{trip.budget.toFixed(0)} ILS</strong>
            </article>
            <article>
              <span>Saved on</span>
              <strong>{new Date(trip.createdAt).toLocaleDateString()}</strong>
            </article>
          </div>
          <div className="public-trip-summary-footer">
            <FiClock />
            <span>Saved {new Date(trip.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </section>

      <section className="public-trip-days">
        {trip.generatedPlan.days.map((day) => (
          <article key={day.day} className="public-trip-day-card">
            <div className="public-trip-day-header">
              <div>
                <span className="public-trip-day-label">Day {day.day}</span>
                <h3>Plan for the day</h3>
              </div>
              <strong>{day.totalDayCost.toFixed(0)} ILS</strong>
            </div>
            <div className="public-trip-slot-grid">
              <SavedTripSlot label="Morning" slot={day.morning} />
              <SavedTripSlot label="Afternoon" slot={day.afternoon} />
              <SavedTripSlot label="Evening" slot={day.evening} />
            </div>
          </article>
        ))}
      </section>

      {trip.generatedPlan.tips.length > 0 ? (
        <section className="public-trip-tips">
          <div className="public-trip-summary-card">
            <h2>Tips</h2>
            <ul>
              {trip.generatedPlan.tips.map((tip, index) => (
                <li key={`${tip}-${index}`}>{tip}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
};

const SavedTripSlot = ({ label, slot }) => {
  const variant = label.toLowerCase();
  if (!slot) {
    return (
      <div className={`public-trip-slot empty ${variant}`}>
        <span className="public-trip-slot-label">{label}</span>
        <p>No suitable stop found</p>
      </div>
    );
  }

  return (
    <div className={`public-trip-slot ${variant}`}>
      <div className="public-trip-slot-header">
        <span className="public-trip-slot-label">{label}</span>
        <span className="public-trip-slot-duration">{slot.duration}</span>
      </div>
      <h4>{slot.name}</h4>
      {slot.type ? <span className="public-trip-slot-type">{slot.type}</span> : null}
      <div className="public-trip-slot-meta">
        <strong>{slot.estimatedCost.toFixed(0)} ILS</strong>
        {slot.openTime && slot.closeTime ? (
          <span>
            {slot.openTime} - {slot.closeTime}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default SavedTripPage;
