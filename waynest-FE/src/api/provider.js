import { get, patch, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";
import { STORAGE_KEYS } from "@/utils/storageKeys";

const PROVIDER_PROFILE_CACHE_TTL_MS = 60_000;

let providerProfileCache = null;
let providerProfileRequest = null;
let providerProfileRequestUserId = null;

const isRecord = (value) => typeof value === "object" && value !== null;

const trimToNull = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getCurrentAuthUserId = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.authUser);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return typeof parsed?.id === "string" && parsed.id.trim()
      ? parsed.id.trim()
      : null;
  } catch {
    return null;
  }
};

const normalizeProviderProfile = (payload) => {
  if (!isRecord(payload)) {
    return null;
  }

  return {
    ...payload,
    slug: trimToNull(payload.slug),
    displayName:
      typeof payload.displayName === "string" ? payload.displayName.trim() : "",
    logoUrl: trimToNull(payload.logoUrl),
    coverPhotoUrl: trimToNull(payload.coverPhotoUrl),
  };
};

const getFreshProviderProfileCache = () => {
  if (!providerProfileCache) {
    return null;
  }

  const currentUserId = getCurrentAuthUserId();
  if (!currentUserId || providerProfileCache.userId !== currentUserId) {
    providerProfileCache = null;
    return null;
  }

  if (Date.now() - providerProfileCache.ts > PROVIDER_PROFILE_CACHE_TTL_MS) {
    providerProfileCache = null;
    return null;
  }

  return providerProfileCache.value;
};

const setProviderProfileCache = (value, userId = getCurrentAuthUserId()) => {
  if (!userId) {
    providerProfileCache = null;
    return value;
  }

  providerProfileCache = {
    ts: Date.now(),
    userId,
    value,
  };
  return value;
};

export function clearProviderProfileCache() {
  providerProfileCache = null;
  providerProfileRequest = null;
  providerProfileRequestUserId = null;
}

export function getCachedProviderProfile() {
  return getFreshProviderProfileCache();
}

export function warmProviderProfileCache() {
  void fetchProviderProfile().catch(() => {});
}

export const fetchProviderProfile = async (options = {}) => {
  const forceRefresh =
    options && typeof options === "object" && options.forceRefresh === true;
  const currentUserId = getCurrentAuthUserId();

  if (!forceRefresh) {
    const cachedProfile = getFreshProviderProfileCache();
    if (cachedProfile) {
      return cachedProfile;
    }

    if (
      providerProfileRequest &&
      providerProfileRequestUserId === currentUserId
    ) {
      return providerProfileRequest;
    }
  }

  providerProfileRequestUserId = currentUserId;
  providerProfileRequest = get(ROUTES.providers.myProfile)
    .then((payload) => {
      if (
        providerProfileRequestUserId !== currentUserId ||
        getCurrentAuthUserId() !== currentUserId
      ) {
        return null;
      }

      const normalized = normalizeProviderProfile(payload);
      if (!normalized) {
        clearProviderProfileCache();
        return null;
      }

      return setProviderProfileCache(normalized, currentUserId);
    })
    .catch((error) => {
      providerProfileCache = null;
      throw error;
    })
    .finally(() => {
      if (providerProfileRequestUserId === currentUserId) {
        providerProfileRequest = null;
        providerProfileRequestUserId = null;
      }
    });

  return providerProfileRequest;
};

export const updateMyProviderProfile = async (payload) => {
  const response = await patch(ROUTES.providers.myProfile, payload);
  const normalized = normalizeProviderProfile(response);

  if (!normalized) {
    clearProviderProfileCache();
    return response;
  }

  return setProviderProfileCache(normalized);
};

export const fetchProviderStats = async () => get(ROUTES.providers.myStats);
export const fetchProviders = async () => get(ROUTES.admin.providersList);

export const updateProvider = async (providerId, payload) =>
  patch(ROUTES.admin.providersUpdate(providerId), payload);

export const fetchProviderPlaces = async () => get(ROUTES.providers.myPlaces);

export const createProviderPlace = async (payload) =>
  postJson(ROUTES.providers.myPlaces, payload);

export const updateProviderPlace = async (placeId, payload) =>
  patch(ROUTES.providers.myPlace(placeId), payload);

export const fetchProviderEvents = async () => get(ROUTES.providers.myEvents);

export const createProviderEvent = async (payload) =>
  postJson(ROUTES.providers.myEvents, payload);

export const updateProviderEvent = async (eventId, payload) =>
  patch(ROUTES.providers.myEvent(eventId), payload);

export const fetchProviderBookings = async () =>
  get(ROUTES.bookings.providerMine);

export const updateBookingStatus = async (bookingId, payload) =>
  patch(ROUTES.bookings.status(bookingId), payload);
