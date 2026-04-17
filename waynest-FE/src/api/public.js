import { get } from "@/api/request";
import { ROUTES } from "@/api/routes";
import {
  SEARCH_CACHE_MAX_ENTRIES,
  SEARCH_CACHE_TTL_MS,
} from "@/utils/performance";
import { createRequestCache } from "@/utils/requestCache";

export const fetchPublicUserCard = async (usernameOrLegacyId) =>
  get(ROUTES.public.user(usernameOrLegacyId));

export const fetchPublicProviderBySlug = async (slug) =>
  get(ROUTES.public.providerBySlug(slug));

/** Slug or provider UUID — places, upcoming events, stats, reviews */
export const fetchPublicProviderProfile = async (slugOrId) =>
  get(ROUTES.public.providerProfile(slugOrId));

const trimSearchQ = (q) => (typeof q === "string" ? q.trim() : "");

const searchCache = createRequestCache({
  ttlMs: SEARCH_CACHE_TTL_MS,
  maxEntries: SEARCH_CACHE_MAX_ENTRIES,
});

const sanitizeRequestConfig = (config) => {
  if (!config || typeof config !== "object") {
    return {};
  }
  return config;
};

export const globalSearch = async (q, limit = 12, config) => {
  const trimmedQ = trimSearchQ(q);
  const requestConfig = sanitizeRequestConfig(config);
  const key = `global:${trimmedQ}:${limit}`;

  return searchCache.run(
    key,
    () => get(ROUTES.search.global(trimmedQ, undefined, limit), requestConfig),
    requestConfig,
  );
};

/** Places only — Waynest DB. Pass empty string to list places (up to limit). */
export const searchPlaces = async (q, limit = 12, config) => {
  const trimmedQ = trimSearchQ(q);
  const requestConfig = sanitizeRequestConfig(config);
  const key = `place:${trimmedQ}:${limit}`;

  return searchCache.run(
    key,
    () =>
      get(
        ROUTES.search.global(trimmedQ, undefined, limit, "place"),
        requestConfig,
      ),
    requestConfig,
  );
};

/** Nearest active places by coordinates (Haversine). */
export const fetchNearestPlaces = async (lat, lng, limit = 5) =>
  get(ROUTES.placeNearest(lat, lng, limit));

const publicFollowersUrl = (username, q) => {
  const base = ROUTES.public.userFollowers(username);
  const trimmed = typeof q === "string" ? q.trim() : "";
  return trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
};

const publicFollowingUrl = (username, q) => {
  const base = ROUTES.public.userFollowing(username);
  const trimmed = typeof q === "string" ? q.trim() : "";
  return trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
};

const publicFriendsUrl = (username, q) => {
  const base = ROUTES.public.userFriends(username);
  const trimmed = typeof q === "string" ? q.trim() : "";
  return trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
};

const normalizeConnectionList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
};

/** Public lists (no auth) — same shape as social graph member rows. */
export const fetchPublicUserFollowers = async (username, q) =>
  normalizeConnectionList(await get(publicFollowersUrl(username, q)));

export const fetchPublicUserFollowing = async (username, q) =>
  normalizeConnectionList(await get(publicFollowingUrl(username, q)));

export const fetchPublicUserFriends = async (username, q) =>
  normalizeConnectionList(await get(publicFriendsUrl(username, q)));
