import { get } from "@/api/request";

export const fetchPublicPlaces = async (
  limit = 18,
  country = null,
  city = null,
) => {
  const params = new URLSearchParams({ page: "1", limit: String(limit) });
  if (country) params.set("country", country);
  if (city) params.set("city", city);
  return get(`/place?${params.toString()}`);
};

export const fetchPlaceById = async (id, currency) => {
  const params = new URLSearchParams();
  if (currency) params.set("currency", currency);
  const q = params.toString();
  return get(`/place/${id}${q ? `?${q}` : ""}`);
};

export const fetchPublicEvents = async (limit = 18) =>
  get(`/events?page=1&limit=${limit}`);

export const fetchEventById = async (id, currency) => {
  const params = new URLSearchParams();
  if (currency) params.set("currency", currency);
  const q = params.toString();
  return get(`/events/${id}${q ? `?${q}` : ""}`);
};

export const searchCountries = async (query, page = 1, limit = 50) =>
  get(
    `/countries?page=${page}&limit=${limit}&search=${encodeURIComponent(query)}`,
  );

export const fetchAllCountries = async () => {
  const first = await get(`/countries?page=1&limit=50`);
  const lastPage = first?.lastPage ?? 1;
  if (lastPage <= 1) return first;

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, i) =>
      get(`/countries?page=${i + 2}&limit=50`),
    ),
  );

  return {
    ...first,
    data: [...(first?.data ?? []), ...rest.flatMap((p) => p?.data ?? [])],
  };
};

const normalizeCityPageSize = (raw) => {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return 2000;
  }
  return Math.min(Math.floor(n), 2000);
};

/** Single page; optional search (server-side ILIKE). Use for selects — do not load all rows. */
export const searchCities = (search = "", page = 1, limit = 120) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const q = typeof search === "string" ? search.trim() : "";
  if (q) {
    params.set("search", q);
  }
  return get(`/cities?${params.toString()}`);
};

/**
 * First page only (large city tables must use {@link searchCities} + user search).
 * Do not pass directly as react-query `queryFn` — use `() => fetchAllCities()`.
 */
export const fetchAllCities = async (pageSizeArg) => {
  const pageSize = normalizeCityPageSize(pageSizeArg);
  return get(`/cities?page=1&limit=${pageSize}`);
};

export const fetchAllCurrencies = async (pageSize = 1000) => {
  const first = await get(`/currencies?page=1&limit=${pageSize}`);
  const lastPage = first?.lastPage ?? 1;
  if (lastPage <= 1) return first;

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, i) =>
      get(`/currencies?page=${i + 2}&limit=${pageSize}`),
    ),
  );

  return {
    ...first,
    data: [...(first?.data ?? []), ...rest.flatMap((p) => p?.data ?? [])],
  };
};

export const fetchCitiesByCountry = async (countryId) =>
  get(`/cities/by-country/${countryId}`);

export const fetchCityById = async (cityId) => get(`/cities/${cityId}`);
export const fetchTags = async () => get("/tag");
