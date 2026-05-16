import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import {
  getResolvedPlaceImageUrl,
  pickPlaceImageField,
} from "@/utils/placeImage";
import "./LandingPage.css";
import HeroDemo from "@/components/demo/HeroDemo";

const DIFFERENTIATORS = [
  {
    icon: FiCpu,
    titleKey: "landingPage.differentiators.realInputs.title",
    descriptionKey: "landingPage.differentiators.realInputs.description",
  },
  {
    icon: FiCompass,
    titleKey: "landingPage.differentiators.firstClick.title",
    descriptionKey: "landingPage.differentiators.firstClick.description",
  },
  {
    icon: FiShare2,
    titleKey: "landingPage.differentiators.socialTravel.title",
    descriptionKey: "landingPage.differentiators.socialTravel.description",
  },
];

const PLANNER_STEPS = [
  {
    titleKey: "landingPage.planner.setDestination.title",
    descriptionKey: "landingPage.planner.setDestination.description",
  },
  {
    titleKey: "landingPage.planner.giveContext.title",
    descriptionKey: "landingPage.planner.giveContext.description",
  },
  {
    titleKey: "landingPage.planner.reviewRoute.title",
    descriptionKey: "landingPage.planner.reviewRoute.description",
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
        endDate: typeof item.endDate === "string" ? item.endDate : undefined,
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

const isUpcomingEvent = (event) => {
  const referenceDate = event.endDate || event.startDate;
  if (!referenceDate) {
    return true;
  }

  const endTime = new Date(referenceDate).getTime();
  return Number.isFinite(endTime) ? endTime >= Date.now() : true;
};

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

const formatDate = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const REQUEST_TIMEOUT_MS = 12000;

const withTimeout = (promise, timeoutMs) =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("request_timeout"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });

export default function LandingPage() {
  const { i18n, t } = useTranslation();
  const [landingStats, setLandingStats] = useState(null);
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [publicTrips, setPublicTrips] = useState([]);
  const [loadingState, setLoadingState] = useState({
    stats: true,
    places: true,
    events: true,
    trips: true,
  });
  const [allowLoadingIndicators, setAllowLoadingIndicators] = useState(true);
  const [failedPlaceImages, setFailedPlaceImages] = useState({});

  const loading =
    loadingState.stats ||
    loadingState.places ||
    loadingState.events ||
    loadingState.trips;

  useEffect(() => {
    let active = true;

    const setSectionLoading = (key, value) => {
      if (!active) {
        return;
      }

      setLoadingState((current) => ({
        ...current,
        [key]: value,
      }));
    };

    const loadLanding = async () => {
      setAllowLoadingIndicators(true);
      setLoadingState({
        stats: true,
        places: true,
        events: true,
        trips: true,
      });

      const loadSection = (key, loader, onSuccess, onError) => {
        void withTimeout(Promise.resolve().then(loader), REQUEST_TIMEOUT_MS)
          .then((response) => {
            if (!active) {
              return;
            }

            onSuccess(response);
          })
          .catch(() => {
            if (!active) {
              return;
            }

            onError();
          })
          .finally(() => {
            setSectionLoading(key, false);
          });
      };

      loadSection(
        "stats",
        () => fetchLandingStats(),
        (response) => setLandingStats(response),
        () => setLandingStats(null),
      );

      loadSection(
        "places",
        () => fetchPublicPlaces(6),
        (response) => setPlaces(extractPlaces(response).slice(0, 6)),
        () => setPlaces([]),
      );

      loadSection(
        "events",
        () => fetchPublicEvents(4),
        (response) => {
          setEvents(
            extractEvents(response)
              .filter(isUpcomingEvent)
              .sort((left, right) => {
                const leftTime = left.startDate
                  ? new Date(left.startDate).getTime()
                  : Infinity;
                const rightTime = right.startDate
                  ? new Date(right.startDate).getTime()
                  : Infinity;

                return leftTime - rightTime;
              })
              .slice(0, 4),
          );
        },
        () => setEvents([]),
      );

      loadSection(
        "trips",
        () => fetchPublicTripBrowse(4),
        (response) => setPublicTrips(extractTrips(response).slice(0, 4)),
        () => setPublicTrips([]),
      );
    };

    void loadLanding();

    const loadingGuardTimer = setTimeout(() => {
      if (!active) {
        return;
      }

      setAllowLoadingIndicators(false);
      setLoadingState((current) => ({
        ...current,
        stats: false,
        places: false,
        events: false,
        trips: false,
      }));
    }, REQUEST_TIMEOUT_MS + 1000);

    return () => {
      active = false;
      clearTimeout(loadingGuardTimer);
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        icon: FiUsers,
        label: t("landingPage.stats.activeTravelers"),
        value: loading ? "—" : formatStatValue(landingStats?.usersCount),
      },
      {
        icon: FiMapPin,
        label: t("landingPage.stats.livePlaces"),
        value: loading ? "—" : formatStatValue(landingStats?.placesCount),
      },
      {
        icon: FiGlobe,
        label: t("landingPage.stats.countries"),
        value: loading ? "—" : formatStatValue(landingStats?.countriesCount),
      },
      {
        icon: FiMap,
        label: t("landingPage.stats.sharedRoutes"),
        value: loading ? "—" : formatStatValue(landingStats?.publicPlansCount),
      },
    ],
    [landingStats, loading, t],
  );

  return (
    <div className="lp-root">
      <div className="lp-shell">
        <section className="lp-hero bg-hero-photo">
          <div className="lp-hero-copy">
            <span className="lp-badge">
              <FiCheckCircle aria-hidden="true" />
              {t("landingPage.hero.badge")}
            </span>

            <h1 className="lp-hero-title">{t("landingPage.hero.title")}</h1>

            <p className="lp-hero-subtitle">
              {t("landingPage.hero.description")}
            </p>

            <div className="lp-hero-actions">
              <Link to="/plan" className="lp-btn lp-btn-primary">
                <FiCompass aria-hidden="true" />
                {t("landingPage.hero.btnPlan")}
              </Link>
              <Link to="/explore" className="lp-btn lp-btn-secondary">
                <FiMapPin aria-hidden="true" />
                {t("landingPage.hero.btnExplore")}
              </Link>
              <Link to="/register" className="lp-text-link">
                {t("landingPage.hero.btnCreateAccount")}
                <FiArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div className="lp-microproof">
              <div className="lp-microproof-item">
                <FiClock aria-hidden="true" />
                <span>{t("landingPage.hero.micro.fastFlow")}</span>
              </div>
              <div className="lp-microproof-item">
                <FiCpu aria-hidden="true" />
                <span>{t("landingPage.hero.micro.explained")}</span>
              </div>
              <div className="lp-microproof-item">
                <FiShare2 aria-hidden="true" />
                <span>{t("landingPage.hero.micro.planning")}</span>
              </div>
            </div>
          </div>

          <div className="lp-hero-visual">
            <div className="lp-visual-card lp-visual-card-primary">
              <div className="lp-visual-header">
                <span className="lp-visual-kicker">
                  {t("landingPage.visual.analysisKicker")}
                </span>
                <strong>{t("landingPage.visual.analysisTitle")}</strong>
              </div>

              <div className="lp-visual-list">
                <div className="lp-visual-list-item">
                  <span className="lp-visual-dot" />
                  {t("landingPage.visual.analysisItem1")}
                </div>
                <div className="lp-visual-list-item">
                  <span className="lp-visual-dot" />
                  {t("landingPage.visual.analysisItem2")}
                </div>
                <div className="lp-visual-list-item">
                  <span className="lp-visual-dot" />
                  {t("landingPage.visual.analysisItem3")}
                </div>
                <div className="lp-visual-list-item">
                  <span className="lp-visual-dot" />
                  {t("landingPage.visual.analysisItem4")}
                </div>
              </div>
            </div>

            <div className="lp-visual-card lp-visual-card-output">
              <div className="lp-visual-header">
                <span className="lp-visual-kicker">
                  {t("landingPage.visual.outputKicker")}
                </span>
                <strong>{t("landingPage.visual.outputTitle")}</strong>
              </div>

              <div className="lp-output-day">
                <span className="lp-output-day-label">
                  {t("landingPage.visual.dayLabel")}
                </span>
                <div className="lp-output-slot">
                  <label>{t("landingPage.visual.morning")}</label>
                  <strong>{t("landingPage.visual.morningTitle")}</strong>
                </div>
                <div className="lp-output-slot">
                  <label>{t("landingPage.visual.afternoon")}</label>
                  <strong>{t("landingPage.visual.afternoonTitle")}</strong>
                </div>
                <div className="lp-output-slot">
                  <label>{t("landingPage.visual.evening")}</label>
                  <strong>{t("landingPage.visual.eveningTitle")}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Embedded visual demo with images and animations */}
        <HeroDemo />

        <section
          className="lp-stat-strip"
          aria-label={t("landingPage.stats.aria")}>
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
            <span className="lp-section-eyebrow">
              {t("landingPage.standout.eyebrow")}
            </span>
            <h2>{t("landingPage.standout.title")}</h2>
            <p>{t("landingPage.standout.description")}</p>
          </div>

          <div className="lp-feature-grid">
            {DIFFERENTIATORS.map((item) => (
              <article key={item.titleKey} className="lp-feature-card">
                <span className="lp-feature-icon">
                  <item.icon aria-hidden="true" />
                </span>
                <h3>{t(item.titleKey)}</h3>
                <p>{t(item.descriptionKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-section-surface">
          <div className="lp-section-head lp-section-head-row">
            <div>
              <span className="lp-section-eyebrow">
                {t("landingPage.planner.eyebrow")}
              </span>
              <h2>{t("landingPage.planner.title")}</h2>
            </div>
            <Link to="/plan" className="lp-text-link">
              {t("landingPage.planner.link")}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div className="lp-step-grid">
            {PLANNER_STEPS.map((step, index) => (
              <article key={step.titleKey} className="lp-step-card">
                <span className="lp-step-index">0{index + 1}</span>
                <h3>{t(step.titleKey)}</h3>
                <p>{t(step.descriptionKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head lp-section-head-row">
            <div>
              <span className="lp-section-eyebrow">
                {t("landingPage.featured.eyebrow")}
              </span>
              <h2>{t("landingPage.featured.title")}</h2>
            </div>
            <Link to="/explore" className="lp-text-link">
              {t("landingPage.featured.link")}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          {loadingState.places && allowLoadingIndicators ? (
            <div className="lp-empty">{t("landingPage.featured.loading")}</div>
          ) : places.length === 0 ? (
            <div className="lp-empty">{t("landingPage.featured.empty")}</div>
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
                        {place.cityName ? place.cityName : place.type}
                      </span>
                      <p>
                        {place.description ||
                          t("landingPage.featured.fallbackDescription")}
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
                <span className="lp-section-eyebrow">
                  {t("landingPage.events.eyebrow")}
                </span>
                <h2>{t("landingPage.events.title")}</h2>
              </div>

              {loadingState.events && allowLoadingIndicators ? (
                <div className="lp-empty lp-empty-compact">
                  {t("landingPage.events.loading")}
                </div>
              ) : events.length === 0 ? (
                <div className="lp-empty lp-empty-compact">
                  {t("landingPage.events.empty")}
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
                      <small>
                        {formatDate(
                          event.startDate,
                          t("landingPage.openDetails"),
                        )}
                      </small>
                    </Link>
                  ))}
                </div>
              )}
            </article>

            <article className="lp-panel">
              <div className="lp-panel-head">
                <span className="lp-section-eyebrow">
                  {t("landingPage.shared.eyebrow")}
                </span>
                <h2>{t("landingPage.shared.title")}</h2>
              </div>

              {loadingState.trips && allowLoadingIndicators ? (
                <div className="lp-empty lp-empty-compact">
                  {t("landingPage.shared.loading")}
                </div>
              ) : publicTrips.length === 0 ? (
                <div className="lp-empty lp-empty-compact">
                  {t("landingPage.shared.empty")}
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
                        <strong>
                          {trip.title
                            ? trip.title
                            : t("landingPage.shared.sharedTravelerRoute")}
                        </strong>
                        <span>
                          {trip.username
                            ? t("landingPage.shared.publishedBy", {
                                username: trip.username,
                              })
                            : t("landingPage.shared.publishedTravelRoute")}
                        </span>
                      </div>
                      <small>
                        {formatDate(
                          trip.createdAt,
                          t("landingPage.openDetails"),
                        )}
                      </small>
                    </Link>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="lp-cta">
          <div className="lp-cta-card">
            <span className="lp-section-eyebrow">
              {t("landingPage.cta.eyebrow")}
            </span>
            <h2>{t("landingPage.cta.title")}</h2>
            <p>{t("landingPage.cta.description")}</p>
            <div className="lp-cta-actions">
              <Link to="/plan" className="lp-btn lp-btn-primary">
                <FiCompass aria-hidden="true" />
                {t("landingPage.cta.primary")}
              </Link>
              <Link to="/register" className="lp-btn lp-btn-secondary">
                <FiUsers aria-hidden="true" />
                {t("landingPage.cta.secondary")}
              </Link>
              <Link to="/login" className="lp-btn lp-btn-ghost">
                <FiLogIn aria-hidden="true" />
                {t("landingPage.cta.ghost")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
