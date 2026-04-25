import { useCallback, useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { globalSearch } from "@/api/public";
import { getApiErrorMessage, isApiCanceledError } from "@/utils/errors";
import { useExplorePage } from "@/hooks/public/useExplorePage";
import {
  getResolvedPlaceImageUrl,
  pickPlaceImageField,
} from "@/utils/placeImage";
import { INSTANT_SEARCH_DEBOUNCE_MS } from "@/utils/performance";
import "./Explore.css";
import VerifiedBadge from "@/components/common/VerifiedBadge/VerifiedBadge";

const PLACE_TYPE_META = {
  HOTEL: { key: "explore.categories.hotel", fallback: "Hotel" },
  RESTAURANT: { key: "explore.categories.restaurant", fallback: "Restaurant" },
  ACTIVITY: { key: "explore.categories.activity", fallback: "Activity" },
  TOUR: { key: "explore.categories.tour", fallback: "Tour" },
  LANDMARK: { key: "explore.categories.landmark", fallback: "Landmark" },
  CAFE: { key: "explore.categories.cafe", fallback: "Cafe" },
  PARK: { key: "explore.categories.park", fallback: "Park" },
  SHOP: { key: "explore.categories.shop", fallback: "Shop" },
  ATTRACTION: {
    key: "explore.categories.attraction",
    fallback: "Attraction",
  },
  MUSEUM: { key: "explore.categories.museum", fallback: "Museum" },
  HISTORICAL: {
    key: "explore.categories.historical",
    fallback: "Historical",
  },
};

const PLACE_TYPE_ORDER = [
  "RESTAURANT",
  "CAFE",
  "HOTEL",
  "ACTIVITY",
  "TOUR",
  "LANDMARK",
  "PARK",
  "SHOP",
  "ATTRACTION",
  "MUSEUM",
  "HISTORICAL",
];

const normalizePlaceType = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const toTitleCase = (value) =>
  value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getPlaceTypeLabel = (type, tt) => {
  const normalizedType = normalizePlaceType(type);
  if (!normalizedType) {
    return tt("explore.labels.place", "Place");
  }

  const meta = PLACE_TYPE_META[normalizedType];
  if (meta) {
    return tt(meta.key, meta.fallback);
  }

  return toTitleCase(normalizedType.replace(/_/g, " "));
};

const getPlaceLocationLabel = (place) => {
  const cityName =
    typeof place?.city?.name === "string" ? place.city.name.trim() : "";
  const countryNameRaw =
    place?.city?.country?.name ?? place?.city?.countryName ?? "";
  const countryName =
    typeof countryNameRaw === "string" ? countryNameRaw.trim() : "";

  if (
    cityName &&
    countryName &&
    cityName.toLowerCase() !== countryName.toLowerCase()
  ) {
    return `${cityName}, ${countryName}`;
  }

  return cityName || countryName || "-";
};

const hasLongText = (value, minLength = 1) =>
  typeof value === "string" && value.trim().length >= minLength;

const hasFiniteCoordinatePair = (place) => {
  const lat = Number(place?.latitude);
  const lng = Number(place?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
};

const getPlaceCompletenessScore = (place) => {
  const checks = [
    hasLongText(place?.name),
    hasLongText(place?.description, 24),
    Boolean(pickPlaceImageField(place)),
    hasLongText(place?.city?.name),
    hasLongText(place?.city?.country?.name ?? place?.city?.countryName),
    hasFiniteCoordinatePair(place),
    hasLongText(place?.type),
    Array.isArray(place?.tags) && place.tags.length > 0,
    hasLongText(place?.provider?.displayName),
    Number(place?.ratingCount) > 0,
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
};

const getQualityBand = (score) => {
  if (score >= 80) {
    return "is-high";
  }
  if (score >= 60) {
    return "is-medium";
  }
  return "is-low";
};

const getEventStartTimestamp = (event) => {
  const ts = new Date(event?.startDate ?? event?.date ?? "").getTime();
  return Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY;
};

const getPlaceRankingScore = (place) => {
  const completeness = getPlaceCompletenessScore(place);
  const ratingAverage = Number(place?.ratingAverage ?? 0);
  const ratingCount = Number(place?.ratingCount ?? 0);

  const ratingScore = Number.isFinite(ratingAverage)
    ? Math.max(0, Math.min(5, ratingAverage)) * 8
    : 0;
  const volumeScore = Number.isFinite(ratingCount)
    ? Math.min(Math.log10(Math.max(0, ratingCount) + 1) * 10, 12)
    : 0;
  const verifiedScore = place?.isVerified ? 10 : 0;

  return completeness + ratingScore + volumeScore + verifiedScore;
};

const getFallbackImage = (type) => {
  switch (normalizePlaceType(type)) {
    case "HOTEL":
      return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=75&auto=format&fit=crop";
    case "RESTAURANT":
      return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=75&auto=format&fit=crop";
    case "ACTIVITY":
      return "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=600&q=75&auto=format&fit=crop";
    case "TOUR":
      return "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=75&auto=format&fit=crop";
    case "LANDMARK":
      return "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=75&auto=format&fit=crop";
    case "CAFE":
      return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=75&auto=format&fit=crop";
    case "MUSEUM":
      return "https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=600&q=75&auto=format&fit=crop";
    case "ATTRACTION":
      return "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=75&auto=format&fit=crop";
    case "PARK":
      return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=75&auto=format&fit=crop";
    case "HISTORICAL":
      return "https://images.unsplash.com/photo-1600628422019-6c9b5b6f2a4b?w=600&q=75&auto=format&fit=crop";
    case "SHOP":
      return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=75&auto=format&fit=crop";
    default:
      return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&q=75&auto=format&fit=crop";
  }
};

const PlaceImageSurface = ({ imageUrl, name }) => {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const resolvedImageUrl = getResolvedPlaceImageUrl(imageUrl);

  if (resolvedImageUrl && failedImageUrl !== resolvedImageUrl) {
    return (
      <img
        src={resolvedImageUrl}
        alt={name}
        onError={() => setFailedImageUrl(resolvedImageUrl)}
      />
    );
  }

  return (
    <div className="place-image-fallback" role="img" aria-label={name}>
      <span>{name}</span>
    </div>
  );
};

const Explore = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    activeCategory,
    events,
    filteredPlaces,
    loading,
    places,
    setActiveCategory,
    upcomingEvents,
  } = useExplorePage();

  const [searchParams] = useSearchParams();
  const [globalQuery, setGlobalQuery] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalResults, setGlobalResults] = useState([]);

  const tt = useCallback((key, defaultValue) => t(key, { defaultValue }), [t]);

  const categories = useMemo(() => {
    const typeSet = new Set(
      places.map((place) => normalizePlaceType(place?.type)).filter(Boolean),
    );

    const sortedTypes = [
      ...PLACE_TYPE_ORDER.filter((type) => typeSet.has(type)),
      ...[...typeSet]
        .filter((type) => !PLACE_TYPE_ORDER.includes(type))
        .sort((left, right) => left.localeCompare(right)),
    ];

    return [
      { key: "all", label: tt("explore.categories.all", "All") },
      { key: "events", label: tt("explore.categories.events", "Events") },
      ...sortedTypes.map((type) => ({
        key: type,
        label: getPlaceTypeLabel(type, tt),
      })),
    ];
  }, [places, tt]);

  const activeCategoryLabel = useMemo(
    () =>
      categories.find((category) => category.key === activeCategory)?.label ??
      tt("explore.categories.all", "All"),
    [activeCategory, categories, tt],
  );

  useEffect(() => {
    if (activeCategory === "all" || activeCategory === "events") {
      return;
    }

    const hasCategory = categories.some(
      (category) => category.key === activeCategory,
    );
    if (!hasCategory) {
      setActiveCategory("all");
    }
  }, [activeCategory, categories, setActiveCategory]);

  useEffect(() => {
    const query = globalQuery.trim();
    if (!query) {
      setGlobalResults([]);
      setGlobalLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setGlobalLoading(true);

    const handle = window.setTimeout(async () => {
      try {
        const response = await globalSearch(query, 10, {
          signal: controller.signal,
        });
        if (!active) {
          return;
        }
        const nextItems = Array.isArray(response.items) ? response.items : [];
        setGlobalResults(nextItems.filter((item) => item.type !== "user"));
      } catch (error) {
        if (!active || isApiCanceledError(error)) {
          return;
        }
        toast.error(
          getApiErrorMessage(
            error,
            tt("explore.search.failed", "Search failed"),
          ),
        );
        setGlobalResults([]);
      } finally {
        if (active) {
          setGlobalLoading(false);
        }
      }
    }, INSTANT_SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [globalQuery, tt]);

  const providerHits = useMemo(
    () => globalResults.filter((hit) => hit.type === "provider"),
    [globalResults],
  );
  const placeHits = useMemo(
    () => globalResults.filter((hit) => hit.type === "place"),
    [globalResults],
  );
  const eventHits = useMemo(
    () => globalResults.filter((hit) => hit.type === "event"),
    [globalResults],
  );

  const catalogStats = useMemo(() => {
    const countries = new Set(
      places
        .map((place) => place?.city?.country?.name ?? place?.city?.countryName)
        .filter((country) => typeof country === "string" && country.trim())
        .map((country) => country.trim().toLowerCase()),
    );

    return [
      {
        key: "places",
        value: places.length,
        label: tt("explore.stats.places", "Places"),
      },
      {
        key: "events",
        value: upcomingEvents.length,
        label: tt("explore.stats.events", "Upcoming events"),
      },
      {
        key: "countries",
        value: countries.size,
        label: tt("explore.stats.countries", "Countries"),
      },
    ];
  }, [places, tt, upcomingEvents]);

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (left, right) =>
          getEventStartTimestamp(left) - getEventStartTimestamp(right),
      ),
    [events],
  );

  const rankedPlaces = useMemo(
    () =>
      [...filteredPlaces].sort((left, right) => {
        const scoreDiff =
          getPlaceRankingScore(right) - getPlaceRankingScore(left);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        const ratingDiff =
          Number(right?.ratingAverage ?? 0) - Number(left?.ratingAverage ?? 0);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }

        return (left?.name ?? "").localeCompare(right?.name ?? "");
      }),
    [filteredPlaces],
  );

  return (
    <div className="explore-page">
      <section className="hero-section">
        <div>
          <h1>
            {tt(
              "explore.hero.title",
              "Explore places, events, and trusted providers",
            )}
          </h1>
          <p>
            {tt(
              "explore.hero.description",
              "This page stays focused on discovery. Browse the catalog, search public providers, and open details without the social clutter.",
            )}
          </p>

          <div
            className="explore-hero-stats"
            aria-label={tt("explore.stats.aria", "Live catalog snapshot")}>
            {catalogStats.map((stat) => (
              <div className="explore-hero-stat" key={stat.key}>
                <strong>{stat.value.toLocaleString()}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="explore-people-search">
          <h2 className="explore-people-search__title">
            {tt("explore.search.title", "Search the public catalog")}
          </h2>
          <div className="explore-people-search__box">
            <input
              type="search"
              value={globalQuery}
              onChange={(event) => setGlobalQuery(event.target.value)}
              placeholder={tt(
                "explore.search.placeholder",
                "Search providers, places, and events...",
              )}
              className="explore-search-input"
            />
          </div>
        </div>
      </section>

      {globalQuery.trim() ? (
        <section className="explore-people-search" aria-live="polite">
          {globalLoading ? (
            <p className="explore-search-results__loading">
              {tt("explore.search.loading", "Searching...")}
            </p>
          ) : null}

          {!globalLoading &&
          providerHits.length === 0 &&
          placeHits.length === 0 &&
          eventHits.length === 0 ? (
            <div className="explore-empty-state">
              {tt("explore.search.noResults", "No results")}
            </div>
          ) : null}

          {providerHits.length > 0 ? (
            <div className="explore-search-results__section">
              <h3 className="explore-search-results__section-title">
                {tt("explore.search.providers", "Providers")}
              </h3>
              <div className="explore-people-results">
                {providerHits.map((hit) => (
                  <div key={hit.href} className="explore-people-result-row">
                    <div className="explore-people-result-main">
                      <span className="explore-people-avatar explore-people-avatar--accent">
                        {hit.title.trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="explore-people-result-text">
                        <strong className="explore-people-result-name">
                          {hit.title}
                        </strong>
                        {hit.subtitle ? (
                          <small className="explore-people-result-sub">
                            {hit.subtitle}
                          </small>
                        ) : null}
                      </div>
                    </div>
                    <div className="explore-people-result-actions">
                      <button
                        type="button"
                        className="view-details-btn"
                        onClick={() => navigate(hit.href)}>
                        {tt("explore.actions.viewDetails", "View details")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {eventHits.length > 0 ? (
            <div className="explore-search-results__section">
              <h3 className="explore-search-results__section-title">
                {tt("explore.search.events", "Events")}
              </h3>
              <div className="grid">
                {eventHits.map((hit) => {
                  const eventImageUrl = getResolvedPlaceImageUrl(hit);

                  return (
                    <div key={hit.href} className="place-card">
                      <div className="place-image">
                        <img
                          src={eventImageUrl || getFallbackImage("TOUR")}
                          alt={hit.title}
                          onError={({ currentTarget }) => {
                            currentTarget.onerror = null;
                            currentTarget.src = getFallbackImage("TOUR");
                          }}
                        />
                      </div>
                      <div className="place-content">
                        <h3 className="place-title">{hit.title}</h3>
                        <p className="place-city">
                          <FaMapMarkerAlt className="place-icon" />
                          {hit.subtitle ?? "-"}
                        </p>
                        <p className="place-description">
                          {hit.subtitle ?? "-"}
                        </p>
                        <div className="place-meta">
                          <span className="place-rating">
                            <FaCalendarAlt className="place-star" />
                            {hit.date
                              ? new Date(hit.date).toLocaleDateString()
                              : tt("explore.labels.upcoming", "Upcoming")}
                          </span>
                          <span className="place-type">
                            {tt("explore.labels.event", "Event")}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="view-details-btn"
                          onClick={() => navigate(hit.href)}>
                          {tt("explore.actions.viewDetails", "View details")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {placeHits.length > 0 ? (
            <div className="explore-search-results__section">
              <h3 className="explore-search-results__section-title">
                {tt("explore.search.places", "Places")}
              </h3>
              <div className="grid">
                {placeHits.map((hit) => {
                  const quality = getPlaceCompletenessScore(hit);

                  return (
                    <div key={hit.href} className="place-card">
                      <div className="place-image">
                        <PlaceImageSurface
                          imageUrl={pickPlaceImageField(hit)}
                          name={hit.title}
                        />
                      </div>
                      <div className="place-content">
                        <h3 className="place-title">
                          {hit.title}
                          {hit.isVerified ? <VerifiedBadge /> : null}
                        </h3>
                        <span
                          className={`place-quality-badge ${getQualityBand(quality)}`}>
                          {tt("explore.labels.completeness", "Data")}: {quality}
                          %
                        </span>
                        <p className="place-city">
                          <FaMapMarkerAlt className="place-icon" />
                          {hit.subtitle ?? "-"}
                        </p>
                        <p className="place-description">
                          {hit.subtitle ?? "-"}
                        </p>
                        <div className="place-meta">
                          <span className="place-rating">
                            <FaStar className="place-star" />
                            {hit.rating != null
                              ? Number(hit.rating).toFixed(1)
                              : tt("explore.labels.noRating", "No rating")}
                          </span>
                          <span className="place-type">
                            {tt("explore.labels.place", "Place")}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="view-details-btn"
                          onClick={() => navigate(hit.href)}>
                          {tt("explore.actions.viewDetails", "View details")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <div className="filter-bar">
            {categories.map((category) => (
              <button
                type="button"
                key={category.key}
                className={activeCategory === category.key ? "active" : ""}
                onClick={() => setActiveCategory(category.key)}>
                {category.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="explore-skeleton-grid" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="explore-skeleton-card" key={index}>
                  <div className="explore-skeleton-image" />
                  <div className="explore-skeleton-body">
                    <div className="explore-skeleton-line explore-skeleton-line--title" />
                    <div className="explore-skeleton-line explore-skeleton-line--city" />
                    <div className="explore-skeleton-line explore-skeleton-line--description" />
                    <div className="explore-skeleton-line explore-skeleton-line--description-short" />
                    <div className="explore-skeleton-meta">
                      <div className="explore-skeleton-pill" />
                      <div className="explore-skeleton-pill" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : rankedPlaces.length === 0 && sortedEvents.length === 0 ? (
            <div className="explore-empty-state">
              {tt(
                "explore.emptyStateCategory",
                `No results in ${activeCategoryLabel} category`,
              )}
            </div>
          ) : (
            <>
              {sortedEvents.length > 0 ||
              activeCategory === "all" ||
              activeCategory === "events" ? (
                <>
                  <h2 className="explore-section-title">
                    {tt("explore.sections.events", "Events")}
                  </h2>
                  {sortedEvents.length > 0 ? (
                    <div className="grid">
                      {sortedEvents.map((event) => {
                        const eventImageUrl = getResolvedPlaceImageUrl(event);

                        return (
                          <div className="place-card" key={event.id}>
                            <div className="place-image">
                              <img
                                src={eventImageUrl || getFallbackImage("TOUR")}
                                alt={event.title}
                                onError={({ currentTarget }) => {
                                  currentTarget.onerror = null;
                                  currentTarget.src = getFallbackImage("TOUR");
                                }}
                              />
                            </div>

                            <div className="place-content">
                              <h3 className="place-title">{event.title}</h3>
                              <p className="place-city">
                                <FaMapMarkerAlt className="place-icon" />
                                {event.venue?.city?.name ??
                                  event.venue?.name ??
                                  "-"}
                              </p>
                              <p className="place-description">
                                {event.description}
                              </p>

                              <div className="place-meta">
                                <span className="place-rating">
                                  <FaCalendarAlt className="place-star" />
                                  {event.startDate
                                    ? new Date(
                                        event.startDate,
                                      ).toLocaleDateString()
                                    : "-"}
                                </span>
                                <span className="place-type">
                                  {tt("explore.labels.event", "Event")}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="view-details-btn"
                                onClick={() =>
                                  navigate(
                                    `/events/${event.slug?.trim() ? event.slug : event.id}`,
                                  )
                                }>
                                {tt(
                                  "explore.actions.viewDetails",
                                  "View details",
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="explore-empty-state explore-empty-state--events">
                      {tt(
                        "explore.sections.noEvents",
                        "No upcoming events right now. Check back later.",
                      )}
                    </div>
                  )}
                </>
              ) : null}

              {rankedPlaces.length > 0 ? (
                <>
                  <h2 className="explore-section-title">
                    {tt("explore.sections.places", "Places")}
                  </h2>
                  <div className="grid">
                    {rankedPlaces.map((place) => {
                      const quality = getPlaceCompletenessScore(place);

                      return (
                        <div className="place-card" key={place.id}>
                          <div className="place-image">
                            <PlaceImageSurface
                              imageUrl={pickPlaceImageField(place)}
                              name={place.name}
                            />
                          </div>

                          <div className="place-content">
                            <h3 className="place-title">
                              {place.name}
                              {place.isVerified ? <VerifiedBadge /> : null}
                            </h3>
                            <span
                              className={`place-quality-badge ${getQualityBand(quality)}`}>
                              {tt("explore.labels.completeness", "Data")}:{" "}
                              {quality}%
                            </span>

                            <p className="place-city">
                              <FaMapMarkerAlt className="place-icon" />
                              {getPlaceLocationLabel(place)}
                            </p>
                            {place.provider?.displayName ? (
                              <p className="place-provider">
                                {tt("explore.labels.by", "By")}{" "}
                                {place.provider.displayName}
                              </p>
                            ) : null}

                            {Array.isArray(place.tags) &&
                            place.tags.length > 0 ? (
                              <div className="place-tags-inline">
                                {place.tags.slice(0, 3).map((tag) => {
                                  const tagName =
                                    typeof tag === "string"
                                      ? tag
                                      : (tag?.name ?? tag?.id ?? "");
                                  if (!tagName) {
                                    return null;
                                  }
                                  return (
                                    <span
                                      className="place-tag-pill"
                                      key={`${place.id}-${tagName}`}>
                                      {tagName}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : null}

                            <p className="place-description">
                              {place.description}
                            </p>

                            <div className="place-meta">
                              <span className="place-rating">
                                <FaStar className="place-star" />
                                {place.ratingAverage != null
                                  ? `${Number(place.ratingAverage).toFixed(1)} (${place.ratingCount ?? 0})`
                                  : tt("explore.labels.noRating", "No rating")}
                              </span>
                              <span className="place-type">
                                {getPlaceTypeLabel(place.type, tt)}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="view-details-btn"
                              onClick={() =>
                                navigate(
                                  `/places/${place.slug?.trim() ? place.slug : place.id}`,
                                )
                              }>
                              {tt(
                                "explore.actions.viewDetails",
                                "View details",
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Explore;
