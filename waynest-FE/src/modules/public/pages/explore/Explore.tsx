import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useExplorePage } from "../../hooks/useExplorePage";
import "./Explore.css";

const exploreStyles = `
@keyframes explorePulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.48;
  }
}

.explore-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.explore-skeleton-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--panel-border-strong);
  background: var(--color-surface-gradient);
  box-shadow: var(--panel-shadow-card);
}

.explore-skeleton-image,
.explore-skeleton-line,
.explore-skeleton-pill {
  animation: explorePulse 1.4s ease-in-out infinite;
  background: color-mix(in srgb, var(--color-text-secondary) 14%, transparent);
}

.explore-skeleton-image {
  height: 200px;
  border-bottom: 1px solid var(--panel-border);
}

.explore-skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px 20px;
}

.explore-skeleton-line {
  height: 14px;
  border-radius: var(--radius-full);
}

.explore-skeleton-line.title {
  height: 22px;
  width: 62%;
}

.explore-skeleton-line.city {
  width: 38%;
}

.explore-skeleton-line.description {
  width: 100%;
}

.explore-skeleton-line.description-short {
  width: 84%;
}

.explore-skeleton-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.explore-skeleton-pill {
  height: 14px;
  width: 84px;
  border-radius: var(--radius-full);
}

.explore-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border: 1px solid var(--panel-border-strong);
  border-radius: var(--radius-lg);
  background: var(--color-surface-gradient);
  color: var(--color-text-secondary);
  font-size: 16px;
  box-shadow: var(--panel-shadow-card);
}
`;

const getFallbackImage = (type: string) => {
  switch (type) {
    case "RESTAURANT":
      return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4";
    case "CAFE":
      return "https://images.unsplash.com/photo-1509042239860-f550ce710b93";
    case "MUSEUM":
      return "https://images.unsplash.com/photo-1566127992631-137a642a90f4";
    case "PARK":
      return "https://images.unsplash.com/photo-1501785888041-af3ef285b470";
    case "HISTORICAL":
      return "https://images.unsplash.com/photo-1600628422019-6c9b5b6f2a4b";
    case "SHOP":
      return "https://images.unsplash.com/photo-1441986300917-64674bd600d8";
    case "ATTRACTION":
      return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee";
    default:
      return "https://images.unsplash.com/photo-1506744038136-46273834b3fb";
  }
};

const Explore = () => {
  const { t } = useTranslation();
  const { activeCategory, filteredPlaces, loading, setActiveCategory } = useExplorePage();

  const categories = [
    { key: "all", label: t("explore.categories.all") },
    { key: "RESTAURANT", label: t("explore.categories.restaurant") },
    { key: "CAFE", label: t("explore.categories.cafe") },
    { key: "ATTRACTION", label: t("explore.categories.attraction") },
    { key: "MUSEUM", label: t("explore.categories.museum") },
    { key: "PARK", label: t("explore.categories.park") },
    { key: "HISTORICAL", label: t("explore.categories.historical") },
  ];

  return (
    <>
      <style>{exploreStyles}</style>
      <div className="explore-page">
        <div className="hero-section">
          <h1>{t("explore.hero.title")}</h1>
          <p>{t("explore.hero.subtitle")}</p>
          <div className="search-box">
            <GooglePlacesAutocomplete
              apiKey={import.meta.env.VITE_GOOGLE_PLACES_KEY}
              selectProps={{
                classNamePrefix: "gpa",
                placeholder: t("explore.hero.searchPlaceholder"),
                styles: {
                  container: (provided) => ({
                    ...provided,
                    maxWidth: "900px",
                    width: "100%",
                  }),
                },
              }}
            />
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
                  <div className="explore-skeleton-line title" />
                  <div className="explore-skeleton-line city" />
                  <div className="explore-skeleton-line description" />
                  <div className="explore-skeleton-line description-short" />
                  <div className="explore-skeleton-meta">
                    <div className="explore-skeleton-pill" />
                    <div className="explore-skeleton-pill" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="explore-empty-state">No places found</div>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Explore;
