import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { message } from "antd";
import {
  fetchAllCountries,
  fetchAllCities,
  searchCountries,
} from "@/api/catalog";
import { isApiCanceledError } from "@/utils/errors";
import { CATALOG_SEARCH_DEBOUNCE_MS } from "@/utils/performance";

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
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const debounceRef = useRef(null);

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

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const payload = await searchCountries(searchQuery.trim(), 1, 50, {
          signal: controller.signal,
        });
        if (!active) {
          return;
        }
        setSearchResults(extractItems(payload));
      } catch (error) {
        if (!active || isApiCanceledError(error)) {
          return;
        }
        message.error(t("toasts.destinationsPage.searchFailed"));
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, CATALOG_SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [searchQuery]);

  const baseList = searchQuery.trim() ? searchResults : countriesWithCities;

  const filteredCountries = useMemo(
    () =>
      selectedRegion === "All"
        ? baseList
        : baseList.filter((c) => c.region === selectedRegion),
    [baseList, selectedRegion],
  );

  return {
    filteredCountries,
    loading: loading || searching,
    searchQuery,
    selectedRegion,
    setSearchQuery,
    setSelectedRegion,
  };
};
