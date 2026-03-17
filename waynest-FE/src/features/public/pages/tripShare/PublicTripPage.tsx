import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
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
import { get } from "../../../../api/apiService";
import { TRIP_PLANNER_ENDPOINTS } from "../../../../api/endpoints";
import type {
  ITripSlot,
  TripRemixDraft,
} from "../../../../types/tripPlanner";
import "./PublicTripPage.css";

type TripSlotValue = ITripSlot | null;

type TripDayView = {
  day: number;
  morning: TripSlotValue;
  afternoon: TripSlotValue;
  evening: TripSlotValue;
  totalDayCost: number;
};

type PublicTripView = {
  id: string;
  shareSlug: string;
  isPublic: boolean;
  title: string;
  description: string | null;
  cityId: string;
  cityName: string | null;
  days: number;
  budget: number;
  persons: number;
  generatedPlan: {
    days: TripDayView[];
    totalEstimatedCost: number;
    tips: string[];
  };
  viewCount: number;
  createdAt: string;
};

const STORAGE_KEY_REMIX = "waynest_trip_remix_draft";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeNumber = (value: unknown, fallback = 0) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeSlot = (value: unknown): TripSlotValue => {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name : "";
  const duration = typeof value.duration === "string" ? value.duration : "";
  if (!name || !duration) return null;
  return {
    placeId: typeof value.placeId === "string" ? value.placeId : undefined,
    name,
    type: typeof value.type === "string" ? value.type : undefined,
    duration,
    estimatedCost: normalizeNumber(value.estimatedCost, 0),
    openTime: typeof value.openTime === "string" ? value.openTime : undefined,
    closeTime: typeof value.closeTime === "string" ? value.closeTime : undefined,
  };
};

const normalizeDay = (value: unknown, index: number): TripDayView | null => {
  if (!isRecord(value)) return null;
  const day = typeof value.day === "number" ? value.day : index + 1;
  return {
    day,
    morning: normalizeSlot(value.morning),
    afternoon: normalizeSlot(value.afternoon),
    evening: normalizeSlot(value.evening),
    totalDayCost: normalizeNumber(value.totalDayCost, 0),
  };
};

const normalizePublicTrip = (value: unknown): PublicTripView | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string") return null;
  if (typeof value.shareSlug !== "string") return null;
  if (!isRecord(value.generatedPlan)) return null;

  const generatedPlan = value.generatedPlan as Record<string, unknown>;
  const daysRaw = Array.isArray(generatedPlan.days) ? generatedPlan.days : [];
  const days = daysRaw
    .map((day, index) => normalizeDay(day, index))
    .filter((day): day is TripDayView => day !== null);

  return {
    id: value.id,
    shareSlug: value.shareSlug,
    isPublic: Boolean(value.isPublic),
    title:
      typeof value.title === "string" && value.title.trim().length > 0
        ? value.title
        : `Trip to ${typeof value.cityName === "string" ? value.cityName : "Waynest"}`,
    description:
      typeof value.description === "string" ? value.description : null,
    cityId: typeof value.cityId === "string" ? value.cityId : "",
    cityName:
      typeof value.cityName === "string" && value.cityName.trim().length > 0
        ? value.cityName
        : null,
    days: normalizeNumber(value.days, days.length || 0),
    budget: normalizeNumber(value.budget, 0),
    persons: normalizeNumber(value.persons, 0),
    generatedPlan: {
      days,
      totalEstimatedCost: normalizeNumber(generatedPlan.totalEstimatedCost, 0),
      tips: Array.isArray(generatedPlan.tips)
        ? generatedPlan.tips.filter((tip): tip is string => typeof tip === "string")
        : [],
    },
    viewCount: normalizeNumber(value.viewCount, 0),
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) return undefined;
  const response = error.response;
  if (!isRecord(response)) return undefined;
  return typeof response.status === "number" ? response.status : undefined;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isRecord(error)) {
    const response = error.response;
    if (isRecord(response) && isRecord(response.data)) {
      const message = response.data.message;
      if (typeof message === "string") return message;
    }
  }
  return fallback;
};

const copyToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("input");
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
};

const PublicTripPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<PublicTripView | null>(null);
  const [loading, setLoading] = useState(true);
  const [remixing, setRemixing] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setTrip(null);
      return;
    }

    let active = true;

    const loadTrip = async () => {
      try {
        setLoading(true);
        const data = await get(TRIP_PLANNER_ENDPOINTS.PUBLIC(slug));
        const normalized = normalizePublicTrip(data);
        if (!active) return;
        if (!normalized) {
          throw new Error("Invalid trip data");
        }
        setTrip(normalized);
      } catch (error) {
        if (!active) return;
        const status = getErrorStatus(error);
        if (status === 404) {
          setTrip(null);
        } else {
          toast.error(getErrorMessage(error, "Failed to load trip"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadTrip();

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!trip || typeof window === "undefined") return;

    const metaTitle = `${trip.title} | Waynest`;
    const metaDescription =
      trip.description ??
      `${trip.days}-day travel plan for ${trip.cityName ?? "your next trip"}.`;
    const canonicalUrl = `${window.location.origin}/trip/${trip.shareSlug}`;
    const apiBase = (import.meta.env.VITE_API_URL || window.location.origin)
      .trim()
      .replace(/\/+$/, "");
    const ogImage = `${apiBase}${TRIP_PLANNER_ENDPOINTS.PUBLIC_OG_IMAGE(
      trip.shareSlug,
    )}`;

    document.title = metaTitle;

    const upsertMeta = (
      attr: "name" | "property",
      key: string,
      value: string,
    ) => {
      let tag = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${key}"]`,
      );
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", value);
    };

    const upsertLink = (rel: string, href: string) => {
      let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!tag) {
        tag = document.createElement("link");
        tag.setAttribute("rel", rel);
        document.head.appendChild(tag);
      }
      tag.setAttribute("href", href);
    };

    upsertMeta("name", "description", metaDescription);
    upsertMeta("property", "og:title", metaTitle);
    upsertMeta("property", "og:description", metaDescription);
    upsertMeta("property", "og:type", "article");
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", metaTitle);
    upsertMeta("name", "twitter:description", metaDescription);
    upsertMeta("name", "twitter:image", ogImage);
    upsertLink("canonical", canonicalUrl);
  }, [trip]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !trip?.shareSlug) return "";
    return `${window.location.origin}/trip/${trip.shareSlug}`;
  }, [trip?.shareSlug]);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await copyToClipboard(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleRemixTrip = async () => {
    if (!trip) return;
    try {
      setRemixing(true);
      const draft: TripRemixDraft = {
        cityId: trip.cityId,
        days: trip.days,
        budget: trip.budget,
        persons: trip.persons,
        sourceSlug: trip.shareSlug,
        sourceTitle: trip.title,
        sourceDescription: trip.description,
      };
      localStorage.setItem(STORAGE_KEY_REMIX, JSON.stringify(draft));
      navigate("/plan");
    } catch {
      toast.error("Failed to load draft");
    } finally {
      setRemixing(false);
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
              onClick={() => void handleRemixTrip()}
              disabled={remixing}>
              {remixing ? "Loading..." : "Copy my trip"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleCopyLink()}>
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
  slot: TripSlotValue;
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
