import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { FaMapMarkerAlt, FaStar } from "react-icons/fa";
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
  const { activeCategory, filteredPlaces, loading, setActiveCategory } = useExplorePage();
  const googlePlacesKey = (import.meta.env.VITE_GOOGLE_PLACES_KEY as string | undefined)?.trim();
  const canUseGooglePlaces = Boolean(googlePlacesKey);
  const tt = (key: string, defaultValue: string) => t(key, { defaultValue });

  const categories = [
    { key: "all", label: tt("explore.categories.all", "All") },
    { key: "RESTAURANT", label: tt("explore.categories.restaurant", "Restaurant") },
    { key: "CAFE", label: tt("explore.categories.cafe", "Cafe") },
    { key: "ATTRACTION", label: tt("explore.categories.attraction", "Attraction") },
    { key: "MUSEUM", label: tt("explore.categories.museum", "Museum") },
    { key: "PARK", label: tt("explore.categories.park", "Park") },
    { key: "HISTORICAL", label: tt("explore.categories.historical", "Historical") },
  ];

  return (
    <div className="explore-page">
        <div className="hero-section">
          <h1>{tt("explore.hero.title", "Explore Places")}</h1>
          <p>{tt("explore.hero.subtitle", "Discover amazing destinations around the world")}</p>
          <div className="search-box">
            {canUseGooglePlaces ? (
              <GooglePlacesAutocomplete
                apiKey={googlePlacesKey}
                selectProps={{
                  classNamePrefix: "gpa",
                  placeholder: tt("explore.hero.searchPlaceholder", "Search places..."),
                  styles: {
                    container: (provided) => ({
                      ...provided,
                      maxWidth: "900px",
                      width: "100%",
                    }),
                  },
                }}
              />
            ) : (
              <div style={{ width: "100%", maxWidth: "900px" }}>
                <input
                  disabled
                  value={tt(
                    "explore.hero.googleUnavailable",
                    "Google Places search is unavailable in this environment.",
                  )}
                  aria-label="Google Places unavailable"
                  style={{
                    width: "100%",
                    height: "44px",
                    borderRadius: "8px",
                    border: "1px solid #d9d9d9",
                    padding: "0 12px",
                    color: "#6b7280",
                    background: "#f9fafb",
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="filter-bar">
          {categories.map((category) => (
            <button
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
        ) : filteredPlaces.length === 0 ? (
          <div className="explore-empty-state">{tt("explore.emptyState", "No places found")}</div>
        ) : (
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
                    onClick={() => navigate(`/places/${place.id}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
};

export default Explore;
