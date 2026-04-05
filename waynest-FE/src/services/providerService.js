import { get } from "@/api/request";
import { fetchPublicProviderBySlug } from "@/api/public";
import { reviewsApi } from "@/api/reviews";

/**
 * Normalize paginated or array payload from GET /place
 * @param {unknown} payload
 * @returns {unknown[]}
 */
export function normalizePlacesPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

/**
 * @param {unknown[]} places
 * @param {string} providerId
 */
export function filterPlacesByProviderId(places, providerId) {
  if (!providerId) {
    return [];
  }
  return places.filter((p) => p?.provider?.id === providerId);
}

/**
 * @param {number} page
 * @param {number} limit
 */
export async function fetchPlacesPage(page = 1, limit = 50) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return get(`/place?${params.toString()}`);
}

/**
 * Public provider profile by slug (existing API).
 * @param {string} slug
 */
export async function fetchProvider(slug) {
  return fetchPublicProviderBySlug(slug);
}

/**
 * Scan GET /place pages and collect places belonging to providerId.
 * @param {string} providerId
 * @param {{ maxPages?: number, pageSize?: number }} [options]
 */
export async function fetchProviderPlaces(providerId, options = {}) {
  const maxPages = options.maxPages ?? 20;
  const pageSize = options.pageSize ?? 50;
  const collected = [];

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchPlacesPage(page, pageSize);
    const rows = normalizePlacesPayload(res);
    collected.push(...filterPlacesByProviderId(rows, providerId));

    const lastPage = typeof res?.lastPage === "number" ? res.lastPage : 1;
    if (page >= lastPage) {
      break;
    }
  }

  return collected;
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} chunkSize
 * @param {(item: T) => Promise<unknown>} fn
 */
async function runInChunks(items, chunkSize, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const part = await Promise.all(chunk.map(fn));
    out.push(...part);
  }
  return out;
}

/**
 * Aggregated reviews for a list of places (N requests; chunked for concurrency).
 * @param {{ id: string, name?: string, slug?: string | null }[]} places
 * @param {{ chunkSize?: number }} [options]
 * @returns {Promise<{ place: typeof places[0], reviews: unknown[] }[]>}
 */
export async function fetchProviderReviews(places, options = {}) {
  const chunkSize = options.chunkSize ?? 5;
  const withPlaces = places.filter((p) => p?.id);

  return runInChunks(withPlaces, chunkSize, async (place) => {
    const reviews = await reviewsApi.getPlaceReviews(place.id);
    return {
      place,
      reviews: Array.isArray(reviews) ? reviews : [],
    };
  });
}
