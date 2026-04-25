import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCompass,
  FiCpu,
  FiGlobe,
  FiLogIn,
  FiMap,
  FiMapPin,
  FiShare2,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import VerifiedBadge from "@/components/common/VerifiedBadge/VerifiedBadge";
import {
  fetchLandingStats,
  fetchPublicEvents,
  fetchPublicPlaces,
} from "@/api/catalog";
import { fetchPublicTripBrowse } from "@/api/trips";
import { getResolvedPlaceImageUrl, pickPlaceImageField } from "@/utils/placeImage";
import "./LandingPage.css";

const DIFFERENTIATORS = [
  {
    icon: FiCpu,
    title: "AI that plans with real inputs",
    description:
      "Waynest builds routes from your destination, group size, budget, interests, place pricing, and opening hours.",
  },
  {
    icon: FiCompass,
    title: "Usable from the first click",
    description:
      "Guests can explore, generate a trip, and understand the flow immediately without complex setup.",
  },
  {
    icon: FiShare2,
    title: "Travel as a social experience",
    description:
      "Turn private planning into shareable routes that other travelers can view, copy, and remix.",
  },
];

const PLANNER_STEPS = [
  {
    title: "Set the destination",
    description: "Pick the country, city, trip length, and traveler count.",
  },
  {
    title: "Give the AI context",
    description: "Add budget, currency, and interests so the route fits your style.",
  },
  {
    title: "Review a real route",
    description: "Get a day-by-day itinerary backed by places, costs, hours, and events.",
  },
];

const extractRows = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const extractPlaces = (payload) =>
  extractRows(payload)
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      name: String(item.name ?? "").trim(),
      cityName: item.city?.name ? String(item.city.name).trim() : "",
      description: String(item.description ?? "").trim(),
      imageUrl: pickPlaceImageField(item),
      isVerified: Boolean(item.isVerified),
      slug: typeof item.slug === "string" ? item.slug : null,
      type: typeof item.type === "string" ? item.type : "Place",
    }))
    .filter((place) => place.id && place.name);

const extractEvents = (payload) =>
  extractRows(payload)
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const venue =
        item.venue && typeof item.venue === "object" ? item.venue : null;
      const venueCity =
        venue?.city && typeof venue.city === "object" ? venue.city : null;

      return {
        id: String(item.id ?? ""),
        title: String(item.title ?? "").trim(),
        startDate:
          typeof item.startDate === "string" ? item.startDate : undefined,
        venueName:
          typeof venueCity?.name === "string"
            ? venueCity.name
            : typeof venue?.name === "string"
              ? venue.name
              : "Event venue",
        slug: typeof item.slug === "string" ? item.slug : null,
      };
    })
    .filter((event) => event.id && event.title);

const extractTrips = (payload) => {
  const rows = Array.isArray(payload?.items) ? payload.items : [];

  return rows
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      createdAt: item.createdAt,
      shareSlug: String(item.shareSlug ?? ""),
      title: typeof item.title === "string" ? item.title.trim() : "",
      username: typeof item.username === "string" ? item.username.trim() : "",
    }))
    .filter((trip) => trip.shareSlug);
};

