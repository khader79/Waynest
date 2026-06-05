import { useCallback, useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { globalSearch } from "@/api/public";
import { getApiErrorMessage, isApiCanceledError } from "@/utils/errors";
import { useExplorePage } from "@/hooks/public/useExplorePage";
import { getResolvedPlaceImageUrl, pickPlaceImageField } from "@/utils/placeImage";
import { INSTANT_SEARCH_DEBOUNCE_MS } from "@/utils/performance";
import "./Explore.css";
import VerifiedBadge from "@/components/common/VerifiedBadge/VerifiedBadge";
import { fetchPrimaryImage } from "@/api/placeImages";
import { useRef } from "react";


const TYPE_ICON = {
  RESTAURANT:"🍽️", CAFE:"☕", MUSEUM:"🏛️", PARK:"🌿", BEACH:"🏖️",
  HOTEL:"🏨", LANDMARK:"🏛️", ACTIVITY:"🎯", TOUR:"🗺️", SHOP:"🛍️",
  CHURCH:"⛪", MOSQUE:"🕌",
};
const TYPE_GRADIENT = {
  RESTAURANT:"135deg,#7c3aed,#4c1d95", CAFE:"135deg,#92400e,#451a03",
  MUSEUM:"135deg,#1d4ed8,#1e3a5f",     PARK:"135deg,#166534,#052e16",
  BEACH:"135deg,#0369a1,#0c4a6e",      HOTEL:"135deg,#0f766e,#042f2e",
  LANDMARK:"135deg,#b45309,#451a03",   DEFAULT:"135deg,#374151,#111827",
};

/**
 * Place card image:
 *   - DB imageUrl → show immediately
 *   - No DB image → when card enters viewport, fetch from API (lazy)
 *   - Still loading → animated gradient skeleton
 *   - API found image → show it
 *   - Nothing found → gradient placeholder with icon + name
 */
const PlaceImageSurface = ({ imageUrl, name, city, type }) => {
  const dbUrl   = getResolvedPlaceImageUrl(imageUrl);
  const [src,   setSrc]     = useState(dbUrl ?? null);
  const [status, setStatus] = useState(dbUrl ? "ready" : "idle"); // idle|loading|ready|empty
  const ref = useRef(null);
  const t   = String(type ?? "").toUpperCase();

  // Lazy-fetch from API when no DB image and card becomes visible
  useEffect(() => {
    if (dbUrl) return; // already have image, skip API

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setStatus("loading");
        fetchPrimaryImage(name, city, type)
          .then((url) => {
            if (url) { setSrc(url); setStatus("ready"); }
            else       setStatus("empty");
          })
          .catch(() => setStatus("empty"));
      },
      { rootMargin: "400px", threshold: 0 },
    );

    io.observe(el);
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUrl, name, city, type]);

  const icon     = TYPE_ICON[t] ?? "📍";
  const bg       = `linear-gradient(${TYPE_GRADIENT[t] ?? TYPE_GRADIENT.DEFAULT})`;
  const imgStyle = { width: "100%", height: "100%", objectFit: "cover", display: "block" };

  // ── Has image ──────────────────────────────────────────────────────────────
  if (src && status === "ready") {
    return (
      <div ref={ref} style={{ width: "100%", height: "100%" }}>
        <img
          src={src}
          alt={name}
          loading="lazy"
          style={imgStyle}
          onError={() => { setSrc(null); setStatus("empty"); }}
        />
      </div>
    );
  }

  // ── Loading (animated shimmer) ─────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div ref={ref} style={{
        width: "100%", height: "100%",
        background: "linear-gradient(90deg,#1e2535 25%,#2a3347 50%,#1e2535 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
      }} />
    );
  }

  // ── No image — gradient placeholder ───────────────────────────────────────
  return (
    <div ref={ref} style={{
      width: "100%", height: "100%", background: bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 6,
    }}>
      <span style={{ fontSize: 32 }}>{icon}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)",
        textAlign: "center", padding: "0 10px", lineHeight: 1.3,
        overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{name}</span>
    </div>
  );
};

const PLACE_TYPE_LABEL_KEYS = {
  ACTIVITY: "activity",
  CAFE: "cafe",
  HOTEL: "hotel",
  LANDMARK: "landmark",
  PARK: "park",
  RESTAURANT: "restaurant",
  SHOP: "shop",
  TOUR: "tour",
};

