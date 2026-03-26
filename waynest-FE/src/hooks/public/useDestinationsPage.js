import { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { fetchAllCities, fetchAllCountries } from "@/api/catalog";





















const extractItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
  payload &&
  typeof payload === "object" &&
  Array.isArray(payload.data))
  {
    return payload.data;
  }

  return [];
};

export const useDestinationsPage = () => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [countriesPayload, citiesPayload] = await Promise.all([
        fetchAllCountries(),
        fetchAllCities()]
        );

        const countriesList = extractItems(countriesPayload);
        const citiesList = extractItems(

          citiesPayload);

        const countriesWithCities = countriesList.map((country) => ({
          ...country,
          cities: citiesList.filter(
            (city) =>
            city.country?.id === country.id || city.countryId === country.id
          )
        }));

        setCountries(countriesWithCities);
      } catch {
        message.error("Failed to load destinations");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const filteredCountries = useMemo(
    () =>
    countries.filter((country) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
      country.name.toLowerCase().includes(query) ||
      country.nativeName?.toLowerCase().includes(query) ||
      country.capital?.toLowerCase().includes(query);
      const matchesRegion =
      selectedRegion === "All" || country.region === selectedRegion;

      return Boolean(matchesSearch && matchesRegion);
    }),
    [countries, searchQuery, selectedRegion]
  );

  return {
    filteredCountries,
    loading,
    searchQuery,
    selectedRegion,
    setSearchQuery,
    setSelectedRegion
  };
};