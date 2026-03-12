import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Destinations.css";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get } from "../../../../api/apiService";
import { message } from "antd";

interface Country {
  id: string;
  name: string;
  nativeName?: string;
  alpha2Code: string;
  alpha3Code: string;
  region?: string;
  capital?: string;
  flagUrl?: string;
  cities?: City[];
}

interface City {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  population?: number;
}

const Destinations = () => {
  const { t } = useTranslation();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const navigate = useNavigate();

  const regions = [
    { key: "All", label: t("destinations.regions.all") },
    { key: "Asia", label: t("destinations.regions.asia") },
    { key: "Europe", label: t("destinations.regions.europe") },
    { key: "Africa", label: t("destinations.regions.africa") },
    { key: "Americas", label: t("destinations.regions.americas") },
    { key: "Oceania", label: t("destinations.regions.oceania") },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [countriesData, citiesData] = await Promise.all([
          get(ADMIN_ENDPOINTS.COUNTRIES_LIST),
          get(ADMIN_ENDPOINTS.CITIES_LIST(1)),
        ]);

        const countriesList = Array.isArray(countriesData) ? countriesData : [];
        const citiesList = Array.isArray(citiesData) ? citiesData : [];

        // Group cities by country
        const countriesWithCities = countriesList.map((country: Country) => ({
          ...country,
          cities: citiesList.filter(
            (city: any) => city.country?.id === country.id || city.countryId === country.id
          ),
        }));

        setCountries(countriesWithCities);
      } catch (error) {
        message.error("Failed to load destinations");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCountries = countries.filter((country) => {
    const matchesSearch =
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.nativeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.capital?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRegion =
      selectedRegion === "All" || country.region === selectedRegion;

    return matchesSearch && matchesRegion;
  });

  const getRegionLabel = (regionKey: string) => {
    const region = regions.find((r) => r.key === regionKey);
    return region ? region.label : regionKey;
  };

  const handleCountryClick = (countryId: string) => {
    navigate(`/destinations/${countryId}`);
  };

  return (
    <div className="destinations-page">
      <div className="hero-section">
        <h1>{t("destinations.hero.title")}</h1>
        <p>{t("destinations.hero.subtitle")}</p>
        <div className="search-box">
          <input
            type="text"
            placeholder={t("destinations.hero.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-bar">
        {regions.map((region) => (
          <button
            key={region.key}
            className={selectedRegion === region.key ? "active" : ""}
            onClick={() => setSelectedRegion(region.key)}
          >
            {region.label}
          </button>
        ))}
      </div>

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
                onClick={() => handleCountryClick(country.id)}
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
                  {country.nativeName && country.nativeName !== country.name && (
                    <p className="native-name">{country.nativeName}</p>
                  )}
                  <div className="destination-info">
                    {country.capital && (
                      <div className="info-item">
                        <span className="info-label">{t("destinations.labels.capital")}</span>
                        <span>{country.capital}</span>
                      </div>
                    )}
                    {country.region && (
                      <div className="info-item">
                        <span className="info-label">{t("destinations.labels.region")}</span>
                        <span>{getRegionLabel(country.region)}</span>
                      </div>
                    )}
                    {country.cities && country.cities.length > 0 && (
                      <div className="info-item">
                        <span className="info-label">{t("destinations.labels.cities")}</span>
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
                          +{country.cities.length - 3} {t("destinations.labels.more")}
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
  );
};

export default Destinations;
