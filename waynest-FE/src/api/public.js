import { get } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const fetchPublicUserCard = async (usernameOrLegacyId) =>
  get(ROUTES.public.user(usernameOrLegacyId));

export const fetchPublicProviderBySlug = async (slug) =>
  get(ROUTES.public.providerBySlug(slug));

/** Slug or provider UUID — places, upcoming events, stats, reviews */
export const fetchPublicProviderProfile = async (slugOrId) =>
  get(ROUTES.public.providerProfile(slugOrId));

const trimSearchQ = (q) => (typeof q === "string" ? q.trim() : "");

export const globalSearch = async (q, limit = 12) =>
  get(ROUTES.search.global(trimSearchQ(q), undefined, limit));

/** Places only — Waynest DB. Pass empty string to list places (up to limit). */
export const searchPlaces = async (q, limit = 12) =>
  get(ROUTES.search.global(trimSearchQ(q), undefined, limit, "place"));

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
