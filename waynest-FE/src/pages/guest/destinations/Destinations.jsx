import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDestinationsPage } from "@/hooks/public/useDestinationsPage";
import "./Destinations.css";

const isTwoLetterCountryCode = (value) =>
  typeof value === "string" && /^[A-Z]{2}$/i.test(value.trim());

const getCountryCardKey = (country) =>
  country?.id ?? country?.alpha2Code ?? country?.name ?? "unknown";

const getCountryFlagImageUrl = (country) => {
  const explicitFlagUrl =
    typeof country?.flagUrl === "string" ? country.flagUrl.trim() : "";
  if (explicitFlagUrl) {
    return explicitFlagUrl;
  }

  if (!isTwoLetterCountryCode(country?.alpha2Code)) {
    return "";
  }

  return `https://flagcdn.com/w640/${country.alpha2Code.trim().toLowerCase()}.png`;
};

const getCountryFlagEmoji = (alpha2Code) => {
  if (typeof alpha2Code !== "string") {
    return "🏳️";
  }

  const code = alpha2Code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return "🏳️";
  }

  return String.fromCodePoint(
    ...Array.from(code, (char) => 127397 + char.charCodeAt(0)),
  );
};

const Destinations = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [brokenFlags, setBrokenFlags] = useState(() => new Set());
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

  const openCountryExplore = (country) => {
    const params = new URLSearchParams();
    params.set("location", country.name);

    if (typeof country.id === "string" && country.id.trim()) {
      params.set("countryId", country.id);
    }

    if (isTwoLetterCountryCode(country.alpha2Code)) {
      params.set("countryCode", country.alpha2Code.trim().toUpperCase());
    }

    navigate(`/explore?${params.toString()}`);
  };

  const markFlagBroken = (countryKey) => {
    setBrokenFlags((current) => {
      if (current.has(countryKey)) {
        return current;
      }

      const next = new Set(current);
      next.add(countryKey);
      return next;
    });
  };

  return (
    <div className="destinations-page">
      <div className="destinations-page__shell">
        <header className="dest-hero">
          <div className="dest-hero__inner">
            <span className="dest-hero__eyebrow">
              {t("destinations.hero.eyebrow", {
                defaultValue: t("geo.eyebrow"),
              })}
            </span>
            <h1 className="dest-hero__title">{t("destinations.hero.title")}</h1>
            <p className="dest-hero__sub">{t("destinations.hero.subtitle")}</p>
            <div className="dest-hero__search">
              <svg
                className="dest-hero__search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
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
          })}>
          <div className="filter-bar">
            {regions.map((region) => (
              <button
                key={region.key}
                type="button"
                className={selectedRegion === region.key ? "active" : ""}
                onClick={() => setSelectedRegion(region.key)}>
                {region.label}
              </button>
            ))}
          </div>
        </nav>

        {loading ? (
          <div className="loading-state">
            <div className="dest-sk-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="dest-sk-card" />
              ))}
            </div>
          </div>
        ) : (
          <div className="destinations-grid">
            {filteredCountries.length === 0 ? (
              <div className="empty-state">
                <p>{t("destinations.emptyState")}</p>
              </div>
            ) : (
              filteredCountries.map((country) => (
                <div
                  key={getCountryCardKey(country)}
                  className="destination-card"
                  onClick={() => openCountryExplore(country)}>
                  {(() => {
                    const countryKey = getCountryCardKey(country);
                    const flagUrl = getCountryFlagImageUrl(country);
                    const showFlagImage =
                      flagUrl && !brokenFlags.has(countryKey);

                    return showFlagImage ? (
                      <div className="flag-container">
                        <img
                          src={flagUrl}
                          alt={t("destinations.flagAlt", {
                            country: country.name,
                            defaultValue: `${country.name} flag`,
                          })}
                          className="flag"
                          loading="lazy"
                          onError={() => markFlagBroken(countryKey)}
                        />
                      </div>
                    ) : (
                      <div className="flag-container flag-container--fallback">
                        <span
                          className="flag-fallback"
                          role="img"
                          aria-label={t("destinations.flagAlt", {
                            country: country.name,
                            defaultValue: `${country.name} flag`,
                          })}>
                          {getCountryFlagEmoji(country.alpha2Code)}
                        </span>
                      </div>
                    );
                  })()}
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
