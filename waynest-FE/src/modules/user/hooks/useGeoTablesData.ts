import { useEffect, useState } from "react";
import { fetchCities, fetchCountries, fetchCurrencies } from "@/services/catalog/catalog.service";

type Country = {
  id: string;
  name: string;
  alpha2Code: string;
  alpha3Code: string;
  region?: string;
  capital?: string;
};

type City = {
  id: string;
  name: string;
  stateName?: string;
  population?: number;
  latitude?: number;
  longitude?: number;
};

type Currency = {
  id: string;
  code: string;
  name: string;
  fractionSize?: number;
};

const extractItems = <T,>(payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: T[] }).data)
  ) {
    return (payload as { data: T[] }).data;
  }

  return [] as T[];
};

export const useGeoTablesData = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [countriesPayload, citiesPayload, currenciesPayload] =
          await Promise.all([
            fetchCountries(1, 10),
            fetchCities(1),
            fetchCurrencies(),
          ]);

        setCountries(extractItems<Country>(countriesPayload));
        setCities(extractItems<City>(citiesPayload));
        setCurrencies(extractItems<Currency>(currenciesPayload));
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
    loading,
  };
};
