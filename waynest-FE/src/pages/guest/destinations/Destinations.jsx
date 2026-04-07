import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDestinationsPage } from "@/hooks/public/useDestinationsPage";
import "./Destinations.css";

const Destinations = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    filteredCountries,
    loading,
    searchQuery,
    selectedRegion,
    setSearchQuery,
    setSelectedRegion,
  } = useDestinationsPage();

  const regions = [
    { key: "All", label: t("destinations.regions.all") },
    { key: "Asia", label: t("destinations.regions.asia") },
    { key: "Europe", label: t("destinations.regions.europe") },
    { key: "Africa", label: t("destinations.regions.africa") },
    { key: "Americas", label: t("destinations.regions.americas") },
    { key: "Oceania", label: t("destinations.regions.oceania") },
  ];

  const getRegionLabel = (regionKey) => {
    const region = regions.find((entry) => entry.key === regionKey);
    return region ? region.label : regionKey;
  };

  return (
    <div className="destinations-page">
      <div className="destinations-page__shell">
        <header className="dest-hero">
          <div className="dest-hero__inner">
            <span className="dest-hero__eyebrow">Explore the World</span>
            <h1 className="dest-hero__title">{t("destinations.hero.title")}</h1>
            <p className="dest-hero__sub">{t("destinations.hero.subtitle")}</p>
            <div className="dest-hero__search">
              <svg
                className="dest-hero__search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={t("destinations.hero.searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
        </header>

        <nav
          className="dest-filter-wrap"
          aria-label={t("destinations.filtersNav", {
            defaultValue: "Filter by region",
          })}
        >
          <div className="filter-bar">
            {regions.map((region) => (
              <button
                key={region.key}
                type="button"
                className={selectedRegion === region.key ? "active" : ""}
                onClick={() => setSelectedRegion(region.key)}
              >
                {region.label}
              </button>
            ))}
          </div>
        </nav>

        {loading ? (
          <div className="loading-state">{t("destinations.loading")}</div>
        ) : (
          <div className="destinations-grid">
            {filteredCountries.length === 0 ? (
              <div className="empty-state">
                <p>{t("destinations.emptyState")}</p>
              </div>
            ) : (
              filteredCountries.map((country) => (
                <div
                  key={country.id}
                  className="destination-card"
                  onClick={() =>
                    navigate(
                      `/explore?location=${encodeURIComponent(country.name)}`,
                    )
                  }
                >
                  {country.flagUrl && (
                    <div className="flag-container">
                      <img
                        src={country.flagUrl}
                        alt={`${country.name} flag`}
                        className="flag"
                      />
                    </div>
                  )}
                  <div className="destination-content">
                    <h3>{country.name}</h3>
                    {country.nativeName &&
                      country.nativeName !== country.name && (
                        <p className="native-name">{country.nativeName}</p>
                      )}
                    <div className="destination-info">
                      {country.capital && (
                        <div className="info-item">
                          <span className="info-label">
                            {t("destinations.labels.capital")}
                          </span>
                          <span>{country.capital}</span>
                        </div>
                      )}
                      {country.region && (
                        <div className="info-item">
                          <span className="info-label">
                            {t("destinations.labels.region")}
                          </span>
                          <span>{getRegionLabel(country.region)}</span>
                        </div>
                      )}
                      {country.cities && country.cities.length > 0 && (
                        <div className="info-item">
                          <span className="info-label">
                            {t("destinations.labels.cities")}
                          </span>
                          <span>{country.cities.length}</span>
                        </div>
                      )}
                    </div>
                    {country.cities && country.cities.length > 0 && (
                      <div className="cities-preview">
                        {country.cities.slice(0, 3).map((city) => (
                          <span key={city.id} className="city-tag">
                            {city.name}
                          </span>
                        ))}
                        {country.cities.length > 3 && (
                          <span className="city-tag more">
                            +{country.cities.length - 3}{" "}
                            {t("destinations.labels.more")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Destinations;
