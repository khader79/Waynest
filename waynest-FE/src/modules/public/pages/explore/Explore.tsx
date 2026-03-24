import { useEffect, useMemo, useRef } from "react";
import { FaCalendarAlt, FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useExplorePage } from "../../hooks/useExplorePage";
import "./Explore.css";

const getFallbackImage = (type: string) => {
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
    case "ATTRACTION":
      return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&q=75&auto=format&fit=crop";
    default:
      return "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=75&auto=format&fit=crop";
  }
};

const Explore = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    activeCategory,
    events,
    filteredPlaces,
    closeSuggestions,
    handleSearchTextChange,
    loading,
    locationText,
    openSuggestions,
    selectedSuggestion,
    searchText,
    showSuggestions,
    suggestions,
    selectSuggestion,
    setActiveCategory,
    setLocationText,
  } = useExplorePage();
  const tt = (key: string, defaultValue: string) => t(key, { defaultValue });
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

  const categories = [
    { key: "all", label: tt("explore.categories.all", "All") },
    { key: "events", label: tt("explore.categories.events", "Events") },
    { key: "RESTAURANT", label: tt("explore.categories.restaurant", "Restaurant") },
    { key: "CAFE", label: tt("explore.categories.cafe", "Cafe") },
    { key: "ATTRACTION", label: tt("explore.categories.attraction", "Attraction") },
    { key: "MUSEUM", label: tt("explore.categories.museum", "Museum") },
    { key: "PARK", label: tt("explore.categories.park", "Park") },
    { key: "HISTORICAL", label: tt("explore.categories.historical", "Historical") },
  ];
  const activeCategoryLabel = useMemo(
    () =>
      categories.find((category) => category.key === activeCategory)?.label ??
      tt("explore.categories.all", "All"),
    [activeCategory, categories, tt],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(target)) {
        closeSuggestions();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSuggestions();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSuggestions]);

  const getSuggestionBadge = (kind: "place" | "event" | "city" | "country") => {
    if (kind === "place") {
      return tt("explore.suggestions.place", "Place");
    }
    if (kind === "event") {
      return tt("explore.suggestions.event", "Event");
    }
    if (kind === "city") {
      return tt("explore.suggestions.city", "City");
    }
    return tt("explore.suggestions.country", "Country");
  };

  return (
    <div className="explore-page">
        <div className="hero-section">
          <h1>{tt("explore.hero.title", "Explore Places")}</h1>
          <p>{tt("explore.hero.subtitle", "Discover amazing destinations around the world")}</p>
          <div className="search-box">
            <div className="explore-search-fields">
              <div className="explore-search-autocomplete" ref={suggestionBoxRef}>
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => handleSearchTextChange(event.target.value)}
                  onFocus={openSuggestions}
                  placeholder={tt("explore.hero.searchPlaceholder", "Search places and events...")}
                  className="explore-search-input"
                />
                {showSuggestions ? (
                  <div className="explore-suggestions-dropdown">
                    {suggestions.length > 0 ? (
                      suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="explore-suggestion-row"
                          onClick={() => selectSuggestion(suggestion)}>
                          <span className="explore-suggestion-main">
                            <span>{suggestion.label}</span>
                            {suggestion.secondary ? (
                              <small>{suggestion.secondary}</small>
                            ) : null}
                          </span>
                          <span className="explore-suggestion-badge">
                            {getSuggestionBadge(suggestion.kind)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="explore-suggestions-empty">
                        {tt("explore.suggestions.empty", "No matching suggestions")}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
              <input
                type="search"
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
                placeholder={tt(
                  "explore.hero.locationPlaceholder",
                  "Filter by city or country...",
                )}
                className="explore-search-input"
              />
            </div>
            {selectedSuggestion ? (
              <p className="explore-selected-suggestion-note">
                {tt("explore.suggestions.selected", "Selected suggestion")}:{" "}
                <strong>{selectedSuggestion.label}</strong>
              </p>
            ) : null}
          </div>
        </div>

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
            {events.length > 0 ? (
              <>
                <h2 className="explore-section-title">{tt("explore.sections.events", "Events")}</h2>
                <div className="grid">
                  {events.map((event) => (
                    <div className="place-card" key={event.id}>
                      <div className="place-image">
                        <img
                          src={event.imageUrl || getFallbackImage("ATTRACTION")}
                          alt={event.title}
                          onError={({ currentTarget }) => {
                            currentTarget.onerror = null;
                            currentTarget.src = getFallbackImage("ATTRACTION");
                          }}
                        />
                      </div>

                      <div className="place-content">
                        <h3 className="place-title">{event.title}</h3>

                        <p className="place-city">
                          <FaMapMarkerAlt className="place-icon" />
                          {event.venue?.city?.name ?? event.venue?.name ?? "-"}
                        </p>
                        <p className="place-description">{event.description}</p>

                        <div className="place-meta">
                          <span className="place-rating">
                            <FaCalendarAlt className="place-star" />
                            {event.startDate ? new Date(event.startDate).toLocaleDateString() : "-"}
                          </span>
                          <span className="place-type">{tt("explore.labels.event", "Event")}</span>
                        </div>
                        <button
                          type="button"
                          className="view-details-btn"
                          onClick={() => navigate(`/events/${event.id}`)}>
                          {tt("explore.actions.viewDetails", "View details")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {filteredPlaces.length > 0 ? (
              <>
                <h2 className="explore-section-title">{tt("explore.sections.places", "Places")}</h2>
                <div className="grid">
                  {filteredPlaces.map((place) => (
                    <div className="place-card" key={place.id}>
                      <div className="place-image">
                        <img
                          src={place.imageUrl || getFallbackImage(place.type)}
                          alt={place.name}
                          onError={({ currentTarget }) => {
                            currentTarget.onerror = null;
                            currentTarget.src = getFallbackImage(place.type);
                          }}
                        />
                      </div>

                      <div className="place-content">
                        <h3 className="place-title">{place.name}</h3>

                        <p className="place-city">
                          <FaMapMarkerAlt className="place-icon" />
                          {place.city?.name}
                        </p>
                        <p className="place-description">{place.description}</p>

                        <div className="place-meta">
                          <span className="place-rating">
                            <FaStar className="place-star" />
                            {place.ratingAverage} ({place.ratingCount})
                          </span>
                          <span className="place-type">{place.type}</span>
                        </div>
                        <button
                          type="button"
                          className="view-details-btn"
                          onClick={() => navigate(`/places/${place.id}`)}>
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
      </div>
  );
};

export default Explore;
