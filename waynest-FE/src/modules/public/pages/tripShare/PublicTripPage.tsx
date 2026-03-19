import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiCopy,
  FiEye,
  FiMapPin,
  FiShare2,
  FiUsers,
} from "react-icons/fi";
import { usePublicTripPage } from "../../hooks/usePublicTripPage";
import "./PublicTripPage.css";

const PublicTripPage = () => {
  const { copyLink, loading, remixTrip, remixing, trip } = usePublicTripPage();

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
          <Link to="/plan" className="public-trip-back">
            <FiArrowLeft size={16} />
            Back to planner
          </Link>
          <h1>Trip not found</h1>
          <p>
            This link is no longer available, or the trip has not been made
            public yet.
          </p>
          <div className="public-trip-empty-actions">
            <Link to="/plan" className="btn-primary">
              Plan a new trip
            </Link>
            <Link to="/explore" className="btn-secondary">
              Explore destinations
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
          <Link to="/plan" className="public-trip-back">
            <FiArrowLeft size={16} />
            Back to planner
          </Link>
          <span className="public-trip-badge">
            <FiShare2 size={14} />
            Public itinerary
          </span>
          <h1>{trip.title}</h1>
          <p>
            {trip.description ??
              `${trip.days}-day trip to ${trip.cityName ?? "this destination"} designed to be shared, saved, and remixed.`}
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
              onClick={() => void remixTrip()}
              disabled={remixing}>
              {remixing ? "Loading..." : "Copy my trip"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void copyLink()}>
              <FiCopy size={16} />
              Copy link
            </button>
          </div>
        </div>

        <aside className="public-trip-stats">
          <div className="public-trip-stat">
            <span>Budget</span>
            <strong>{trip.budget.toFixed(0)} ILS</strong>
          </div>
          <div className="public-trip-stat">
            <span>Estimated total</span>
            <strong>{trip.generatedPlan.totalEstimatedCost.toFixed(0)} ILS</strong>
          </div>
          <div className="public-trip-stat">
            <span>Public slug</span>
            <strong>{trip.shareSlug}</strong>
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
              <span>View count</span>
              <strong>{trip.viewCount}</strong>
            </article>
          </div>
          <div className="public-trip-summary-footer">
            <FiClock />
            <span>Opened {new Date(trip.createdAt).toLocaleDateString()}</span>
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
              <PublicTripSlot label="Morning" slot={day.morning} />
              <PublicTripSlot label="Afternoon" slot={day.afternoon} />
              <PublicTripSlot label="Evening" slot={day.evening} />
            </div>
          </article>
        ))}
      </section>

      {trip.generatedPlan.tips.length > 0 && (
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
      )}
    </div>
  );
};

type PublicTripSlotProps = {
  label: string;
  slot: {
    duration: string;
    estimatedCost: number;
    name: string;
    type?: string;
    openTime?: string;
    closeTime?: string;
  } | null;
};

const PublicTripSlot = ({ label, slot }: PublicTripSlotProps) => {
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
      {slot.type && <span className="public-trip-slot-type">{slot.type}</span>}
      <div className="public-trip-slot-meta">
        <strong>{slot.estimatedCost.toFixed(0)} ILS</strong>
        {slot.openTime && slot.closeTime && (
          <span>
            {slot.openTime} - {slot.closeTime}
          </span>
        )}
      </div>
    </div>
  );
};

export default PublicTripPage;
