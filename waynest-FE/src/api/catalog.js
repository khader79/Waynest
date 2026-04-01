import { get } from "@/api/request";

export const fetchPublicPlaces = async (limit = 18, country = null, city = null) => {
  const params = new URLSearchParams({ page: '1', limit: String(limit) });
  if (country) params.set('country', country);
  if (city) params.set('city', city);
  return get(`/place?${params.toString()}`);
};

export const fetchPlaceById = async (id) => get(`/place/${id}`);

export const fetchPublicEvents = async (limit = 18) =>
  get(`/events?page=1&limit=${limit}`);

export const fetchEventById = async (id) => get(`/events/${id}`);

export const searchCountries = async (query, page = 1, limit = 50) =>
  get(`/countries?page=${page}&limit=${limit}&search=${encodeURIComponent(query)}`);

export const fetchAllCountries = async () => {
  const first = await get(`/countries?page=1&limit=50`);
  const lastPage = first?.lastPage ?? 1;
  if (lastPage <= 1) return first;

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, i) =>
      get(`/countries?page=${i + 2}&limit=50`)
    )
  );

  return {
    ...first,
    data: [
      ...(first?.data ?? []),
      ...rest.flatMap((p) => p?.data ?? []),
    ],
  };
};

export const fetchAllCities = async (limit = 1000) =>
  get(`/cities?page=1&limit=${limit}`);

export const fetchAllCurrencies = async (limit = 1000) =>
  get(`/currencies?page=1&limit=${limit}`);

export const fetchCitiesByCountry = async (countryId) =>
  get(`/cities/by-country/${countryId}`);

export const fetchCityById = async (cityId) => get(`/cities/${cityId}`);
export const fetchTags = async () => get("/tag");
