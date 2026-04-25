const parseMs = (value, fallbackMs) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallbackMs;
};

const parsePositiveInt = (value, fallbackValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : fallbackValue;
};

export const INSTANT_SEARCH_DEBOUNCE_MS = parseMs(
  import.meta.env.VITE_INSTANT_SEARCH_DEBOUNCE_MS,
  120,
);

export const CATALOG_SEARCH_DEBOUNCE_MS = parseMs(
  import.meta.env.VITE_CATALOG_SEARCH_DEBOUNCE_MS,
  120,
);

export const COMPOSER_PLACE_SEARCH_DEBOUNCE_MS = parseMs(
  import.meta.env.VITE_COMPOSER_PLACE_SEARCH_DEBOUNCE_MS,
  140,
);

export const SEARCH_CACHE_TTL_MS = parseMs(
  import.meta.env.VITE_SEARCH_CACHE_TTL_MS,
  8_000,
);

export const SEARCH_CACHE_MAX_ENTRIES = parsePositiveInt(
  import.meta.env.VITE_SEARCH_CACHE_MAX_ENTRIES,
  200,
);

export const CITIES_BY_COUNTRY_CACHE_TTL_MS = parseMs(
  import.meta.env.VITE_CITIES_BY_COUNTRY_CACHE_TTL_MS,
  60_000,
);

export const CITIES_BY_COUNTRY_CACHE_MAX_ENTRIES = parsePositiveInt(
  import.meta.env.VITE_CITIES_BY_COUNTRY_CACHE_MAX_ENTRIES,
  120,
);