const Explore = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCategory, events, filteredPlaces, loading, setActiveCategory } =
    useExplorePage();

  const [searchParams] = useSearchParams();
  const [globalQuery, setGlobalQuery] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalResults, setGlobalResults] = useState([]);

  const tt = useCallback(
    (key, defaultValue, options) => t(key, { defaultValue, ...options }),
    [t],
  );

  const getPlaceTypeLabel = useCallback(
    (type) => {
      const normalizedType = String(type ?? "").toUpperCase();
      const labelKey = PLACE_TYPE_LABEL_KEYS[normalizedType];
      if (!labelKey) {
        return type || tt("explore.labels.place", "Place");
      }

      return tt(
        `tripPlanner.placeTypes.${labelKey}`,
        normalizedType
          .toLowerCase()
          .replace(/(^|_)([a-z])/g, (_, space, char) =>
            `${space ? " " : ""}${char.toUpperCase()}`,
          ),
      );
    },
    [tt],
  );

  const categories = useMemo(
    () => [
      { key: "all", label: tt("explore.categories.all", "All") },
      { key: "events", label: tt("explore.categories.events", "Events") },
      {
        key: "RESTAURANT",
        label: tt("explore.categories.restaurant", "Restaurant"),
      },
      { key: "CAFE", label: tt("explore.categories.cafe", "Cafe") },
      {
        key: "attractions",
        label: tt("explore.categories.attractions", "Attractions"),
      },
      { key: "PARK", label: tt("explore.categories.park", "Park") },
      { key: "HOTEL", label: tt("explore.categories.hotel", "Hotels") },
      { key: "SHOP", label: tt("explore.categories.shop", "Shops") },
    ],
    [tt],
  );

  const activeCategoryLabel = useMemo(
    () =>
      categories.find((category) => category.key === activeCategory)?.label ??
      tt("explore.categories.all", "All"),
    [activeCategory, categories, tt],
  );

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

  return (
    <div className="explore-page">
      <section className="hero-section">
        <div>
          <h1>
            {tt(
              "explore.hero.title",
              "Discover places & events",
            )}
          </h1>
          <p>
            {tt(
              "explore.hero.description",
              "Browse curated destinations, find your next adventure.",
            )}
          </p>
        </div>

        <div className="explore-people-search__box">
          <input
            type="search"
            value={globalQuery}
            onChange={(event) => setGlobalQuery(event.target.value)}
            placeholder={tt(
              "explore.search.placeholder",
              "Search places, events, providers…",
            )}
            className="explore-search-input"
          />
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
                        {hit.title
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
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
                          src={eventImageUrl || getFallbackImage("ATTRACTION")}
                          alt={hit.title}
                          onError={({ currentTarget }) => {
                            currentTarget.onerror = null;
                            currentTarget.src = getFallbackImage("ATTRACTION");
                          }}
                        />
                      </div>
                      <div className="place-content">
                        <h3 className="place-title">
                          {hit.title}
                        </h3>
                        <p className="place-city">
                          <FaMapMarkerAlt className="place-icon" />
                          {hit.subtitle
                            ? hit.subtitle
                            : "-"}
                        </p>
                        <p className="place-description">
                          {hit.subtitle
                            ? hit.subtitle
                            : "-"}
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
                {placeHits.map((hit) => (
                  <div key={hit.href} className="place-card">
                    <div className="place-image">
                      <PlaceImageSurface
                        imageUrl={pickPlaceImageField(hit)}
                        name={hit.title}
                        city={hit.subtitle}
                        type={hit.placeType ?? hit.type}
                      />
                    </div>
                    <div className="place-content">
                      <h3 className="place-title">
                        {hit.title}
                        {hit.isVerified ? <VerifiedBadge /> : null}
                      </h3>
                      <p className="place-city">
                        <FaMapMarkerAlt className="place-icon" />
                        {hit.subtitle ? hit.subtitle : "-"}
                      </p>
                      <p className="place-description">
                        {hit.subtitle ? hit.subtitle : "-"}
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
                ))}
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
          ) : filteredPlaces.length === 0 && events.length === 0 ? (
            <div className="explore-empty-state">
              {tt(
                "explore.emptyStateCategory",
                "No results in {{category}} category",
                { category: activeCategoryLabel },
              )}
            </div>
          ) : (
            <>
              {events.length > 0 ||
              activeCategory === "all" ||
              activeCategory === "events" ? (
                <>
                  <h2 className="explore-section-title">
                    {tt("explore.sections.events", "Events")}
                  </h2>
                  {events.length > 0 ? (
                    <div className="grid">
                      {events.map((event) => {
                        const eventImageUrl = getResolvedPlaceImageUrl(event);

                        return (
                          <div className="place-card" key={event.id}>
                            <div className="place-image">
                              <img
                                src={
                                  eventImageUrl ||
                                  getFallbackImage("ATTRACTION")
                                }
                                alt={event.title}
                                onError={({ currentTarget }) => {
                                  currentTarget.onerror = null;
                                  currentTarget.src =
                                    getFallbackImage("ATTRACTION");
                                }}
                              />
                            </div>

                            <div className="place-content">
                              <h3 className="place-title">
                                {event.title}
                              </h3>
                              <p className="place-city">
                                <FaMapMarkerAlt className="place-icon" />
                                {event.venue?.city?.name
                                  ? event.venue.city.name
                                  : event.venue?.name
                                    ? event.venue.name
                                    : "-"}
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

              {filteredPlaces.length > 0 ? (
                <>
                  <h2 className="explore-section-title">
                    {tt("explore.sections.places", "Places")}
                  </h2>
                  <div className="grid">
                    {filteredPlaces.map((place) => (
                      <div className="place-card" key={place.id}>
                        <div className="place-image">
                          <PlaceImageSurface
                            imageUrl={pickPlaceImageField(place)}
                            name={place.name}
                            city={place.city?.name}
                            type={place.type}
                          />
                        </div>

                        <div className="place-content">
                          <h3 className="place-title">
                            {place.name}
                            {place.isVerified ? <VerifiedBadge /> : null}
                          </h3>

                          <p className="place-city">
                            <FaMapMarkerAlt className="place-icon" />
                            {place.city?.name}
                          </p>
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
                              {getPlaceTypeLabel(place.type)}
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
                            {tt("explore.actions.viewDetails", "View details")}
                          </button>
                        </div>
                      </div>
                    ))}
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
