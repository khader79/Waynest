import { get } from "@/services/http/apiService";
import { ADMIN_ENDPOINTS, GENERAL_ENDPOINTS } from "@/services/http/endpoints";

export interface CatalogCountry {
  id: string;
  name: string;
  alpha2Code: string;
  alpha3Code: string;
  region?: string;
  capital?: string;
  nativeName?: string;
  flagUrl?: string;
}

export interface CatalogCity {
  id: string;
  name: string;
  stateName?: string;
  latitude?: number | string;
  longitude?: number | string;
  population?: number;
  countryId?: string;
  country?: {
    id?: string;
  };
}

export interface CatalogCurrency {
  id: string;
  code: string;
  name: string;
  fractionSize?: number;
}

type PaginatedPayload<TRecord> = {
  data: TRecord[];
  lastPage: number;
};

const extractPaginatedPayload = <TRecord,>(
  payload: unknown,
): PaginatedPayload<TRecord> => {
  if (Array.isArray(payload)) {
    return {
      data: payload as TRecord[],
      lastPage: 1,
    };
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: TRecord[] }).data)
  ) {
    return {
      data: (payload as { data: TRecord[] }).data,
      lastPage:
        typeof (payload as { lastPage?: number }).lastPage === "number"
          ? Math.max((payload as { lastPage: number }).lastPage, 1)
          : 1,
    };
  }

  return {
    data: [],
    lastPage: 1,
  };
};

const fetchAllPages = async <TRecord extends { id?: string }>(
  fetchPage: (page: number, pageSize: number) => Promise<unknown>,
  pageSize = 100,
  maxPages = 20,
) => {
  const records: TRecord[] = [];
  const seenIds = new Set<string>();
  let page = 1;
  let lastPage = 1;

  do {
    try {
      const payload = await fetchPage(page, pageSize);
      const { data, lastPage: resolvedLastPage } = extractPaginatedPayload<TRecord>(payload);

      lastPage = resolvedLastPage > 0 ? resolvedLastPage : lastPage;

      if (data.length === 0) break;

      data.forEach((record) => {
        const recordId = typeof record.id === "string" ? record.id : null;
        if (!recordId) { records.push(record); return; }
        if (!seenIds.has(recordId)) { seenIds.add(recordId); records.push(record); }
      });

      if (data.length < pageSize) break;
    } catch {
      break;
    }

    page += 1;
  } while (page <= lastPage && page <= maxPages);

  return records;
};

const compareByName = <TRecord extends { name?: string }>(
  left: TRecord,
  right: TRecord,
) => (left.name ?? "").localeCompare(right.name ?? "");

export const fetchPublicPlaces = async () => get(GENERAL_ENDPOINTS.PLACE);
export const fetchPublicEvents = async () => get(ADMIN_ENDPOINTS.EVENTS_LIST);
/** Place detail: backend accepts UUID or slug in the path segment. */
export const fetchPlaceBySlugOrId = async (slugOrId: string) =>
  get(GENERAL_ENDPOINTS.PLACE_BY_ID(slugOrId));
/** @deprecated use fetchPlaceBySlugOrId */
export const fetchPlaceById = fetchPlaceBySlugOrId;
/** Event detail: backend accepts UUID or slug. */
export const fetchEventBySlugOrId = async (slugOrId: string) =>
  get(GENERAL_ENDPOINTS.EVENT_BY_ID(slugOrId));
/** @deprecated use fetchEventBySlugOrId */
export const fetchEventById = fetchEventBySlugOrId;

export const fetchCountries = async (page = 1, pageSize = 50) =>
  get(ADMIN_ENDPOINTS.COUNTRIES_LIST(page, pageSize));

export const fetchCities = async (page = 1, pageSize = 100) =>
  get(ADMIN_ENDPOINTS.CITIES_LIST(page, pageSize));

export const fetchCurrencies = async (page = 1, pageSize = 50) =>
  get(`/currencies?page=${page}&limit=${pageSize}`);

export const fetchAllCountries = async () => {
  const countries = await fetchAllPages<CatalogCountry>(fetchCountries);
  return countries.sort(compareByName);
};

export const fetchCitiesByCountry = async (countryId: string) => {
  const cities = await get(ADMIN_ENDPOINTS.CITIES_BY_COUNTRY(countryId));
  return Array.isArray(cities) ? cities : [];
};

export const fetchCityById = async (cityId: string) => {
  const city = await get(ADMIN_ENDPOINTS.CITIES_GET(cityId));
  if (city && typeof city === "object") {
    return city as CatalogCity;
  }
  return null;
};

export const fetchAllCities = async () => {
  const cities = await fetchAllPages<CatalogCity>(fetchCities);
  return cities.sort((left, right) => {
    const labelLeft = left.stateName ? `${left.name} ${left.stateName}` : left.name;
    const labelRight = right.stateName ? `${right.name} ${right.stateName}` : right.name;
    return labelLeft.localeCompare(labelRight);
  });
};

export const fetchAllCurrencies = async () => {
  const currencies = await fetchAllPages<CatalogCurrency>(fetchCurrencies);
  return currencies.sort((left, right) => left.code.localeCompare(right.code));
};

export const fetchTags = async () => get(ADMIN_ENDPOINTS.TAGS_LIST);