const formatStatValue = (value) => {
  if (!Number.isFinite(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const formatDate = (value) => {
  if (!value) {
    return "Open details";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Open details";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function LandingPage() {
  const [landingStats, setLandingStats] = useState(null);
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [publicTrips, setPublicTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failedPlaceImages, setFailedPlaceImages] = useState({});

  useEffect(() => {
    let active = true;

    const loadLanding = async () => {
      setLoading(true);

      const [statsResult, placesResult, eventsResult, tripsResult] =
        await Promise.allSettled([
          fetchLandingStats(),
          fetchPublicPlaces(6),
          fetchPublicEvents(4),
          fetchPublicTripBrowse(4),
        ]);

      if (!active) {
        return;
      }

      setLandingStats(
        statsResult.status === "fulfilled" ? statsResult.value : null,
      );
      setPlaces(
        placesResult.status === "fulfilled"
          ? extractPlaces(placesResult.value).slice(0, 6)
          : [],
      );
      setEvents(
        eventsResult.status === "fulfilled"
          ? extractEvents(eventsResult.value)
              .sort((left, right) => {
                const leftTime = left.startDate
                  ? new Date(left.startDate).getTime()
                  : Infinity;
                const rightTime = right.startDate
                  ? new Date(right.startDate).getTime()
                  : Infinity;

                return leftTime - rightTime;
              })
              .slice(0, 4)
          : [],
      );
      setPublicTrips(
        tripsResult.status === "fulfilled"
          ? extractTrips(tripsResult.value).slice(0, 4)
          : [],
      );
      setLoading(false);
    };

    void loadLanding();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        icon: FiUsers,
        label: "Active travelers",
        value: loading ? "—" : formatStatValue(landingStats?.usersCount),
      },
      {
        icon: FiMapPin,
        label: "Live places",
        value: loading ? "—" : formatStatValue(landingStats?.placesCount),
      },
      {
        icon: FiGlobe,
        label: "Countries",
        value: loading ? "—" : formatStatValue(landingStats?.countriesCount),
      },
      {
        icon: FiMap,
        label: "Shared routes",
        value: loading ? "—" : formatStatValue(landingStats?.publicPlansCount),
      },
    ],
    [landingStats, loading],
  );

  return (
    <div className="lp-root">
      <div className="lp-shell">
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <span className="lp-badge">
              <FiCheckCircle aria-hidden="true" />
              AI travel system with real catalog data
            </span>

            <h1 className="lp-hero-title">
              The travel planner that feels smart, clear, and instantly useful.
            </h1>

            <p className="lp-hero-subtitle">
              Waynest turns destination, budget, travelers, interests, places,
              opening hours, and public events into an editable route that
              makes sense from the first screen.
            </p>

            <div className="lp-hero-actions">
              <Link to="/plan" className="lp-btn lp-btn-primary">
                <FiCompass aria-hidden="true" />
                Start the AI planner
              </Link>
              <Link to="/explore" className="lp-btn lp-btn-secondary">
                <FiMapPin aria-hidden="true" />
                Explore live places
              </Link>
              <Link to="/register" className="lp-text-link">
                Create account
                <FiArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div className="lp-microproof">
              <div className="lp-microproof-item">
                <FiClock aria-hidden="true" />
                <span>Fast guest flow with no setup wall</span>
              </div>
              <div className="lp-microproof-item">
                <FiCpu aria-hidden="true" />
                <span>AI route logic explained, not hidden</span>
              </div>
              <div className="lp-microproof-item">
                <FiShare2 aria-hidden="true" />
                <span>Designed for planning, sharing, and remixing</span>
              </div>
            </div>
          </div>

          <div className="lp-hero-visual">
            <div className="lp-visual-card lp-visual-card-primary">
              <div className="lp-visual-header">
                <span className="lp-visual-kicker">AI route engine</span>
                <strong>What Waynest actually analyzes</strong>
              </div>

              <div className="lp-visual-list">
                <div className="lp-visual-list-item">
                  <span className="lp-visual-dot" />
                  Destination, city, and trip length
                </div>
                <div className="lp-visual-list-item">
                  <span className="lp-visual-dot" />
                  Group size, budget, and selected currency
                </div>
                <div className="lp-visual-list-item">
                  <span className="lp-visual-dot" />
                  Interest tags, places, pricing, and opening hours
                </div>
                <div className="lp-visual-list-item">
                  <span className="lp-visual-dot" />
                  Matching events and share-ready route structure
                </div>
              </div>
            </div>

            <div className="lp-visual-card lp-visual-card-output">
              <div className="lp-visual-header">
                <span className="lp-visual-kicker">Sample output</span>
                <strong>Day-by-day route preview</strong>
              </div>

              <div className="lp-output-day">
                <span className="lp-output-day-label">Day 1</span>
                <div className="lp-output-slot">
                  <label>Morning</label>
                  <strong>Signature landmark + breakfast stop</strong>
                </div>
                <div className="lp-output-slot">
                  <label>Afternoon</label>
                  <strong>Budget-aware activity with real opening hours</strong>
                </div>
                <div className="lp-output-slot">
                  <label>Evening</label>
                  <strong>Event match or local dining recommendation</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-stat-strip" aria-label="Waynest platform stats">
          {stats.map((stat) => (
            <article key={stat.label} className="lp-stat-card">
              <span className="lp-stat-icon">
                <stat.icon aria-hidden="true" />
              </span>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <span className="lp-section-eyebrow">Why it stands out</span>
            <h2>Built to feel different from generic travel tools</h2>
            <p>
              The value is clear at a glance: AI planning, live destination
              data, and a social layer that makes routes reusable.
            </p>
          </div>

          <div className="lp-feature-grid">
            {DIFFERENTIATORS.map((item) => (
              <article key={item.title} className="lp-feature-card">
                <span className="lp-feature-icon">
                  <item.icon aria-hidden="true" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-section-surface">
          <div className="lp-section-head lp-section-head-row">
            <div>
              <span className="lp-section-eyebrow">Planner flow</span>
              <h2>Simple enough for anyone to use</h2>
            </div>
            <Link to="/plan" className="lp-text-link">
              Open the planner
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div className="lp-step-grid">
            {PLANNER_STEPS.map((step, index) => (
              <article key={step.title} className="lp-step-card">
                <span className="lp-step-index">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head lp-section-head-row">
            <div>
              <span className="lp-section-eyebrow">Featured places</span>
              <h2>Real destinations users can explore right now</h2>
            </div>
            <Link to="/explore" className="lp-text-link">
              Explore all places
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <div className="lp-empty">Loading destination highlights...</div>
          ) : places.length === 0 ? (
            <div className="lp-empty">No featured places are available yet.</div>
          ) : (
            <div className="lp-place-grid">
              {places.map((place) => {
                const imageUrl = getResolvedPlaceImageUrl(place.imageUrl);
                const showImage =
                  Boolean(imageUrl) && failedPlaceImages[place.id] !== true;

                return (
                  <Link
                    key={place.id}
                    to={`/places/${encodeURIComponent(place.slug?.trim() ? place.slug : place.id)}`}
                    className="lp-place-card">
                    {showImage ? (
                      <img
                        src={imageUrl ?? ""}
                        alt={place.name}
                        className="lp-place-media"
                        onError={() =>
                          setFailedPlaceImages((current) => ({
                            ...current,
                            [place.id]: true,
                          }))
                        }
                      />
                    ) : (
                      <div className="lp-place-media lp-place-media-empty">
                        {place.name}
                      </div>
                    )}

                    <div className="lp-place-body">
                      <div className="lp-place-title-row">
                        <strong>{place.name}</strong>
                        {place.isVerified ? <VerifiedBadge size={16} /> : null}
                      </div>
                      <span className="lp-place-meta">
                        {place.cityName || place.type}
                      </span>
                      <p>
                        {place.description ||
                          "Explore a destination that can be pulled directly into your next AI route."}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="lp-section">
          <div className="lp-panel-grid">
            <article className="lp-panel">
              <div className="lp-panel-head">
                <span className="lp-section-eyebrow">Upcoming events</span>
                <h2>Moments the planner can fold into a route</h2>
              </div>

              {loading ? (
                <div className="lp-empty lp-empty-compact">
                  Loading events...
                </div>
              ) : events.length === 0 ? (
                <div className="lp-empty lp-empty-compact">
                  No upcoming events are available.
                </div>
              ) : (
                <div className="lp-list">
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      to={`/events/${encodeURIComponent(event.slug?.trim() ? event.slug : event.id)}`}
                      className="lp-list-item">
                      <span className="lp-list-icon">
                        <FiCalendar aria-hidden="true" />
                      </span>
                      <div className="lp-list-copy">
                        <strong>{event.title}</strong>
                        <span>{event.venueName}</span>
                      </div>
                      <small>{formatDate(event.startDate)}</small>
                    </Link>
                  ))}
                </div>
              )}
            </article>

            <article className="lp-panel">
              <div className="lp-panel-head">
                <span className="lp-section-eyebrow">Shared trips</span>
                <h2>Proof that Waynest routes can live beyond one user</h2>
              </div>

              {loading ? (
                <div className="lp-empty lp-empty-compact">
                  Loading shared routes...
                </div>
              ) : publicTrips.length === 0 ? (
                <div className="lp-empty lp-empty-compact">
                  No public routes are available yet.
                </div>
              ) : (
                <div className="lp-list">
                  {publicTrips.map((trip) => (
                    <Link
                      key={trip.shareSlug}
                      to={`/trip/${encodeURIComponent(trip.shareSlug)}`}
                      className="lp-list-item">
                      <span className="lp-list-icon">
                        <FiStar aria-hidden="true" />
                      </span>
                      <div className="lp-list-copy">
                        <strong>{trip.title || "Shared traveler route"}</strong>
                        <span>
                          {trip.username
                            ? `Published by @${trip.username}`
                            : "Published travel route"}
                        </span>
                      </div>
                      <small>{formatDate(trip.createdAt)}</small>
                    </Link>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="lp-cta">
          <div className="lp-cta-card">
            <span className="lp-section-eyebrow">Ready to launch?</span>
            <h2>Start with the AI planner, then grow into the full Waynest experience.</h2>
            <p>
              Generate a route as a guest, sign in to save it, and keep building
              on a system that combines usability, discovery, and social travel.
            </p>
            <div className="lp-cta-actions">
              <Link to="/plan" className="lp-btn lp-btn-primary">
                <FiCompass aria-hidden="true" />
                Try the planner
              </Link>
              <Link to="/register" className="lp-btn lp-btn-secondary">
                <FiUsers aria-hidden="true" />
                Create account
              </Link>
              <Link to="/login" className="lp-btn lp-btn-ghost">
                <FiLogIn aria-hidden="true" />
                Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
