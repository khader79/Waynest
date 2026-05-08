import { get } from "@/api/request";
import {
  CITIES_BY_COUNTRY_CACHE_MAX_ENTRIES,
  CITIES_BY_COUNTRY_CACHE_TTL_MS,
  SEARCH_CACHE_MAX_ENTRIES,
  SEARCH_CACHE_TTL_MS,
} from "@/utils/performance";
import { createRequestCache } from "@/utils/requestCache";

const searchCache = createRequestCache({
  ttlMs: SEARCH_CACHE_TTL_MS,
  maxEntries: SEARCH_CACHE_MAX_ENTRIES,
});

const citiesByCountryCache = createRequestCache({
  ttlMs: CITIES_BY_COUNTRY_CACHE_TTL_MS,
  maxEntries: CITIES_BY_COUNTRY_CACHE_MAX_ENTRIES,
});

const sanitizeRequestConfig = (config) => {
  if (!config || typeof config !== "object") {
    return {};
  }
  return config;
};

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

export const fetchLandingStats = async () => get("/public/landing-stats");

export const fetchEventById = async (id, currency) => {
  const params = new URLSearchParams();
  if (currency) params.set("currency", currency);
  const q = params.toString();
  return get(`/events/${id}${q ? `?${q}` : ""}`);
};

export const searchCountries = async (query, page = 1, limit = 50, config) => {
  const q = typeof query === "string" ? query.trim() : "";
  const requestConfig = sanitizeRequestConfig(config);
  const key = `countries:${q}:${page}:${limit}`;
  const url = `/countries?page=${page}&limit=${limit}&search=${encodeURIComponent(q)}`;

  return searchCache.run(key, () => get(url, requestConfig), requestConfig);
};

const COUNTRIES_PAGE_SIZE = 100;

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }
  return Math.floor(parsed);
};

export const fetchAllCountries = async () => {
  const first = await get(`/countries?page=1&limit=${COUNTRIES_PAGE_SIZE}`);

  if (Array.isArray(first)) {
    return first;
  }

  const firstPageData = Array.isArray(first?.data) ? first.data : [];
  const lastPageFromApi = parsePositiveInt(first?.lastPage);
  const totalFromApi = parsePositiveInt(first?.total);
  const inferredLastPage = totalFromApi
    ? Math.ceil(totalFromApi / COUNTRIES_PAGE_SIZE)
    : 1;
  const lastPage = lastPageFromApi ?? inferredLastPage;

  if (lastPage <= 1) {
    return {
      ...first,
      data: firstPageData,
      total: totalFromApi ?? firstPageData.length,
      page: 1,
      lastPage: 1,
    };
  }

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, i) =>
      get(`/countries?page=${i + 2}&limit=${COUNTRIES_PAGE_SIZE}`),
    ),
  );

  const allCountries = [
    ...firstPageData,
    ...rest.flatMap((p) => (Array.isArray(p?.data) ? p.data : [])),
  ];

  return {
    ...first,
    data: allCountries,
    total: totalFromApi ?? allCountries.length,
    page: 1,
    lastPage,
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
export const searchCities = (search = "", page = 1, limit = 120, config) => {
  const requestConfig = sanitizeRequestConfig(config);
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const q = typeof search === "string" ? search.trim() : "";
  if (q) {
    params.set("search", q);
  }
  const key = `cities:${q}:${page}:${limit}`;
  return searchCache.run(
    key,
    () => get(`/cities?${params.toString()}`, requestConfig),

    requestConfig,
  );
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

export const fetchCitiesByCountry = async (countryId, config) => {
  const normalizedCountryId = String(countryId ?? "").trim();
  if (!normalizedCountryId) {
    return [];
  }

  const requestConfig = sanitizeRequestConfig(config);
  const key = `cities-by-country:${normalizedCountryId}`;
  const path = `/cities/by-country/${encodeURIComponent(normalizedCountryId)}`;

  return citiesByCountryCache.run(
    key,
    () => get(path, requestConfig),
    requestConfig,
  );
};

export const fetchCityById = async (cityId) => get(`/cities/${cityId}`);

export const fetchTags = async () => get("/tag");
