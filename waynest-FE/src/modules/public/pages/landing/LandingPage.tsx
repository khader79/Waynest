import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  FiArrowRight,
  FiCalendar,
  FiCompass,
  FiMap,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/utils/errors";
import {
  fetchPublicEvents,
  fetchPublicPlaces,
} from "@/services/catalog/catalog.service";
import VerifiedBadge from "@/components/common/VerifiedBadge/VerifiedBadge";
import {
  fetchPublicTripBrowse,
  PublicTripBrowseItem,
} from "@/services/tripPlanner/tripPlanner.service";
import SocialFeed from "../social/SocialFeed";
import "../social/SocialFeed.css";
import "./LandingPage.css";

/* ── types ────────────────────────────────────────────────── */

type DiscoveryPlace = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  cityName: string;
  type: string;
  slug?: string | null;
  isVerified?: boolean;
};

type DiscoveryEvent = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  venueName: string;
  startDate?: string;
  slug?: string | null;
};

/* ── extractors ───────────────────────────────────────────── */

const extractPlaces = (payload: unknown): DiscoveryPlace[] => {
  const rows = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { data?: unknown[] }).data)
      ? (payload as { data: unknown[] }).data
      : [];

  return rows
    .filter((r): r is Record<string, unknown> =>
      Boolean(r && typeof r === "object"),
    )
    .map((r) => ({
      id: String(r.id ?? ""),
      name: typeof r.name === "string" ? r.name : "",
      description: typeof r.description === "string" ? r.description : "",
      imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : null,
      cityName:
        r.city &&
        typeof r.city === "object" &&
        typeof (r.city as { name?: unknown }).name === "string"
          ? ((r.city as { name: string }).name ?? "")
          : "",
      type: typeof r.type === "string" ? r.type : "",
      slug: typeof r.slug === "string" ? r.slug : null,
      isVerified: typeof r.isVerified === "boolean" ? r.isVerified : false,
    }))
    .filter((p) => Boolean(p.id && p.name));
};

const extractEvents = (payload: unknown): DiscoveryEvent[] => {
  const rows = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { data?: unknown[] }).data)
      ? (payload as { data: unknown[] }).data
      : [];

  return rows
    .filter((r): r is Record<string, unknown> =>
      Boolean(r && typeof r === "object"),
    )
    .map((r) => {
      const venue =
        r.venue && typeof r.venue === "object"
          ? (r.venue as Record<string, unknown>)
          : null;
      const venueCity =
        venue?.city && typeof venue.city === "object"
          ? (venue.city as Record<string, unknown>)
          : null;
      return {
        id: String(r.id ?? ""),
        title: typeof r.title === "string" ? r.title : "",
        description: typeof r.description === "string" ? r.description : "",
        imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : null,
        venueName:
          (typeof venueCity?.name === "string" && venueCity.name) ||
          (typeof venue?.name === "string" && venue.name) ||
          "",
        startDate: typeof r.startDate === "string" ? r.startDate : undefined,
        slug: typeof r.slug === "string" ? r.slug : null,
      };
    })
    .filter((e) => Boolean(e.id && e.title));
};

/* ── GuestHome ───────────────────────────────────────────── */

