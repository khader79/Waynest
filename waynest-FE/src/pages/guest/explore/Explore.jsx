import { useCallback, useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { globalSearch } from "@/api/public";
import { getApiErrorMessage, isApiCanceledError } from "@/utils/errors";
import { useExternalTextMap } from "@/hooks/i18n/useExternalTextMap";
import { useExplorePage } from "@/hooks/public/useExplorePage";
import {
  getResolvedPlaceImageUrl,
  pickPlaceImageField,
} from "@/utils/placeImage";
import { INSTANT_SEARCH_DEBOUNCE_MS } from "@/utils/performance";
import "./Explore.css";
import VerifiedBadge from "@/components/common/VerifiedBadge/VerifiedBadge";

const getFallbackImage = (type) => {
  switch (type) {
    case "RESTAURANT":
      return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=75&auto=format&fit=crop";
    case "CAFE":
      return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=75&auto=format&fit=crop";
    case "MUSEUM":
      return "https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=600&q=75&auto=format&fit=crop";
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeCategory, events, filteredPlaces, loading, setActiveCategory } =
    useExplorePage();

  const [searchParams] = useSearchParams();
  const [globalQuery, setGlobalQuery] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalResults, setGlobalResults] = useState([]);

  const tt = useCallback((key, defaultValue) => t(key, { defaultValue }), [t]);

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
        key: "ATTRACTION",
        label: tt("explore.categories.attraction", "Attraction"),
      },
      { key: "MUSEUM", label: tt("explore.categories.museum", "Museum") },
      { key: "PARK", label: tt("explore.categories.park", "Park") },
      {
        key: "HISTORICAL",
        label: tt("explore.categories.historical", "Historical"),
      },
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

  const externalLanguage = (i18n.language || "en").split("-")[0];
  const externalTexts = useMemo(() => {
    const list = [];

    providerHits.forEach((hit) => {
      list.push(hit.title, hit.subtitle);
    });

    eventHits.forEach((hit) => {
      list.push(hit.title, hit.subtitle);
    });

    placeHits.forEach((hit) => {
      list.push(hit.title, hit.subtitle);
    });

    events.forEach((event) => {
      list.push(
        event.title,
        event.description,
        event.venue?.name,
        event.venue?.city?.name,
      );
    });

    filteredPlaces.forEach((place) => {
      list.push(place.name, place.description, place.city?.name, place.type);
    });

    return list.filter((value) => typeof value === "string" && value.trim());
  }, [eventHits, events, filteredPlaces, placeHits, providerHits]);

  const resolveExternalText = useExternalTextMap(
    externalTexts,
    externalLanguage,
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
                        {resolveExternalText(hit.title)
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                      <div className="explore-people-result-text">
                        <strong className="explore-people-result-name">
                          {resolveExternalText(hit.title)}
                        </strong>
                        {hit.subtitle ? (
                          <small className="explore-people-result-sub">
                            {resolveExternalText(hit.subtitle)}
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
                          alt={resolveExternalText(hit.title)}
                          onError={({ currentTarget }) => {
                            currentTarget.onerror = null;
                            currentTarget.src = getFallbackImage("ATTRACTION");
                          }}
                        />
                      </div>
                      <div className="place-content">
                        <h3 className="place-title">
                          {resolveExternalText(hit.title)}
                        </h3>
                        <p className="place-city">
                          <FaMapMarkerAlt className="place-icon" />
                          {hit.subtitle
                            ? resolveExternalText(hit.subtitle)
                            : "-"}
                        </p>
                        <p className="place-description">
                          {hit.subtitle
                            ? resolveExternalText(hit.subtitle)
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
                        name={resolveExternalText(hit.title)}
                      />
                    </div>
                    <div className="place-content">
                      <h3 className="place-title">
                        {resolveExternalText(hit.title)}
                        {hit.isVerified ? <VerifiedBadge /> : null}
                      </h3>
                      <p className="place-city">
                        <FaMapMarkerAlt className="place-icon" />
                        {hit.subtitle ? resolveExternalText(hit.subtitle) : "-"}
                      </p>
                      <p className="place-description">
                        {hit.subtitle ? resolveExternalText(hit.subtitle) : "-"}
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
                `No results in ${activeCategoryLabel} category`,
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
                                alt={resolveExternalText(event.title)}
                                onError={({ currentTarget }) => {
                                  currentTarget.onerror = null;
                                  currentTarget.src =
                                    getFallbackImage("ATTRACTION");
                                }}
                              />
                            </div>

                            <div className="place-content">
                              <h3 className="place-title">
                                {resolveExternalText(event.title)}
                              </h3>
                              <p className="place-city">
                                <FaMapMarkerAlt className="place-icon" />
                                {event.venue?.city?.name
                                  ? resolveExternalText(event.venue.city.name)
                                  : event.venue?.name
                                    ? resolveExternalText(event.venue.name)
                                    : "-"}
                              </p>
                              <p className="place-description">
                                {resolveExternalText(event.description)}
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
                            name={resolveExternalText(place.name)}
                          />
                        </div>

                        <div className="place-content">
                          <h3 className="place-title">
                            {resolveExternalText(place.name)}
                            {place.isVerified ? <VerifiedBadge /> : null}
                          </h3>

                          <p className="place-city">
                            <FaMapMarkerAlt className="place-icon" />
                            {resolveExternalText(place.city?.name)}
                          </p>
                          <p className="place-description">
                            {resolveExternalText(place.description)}
                          </p>

                          <div className="place-meta">
                            <span className="place-rating">
                              <FaStar className="place-star" />
                              {place.ratingAverage != null
                                ? `${Number(place.ratingAverage).toFixed(1)} (${place.ratingCount ?? 0})`
                                : tt("explore.labels.noRating", "No rating")}
                            </span>
                            <span className="place-type">
                              {resolveExternalText(place.type)}
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
