import { useEffect, useState } from "react";
import {
  fetchAllCities,
  fetchAllCountries,
  fetchAllCurrencies } from
"@/modules/public/api/catalog";


























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

export const useGeoTablesData = () => {
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [countriesPayload, citiesPayload, currenciesPayload] = await Promise.all([
        fetchAllCountries(),
        fetchAllCities(),
        fetchAllCurrencies()]
        );

        setCountries(extractItems(countriesPayload));
        setCities(extractItems(citiesPayload));
        setCurrencies(extractItems(currenciesPayload));
      } catch {
        setError("Failed to load location data.");
      } finally {
        setLoading(false);
      }
    };

    void fetchGeoData();
  }, []);

  return {
    cities,
    countries,
    currencies,
    error,
    loading
  };
};