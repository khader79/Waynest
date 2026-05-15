import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { message } from "antd";
import { fetchAllCountries, fetchAllCities } from "@/api/catalog";

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.data))
    return payload.data;
  return [];
};

export const useDestinationsPage = () => {
  const { t } = useTranslation();
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");

  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoading(true);
        const payload = await fetchAllCountries();
        setCountries(extractItems(payload));
      } catch {
        message.error(t("toasts.destinationsPage.failedToLoadCountries"));
      } finally {
        setLoading(false);
      }
    };

    const loadCities = async () => {
      try {
        const payload = await fetchAllCities();
        setCities(extractItems(payload));
      } catch {
        // cities failing doesn't block country display
      }
    };

    void loadCountries();
    void loadCities();
  }, []);

  // attach cities to countries once both are loaded
  const countriesWithCities = useMemo(
    () =>
      countries.map((country) => ({
        ...country,
        cities: cities.filter(
          (city) =>
            city.country?.id === country.id || city.countryId === country.id,
        ),
      })),
    [countries, cities],
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const baseList = useMemo(() => {
    if (!normalizedSearchQuery) {
      return countriesWithCities;
    }

    return countriesWithCities.filter((country) => {
      const cityNames = Array.isArray(country.cities)
        ? country.cities.map((city) => city.name).join(" ")
        : "";
      const searchableText = [
        country.name,
        country.nativeName,
        country.capital,
        country.region,
        country.subregion,
        country.alpha2Code,
        country.alpha3Code,
        cityNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    });
  }, [countriesWithCities, normalizedSearchQuery]);

  const filteredCountries = useMemo(
    () =>
      selectedRegion === "All"
        ? baseList
        : baseList.filter((c) => c.region === selectedRegion),
    [baseList, selectedRegion],
  );

  return {
    filteredCountries,
    loading,
    searchQuery,
    selectedRegion,
    setSearchQuery,
    setSelectedRegion,
  };
};
