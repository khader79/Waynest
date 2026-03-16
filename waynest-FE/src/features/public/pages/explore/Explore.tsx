import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import "./Explore.css";
import { get } from "../../../../api/apiService";
import { GENERAL_ENDPOINTS } from "../../../../api/endpoints";
import { FaMapMarkerAlt, FaStar } from "react-icons/fa";

interface PlacesData {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  ratingAverage: string;
  ratingCount: number;
  slug: string;
  latitude: string;
  longitude: string;
  type: string;
  city?: {
    name: string;
  };
}
const Explore = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState("all");
  const [places, setPlaces] = useState<PlacesData[]>([]);

  const categories = [
    { key: "all", label: t("explore.categories.all") },
    { key: "restaurant", label: t("explore.categories.restaurant") },
    { key: "cafe", label: t("explore.categories.cafe") },
    { key: "attraction", label: t("explore.categories.attraction") },
    { key: "museum", label: t("explore.categories.museum") },
    { key: "park", label: t("explore.categories.park") },
    { key: "historical", label: t("explore.categories.historical") },
  ];

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
  useEffect(() => {
    const place = () => {
      get(GENERAL_ENDPOINTS.PLACE)
        .then((response) => {
          setPlaces(response.data);
        })
        .catch((error) => {});
    };

    place();
  }, []);
  return (
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
                  width: "900px",
                }),
              },
            }}
          />
        </div>
      </div>

      <div className="filter-bar">
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={active === cat.key ? "active" : ""}
            onClick={() => setActive(cat.key)}>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid">
        {places.map((place) => (
          <div className="place-card" key={place.id}>
            <div className="place-image">
              <img
                src={place.imageUrl || getFallbackImage(place.type)}
                alt={place.name}
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
    </div>
  );
};

export default Explore;