const GuestHome = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<DiscoveryPlace[]>([]);
  const [events, setEvents] = useState<DiscoveryEvent[]>([]);
  const [publicTrips, setPublicTrips] = useState<PublicTripBrowseItem[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const [placesPayload, eventsPayload, browsePayload] = await Promise.all(
          [fetchPublicPlaces(), fetchPublicEvents(), fetchPublicTripBrowse(6)],
        );
        if (!active) return;
        setPlaces(extractPlaces(placesPayload).slice(0, 6));
        setEvents(
          extractEvents(eventsPayload)
            .sort((a, b) => {
              const at = a.startDate
                ? new Date(a.startDate).getTime()
                : Infinity;
              const bt = b.startDate
                ? new Date(b.startDate).getTime()
                : Infinity;
              return at - bt;
            })
            .slice(0, 4),
        );
        setPublicTrips(
          Array.isArray(browsePayload.items)
            ? browsePayload.items.slice(0, 4)
            : [],
        );
      } catch (err) {
        if (active)
          toast.error(
            getApiErrorMessage(
              err,
              t("landing.loadFailed", { defaultValue: "Could not load." }),
            ),
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t]);

  const stats = useMemo(
    () => [
      {
        key: "places",
        n: places.length,
        label: t("landing.metrics.places", { defaultValue: "Featured places" }),
      },
      {
        key: "events",
        n: events.length,
        label: t("landing.metrics.events", { defaultValue: "Upcoming events" }),
      },
      {
        key: "trips",
        n: publicTrips.length,
        label: t("landing.metrics.trips", { defaultValue: "Shared trips" }),
      },
    ],
    [events.length, places.length, publicTrips.length, t],
  );

  return (
    <main className="gl">
      {/* ════════════════════════  HERO  ════════════════════════ */}
      <section className="gl-hero">
        <div className="gl-hero__glow" aria-hidden="true" />

        <span className="gl-eyebrow">
          {t("landing.hero.badge", {
            defaultValue: "AI-powered travel platform",
          })}
        </span>

        <h1 className="gl-hero__title">
          {t("landing.hero.title", {
            defaultValue: "Discover places, plan routes & travel together.",
          })}
        </h1>

        <p className="gl-hero__sub">
          {t("landing.hero.description", {
            defaultValue:
              "Browse real destinations and events, build an AI itinerary before signing in — then join for stories, chats, and your travel community.",
          })}
        </p>

        <div className="gl-hero__ctas">
          <Link to="/explore" className="btn-primary">
            {t("landing.hero.explore", { defaultValue: "Explore now" })}
          </Link>
          <Link to="/plan" className="btn-secondary">
            {t("landing.hero.plan", { defaultValue: "Open planner" })}
          </Link>
          <Link to="/register" className="gl-ghost-link">
            {t("landing.hero.join", { defaultValue: "Create account" })}
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>

        <div className="gl-hero__stats">
          {stats.map((s, i) => (
            <div key={s.key} className="gl-hero__statitem">
              {i > 0 && (
                <div className="gl-hero__statdivider" aria-hidden="true" />
              )}
              <strong>{loading ? "—" : s.n}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════  BENTO FEATURES  ════════════════ */}
      <section
        className="gl-bento"
        aria-label={t("landing.features.label", {
          defaultValue: "What you can do",
        })}
      >
        <article className="gl-bento__card">
          <span className="gl-bento__icon">
            <FiMap aria-hidden="true" />
          </span>
          <div className="gl-bento__copy">
            <h2>
              {t("landing.features.planTitle", {
                defaultValue: "Plan with AI",
              })}
            </h2>
            <p>
              {t("landing.features.planBody", {
                defaultValue:
                  "Generate a full route in seconds. No account needed.",
              })}
            </p>
            <Link to="/plan" className="gl-bento__link">
              {t("landing.features.planCta", {
                defaultValue: "Try the planner",
              })}{" "}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </article>

        <article className="gl-bento__card">
          <span className="gl-bento__icon">
            <FiCompass aria-hidden="true" />
          </span>
          <div className="gl-bento__copy">
            <h2>
              {t("landing.features.discoverTitle", {
                defaultValue: "Discover",
              })}
            </h2>
            <p>
              {t("landing.features.discoverBody", {
                defaultValue: "Browse places, events, and local providers.",
              })}
            </p>
            <Link to="/explore" className="gl-bento__link">
              {t("landing.features.discoverCta", {
                defaultValue: "Open explore",
              })}{" "}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </article>

        <article className="gl-bento__card">
          <span className="gl-bento__icon">
            <FiUsers aria-hidden="true" />
          </span>
          <div className="gl-bento__copy">
            <h2>
              {t("landing.features.connectTitle", {
                defaultValue: "Travel together",
              })}
            </h2>
            <p>
              {t("landing.features.connectBody", {
                defaultValue: "Share trips, follow travelers, and connect.",
              })}
            </p>
            <Link to="/register" className="gl-bento__link">
              {t("landing.features.connectCta", { defaultValue: "Join free" })}{" "}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>

      {/* ══════════════════════  PLACES  ═════════════════════════ */}
      <section className="gl-section">
        <div className="gl-section__head">
          <div>
            <p className="gl-eyebrow">
              {t("landing.sections.placesEyebrow", { defaultValue: "Places" })}
            </p>
            <h2>
              {t("landing.sections.placesTitle", {
                defaultValue: "Start with places worth opening",
              })}
            </h2>
          </div>
          <Link to="/explore" className="gl-text-link">
            {t("landing.sections.viewAllPlaces", {
              defaultValue: "Open explore",
            })}
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="gl-empty">
            {t("common.loading", { defaultValue: "Loading…" })}
          </div>
        ) : places.length === 0 ? (
          <div className="gl-empty">
            {t("landing.empty.places", {
              defaultValue: "No places available.",
            })}
          </div>
        ) : (
          <div className="gl-places">
            {places.map((place) => (
              <Link
                key={place.id}
                to={`/places/${encodeURIComponent(place.slug?.trim() ? place.slug : place.id)}`}
                className="gl-place"
              >
                {place.imageUrl ? (
                  <img
                    src={place.imageUrl}
                    alt={place.name}
                    className="gl-place__img"
                  />
                ) : (
                  <div className="gl-place__img gl-place__img--empty">
                    <FiMapPin aria-hidden="true" />
                  </div>
                )}
                <div className="gl-place__overlay">
                      <strong>
                        {place.name}
                        {place.isVerified ? <VerifiedBadge /> : null}
                      </strong>
                  {(place.cityName || place.type) && (
                    <span>{place.cityName || place.type}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════  EVENTS + TRIPS  ═════════════════ */}
      <div className="gl-grid-2">
        <section className="gl-panel">
          <div className="gl-panel__head">
            <p className="gl-eyebrow">
              {t("landing.sections.eventsEyebrow", { defaultValue: "Events" })}
            </p>
            <h2>
              {t("landing.sections.eventsTitle", {
                defaultValue: "Upcoming events",
              })}
            </h2>
          </div>

          {loading ? (
            <div className="gl-empty">
              {t("common.loading", { defaultValue: "Loading…" })}
            </div>
          ) : events.length === 0 ? (
            <div className="gl-empty">
              {t("landing.empty.events", {
                defaultValue: "No upcoming events.",
              })}
            </div>
          ) : (
            <div className="gl-list">
              {events.map((ev) => (
                <Link
                  key={ev.id}
                  to={`/events/${encodeURIComponent(ev.slug?.trim() ? ev.slug : ev.id)}`}
                  className="gl-list__item"
                >
                  <span className="gl-list__icon">
                    <FiCalendar aria-hidden="true" />
                  </span>
                  <div className="gl-list__copy">
                    <strong>{ev.title}</strong>
                    <span>
                      {ev.venueName ||
                        t("landing.eventLabel", { defaultValue: "Event" })}
                    </span>
                  </div>
                  <small>
                    {ev.startDate
                      ? new Date(ev.startDate).toLocaleDateString()
                      : t("landing.eventAnyTime", { defaultValue: "Details" })}
                  </small>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="gl-panel">
          <div className="gl-panel__head">
            <p className="gl-eyebrow">
              {t("landing.sections.tripsEyebrow", {
                defaultValue: "Public trips",
              })}
            </p>
            <h2>
              {t("landing.sections.tripsTitle", {
                defaultValue: "Routes travelers shared",
              })}
            </h2>
          </div>

          {loading ? (
            <div className="gl-empty">
              {t("common.loading", { defaultValue: "Loading…" })}
            </div>
          ) : publicTrips.length === 0 ? (
            <div className="gl-empty">
              {t("landing.empty.trips", {
                defaultValue: "No public trips yet.",
              })}
            </div>
          ) : (
            <div className="gl-list">
              {publicTrips.map((trip) => (
                <Link
                  key={trip.shareSlug}
                  to={`/trip/${encodeURIComponent(trip.shareSlug)}`}
                  className="gl-list__item"
                >
                  <span className="gl-list__icon">
                    <FiMap aria-hidden="true" />
                  </span>
                  <div className="gl-list__copy">
                    <strong>
                      {trip.title?.trim() ||
                        t("tripPlanner.savedPlans", {
                          defaultValue: "Saved plan",
                        })}
                    </strong>
                    <span>
                      {t("landing.sharedBy", {
                        defaultValue: "By @{{username}}",
                        username: trip.username,
                      })}
                    </span>
                  </div>
                  <small>{new Date(trip.createdAt).toLocaleDateString()}</small>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ══════════════════════  JOIN CTA  ═══════════════════════ */}
      <section className="gl-join">
        <div className="gl-join__blob" aria-hidden="true" />
        <div className="gl-join__inner">
          <span className="gl-eyebrow">
            {t("landing.join.eyebrow", { defaultValue: "Ready for more?" })}
          </span>
          <h2>
            {t("landing.join.title", {
              defaultValue: "Unlock the full travel social layer",
            })}
          </h2>
          <p>
            {t("landing.join.body", {
              defaultValue:
                "Sign in to get stories, live feed, shared itineraries, direct messages, and traveler profiles.",
            })}
          </p>
          <div className="gl-join__ctas">
            <Link to="/register" className="btn-primary">
              {t("landing.join.register", {
                defaultValue: "Create free account",
              })}
            </Link>
            <Link to="/login" className="btn-secondary">
              {t("navbar.login", { defaultValue: "Sign in" })}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

/* ── LandingPage (route component) ──────────────────────── */

const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.role !== "ADMIN") {
    return <SocialFeed />;
  }

  return <GuestHome />;
};

export default LandingPage;
