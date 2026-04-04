/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchPublicProviderProfile } from "@/api/public";
import {
  fetchProvider,
  fetchProviderPlaces,
  fetchProviderReviews,
} from "@/services/providerService";

const CACHE_TTL_MS = 60_000;

/** Ensures follow APIs get owner id: column, nested owner, or aggregate field. */
function normalizeProviderProfileRecord(raw, agg) {
  if (!raw || typeof raw !== "object") {
    return raw;
  }
  const fromOwner =
    raw.owner && typeof raw.owner === "object" && typeof raw.owner.id === "string"
      ? raw.owner.id
      : null;
  const fromAgg =
    agg &&
    typeof agg.followTargetUserId === "string" &&
    agg.followTargetUserId.trim()
      ? agg.followTargetUserId.trim()
      : null;
  const fromColumn =
    typeof raw.ownerUserId === "string" && raw.ownerUserId.trim()
      ? raw.ownerUserId.trim()
      : null;
  const followId = fromColumn || fromOwner || fromAgg;
  if (!followId) {
    return raw;
  }
  return { ...raw, ownerUserId: followId };
}

const ProviderProfileContext = createContext(undefined);

/**
 * @typedef {object} ProviderCacheEntry
 * @property {unknown} [profile]
 * @property {unknown[]} [places]
 * @property {{ place: unknown, reviews: unknown[] }[]} [reviewsByPlace]
 * @property {number} ts
 */

export function ProviderProfileProvider({ slug: slugProp, children }) {
  const slug = typeof slugProp === "string" ? slugProp.trim() : "";

  const [profile, setProfile] = useState(null);
  const [places, setPlaces] = useState([]);
  const [reviewsByPlace, setReviewsByPlace] = useState([]);
  const [stats, setStats] = useState(null);
  /** Public follower counts (from aggregate API) — used for guests before auth graph loads */
  const [ownerSocial, setOwnerSocial] = useState(null);
  /** Same as aggregate.followTargetUserId — always set from API so follow works even if profile omits owner ids */
  const [followTargetUserId, setFollowTargetUserId] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState(null);

  const cacheRef = useRef(new Map());

  const getFreshCache = useCallback((key) => {
    const e = cacheRef.current.get(key);
    if (!e) {
      return null;
    }
    if (Date.now() - e.ts > CACHE_TTL_MS) {
      cacheRef.current.delete(key);
      return null;
    }
    return e;
  }, []);

  const mergeCache = useCallback((key, partial) => {
    const prev = cacheRef.current.get(key) || {};
    cacheRef.current.set(key, {
      ...prev,
      ...partial,
      ts: Date.now(),
    });
  }, []);

  const loadProfile = useCallback(
    async (s) => {
      const target = (s ?? slug).trim();
      if (!target) {
        return null;
      }
      const cached = getFreshCache(target);
      if (cached?.profile) {
        setProfile(
          normalizeProviderProfileRecord(cached.profile, {
            followTargetUserId: cached.followTargetUserId,
          }),
        );
        if (Array.isArray(cached.places)) {
          setPlaces(cached.places);
        }
        if (Array.isArray(cached.reviewsByPlace)) {
          setReviewsByPlace(cached.reviewsByPlace);
        }
        if (cached.stats) {
          setStats(cached.stats);
        }
        if (cached.ownerSocial !== undefined) {
          setOwnerSocial(cached.ownerSocial);
        }
        setFollowTargetUserId(
          typeof cached.followTargetUserId === "string" && cached.followTargetUserId.trim()
            ? cached.followTargetUserId.trim()
            : null,
        );
        if (Array.isArray(cached.upcomingEvents)) {
          setUpcomingEvents(cached.upcomingEvents);
        }
        setError(null);
        return cached.profile;
      }

      setProfileLoading(true);
      setError(null);
      try {
        let data;
        try {
          const agg = await fetchPublicProviderProfile(target);
          data = normalizeProviderProfileRecord(agg.provider, agg);
          const placeList = Array.isArray(agg.places) ? agg.places : [];
          const revFlat = Array.isArray(agg.reviews) ? agg.reviews : [];
          const grouped = placeList.map((place) => ({
            place,
            reviews: revFlat.filter((r) => {
              const pid = r?.placeId ?? r?.place?.id;
              return pid === place.id;
            }),
          }));
          setProfile(data);
          setPlaces(placeList);
          setReviewsByPlace(grouped);
          setStats(agg.stats ?? null);
          const nextOwnerSocial =
            agg.ownerSocial &&
            typeof agg.ownerSocial === "object" &&
            typeof agg.ownerSocial.followersCount === "number"
              ? {
                  followersCount: agg.ownerSocial.followersCount,
                  followingCount: agg.ownerSocial.followingCount ?? 0,
                }
              : null;
          setOwnerSocial(nextOwnerSocial);
          const ftid =
            typeof agg.followTargetUserId === "string" && agg.followTargetUserId.trim()
              ? agg.followTargetUserId.trim()
              : null;
          setFollowTargetUserId(ftid);
          setUpcomingEvents(Array.isArray(agg.upcomingEvents) ? agg.upcomingEvents : []);
          mergeCache(target, {
            profile: data,
            followTargetUserId: ftid,
            places: placeList,
            reviewsByPlace: grouped,
            stats: agg.stats,
            ownerSocial: nextOwnerSocial,
            upcomingEvents: agg.upcomingEvents,
          });
        } catch {
          const raw = await fetchProvider(target);
          data = normalizeProviderProfileRecord(raw, null);
          setProfile(data);
          setPlaces([]);
          setReviewsByPlace([]);
          setStats(null);
          setOwnerSocial(null);
          setFollowTargetUserId(null);
          setUpcomingEvents([]);
          mergeCache(target, { profile: data });
        }
        return data;
      } catch (e) {
        const msg = e?.message ?? "Failed to load provider";
        setError(msg);
        throw e;
      } finally {
        setProfileLoading(false);
      }
    },
    [slug, getFreshCache, mergeCache],
  );

  const loadServices = useCallback(
    async (s) => {
      const target = (s ?? slug).trim();
      if (!target) {
        return [];
      }
      const cached = getFreshCache(target);
      if (cached && Array.isArray(cached.places)) {
        setPlaces(cached.places);
        return cached.places;
      }

      let prof = profile;
      if (!prof?.id) {
        prof = await loadProfile(target);
      }
      if (!prof?.id) {
        return [];
      }

      setPlacesLoading(true);
      setError(null);
      try {
        const list = await fetchProviderPlaces(prof.id);
        setPlaces(list);
        mergeCache(target, { places: list });
        return list;
      } catch (e) {
        const msg = e?.message ?? "Failed to load places";
        setError(msg);
        throw e;
      } finally {
        setPlacesLoading(false);
      }
    },
    [slug, profile, getFreshCache, mergeCache, loadProfile],
  );

  const loadReviews = useCallback(
    async (s) => {
      const target = (s ?? slug).trim();
      if (!target) {
        return [];
      }
      const cached = getFreshCache(target);
      if (cached && Array.isArray(cached.reviewsByPlace)) {
        setReviewsByPlace(cached.reviewsByPlace);
        return cached.reviewsByPlace;
      }

      let placesList = places;
      if (!placesList?.length) {
        placesList = await loadServices(target);
      }
      if (!placesList?.length) {
        setReviewsByPlace([]);
        mergeCache(target, { reviewsByPlace: [] });
        return [];
      }

      setReviewsLoading(true);
      setError(null);
      try {
        const agg = await fetchProviderReviews(placesList);
        setReviewsByPlace(agg);
        mergeCache(target, { reviewsByPlace: agg });
        return agg;
      } catch (e) {
        const msg = e?.message ?? "Failed to load reviews";
        setError(msg);
        throw e;
      } finally {
        setReviewsLoading(false);
      }
    },
    [slug, places, getFreshCache, mergeCache, loadServices],
  );

  const refresh = useCallback(() => {
    if (!slug) {
      return Promise.resolve();
    }
    cacheRef.current.delete(slug);
    setPlaces([]);
    setReviewsByPlace([]);
    setStats(null);
    setOwnerSocial(null);
    setFollowTargetUserId(null);
    setUpcomingEvents([]);
    return loadProfile(slug);
  }, [slug, loadProfile]);

  useEffect(() => {
    if (!slug) {
      return;
    }
    const cached = getFreshCache(slug);
    if (cached?.profile) {
      setProfile(
        normalizeProviderProfileRecord(cached.profile, {
          followTargetUserId: cached.followTargetUserId,
        }),
      );
      setPlaces(Array.isArray(cached.places) ? cached.places : []);
      setReviewsByPlace(
        Array.isArray(cached.reviewsByPlace) ? cached.reviewsByPlace : [],
      );
      setStats(cached.stats ?? null);
      setOwnerSocial(cached.ownerSocial ?? null);
      setFollowTargetUserId(
        typeof cached.followTargetUserId === "string" && cached.followTargetUserId.trim()
          ? cached.followTargetUserId.trim()
          : null,
      );
      setUpcomingEvents(Array.isArray(cached.upcomingEvents) ? cached.upcomingEvents : []);
    } else {
      setProfile(null);
      setPlaces([]);
      setReviewsByPlace([]);
      setStats(null);
      setOwnerSocial(null);
      setFollowTargetUserId(null);
      setUpcomingEvents([]);
    }
    void loadProfile(slug).catch(() => {});
  }, [slug, getFreshCache, loadProfile]);

  const value = useMemo(
    () => ({
      slug,
      profile,
      places,
      reviewsByPlace,
      stats,
      ownerSocial,
      followTargetUserId,
      upcomingEvents,
      profileLoading,
      placesLoading,
      reviewsLoading,
      error,
      loadProfile,
      loadServices,
      loadReviews,
      refresh,
    }),
    [
      slug,
      profile,
      places,
      reviewsByPlace,
      stats,
      ownerSocial,
      followTargetUserId,
      upcomingEvents,
      profileLoading,
      placesLoading,
      reviewsLoading,
      error,
      loadProfile,
      loadServices,
      loadReviews,
      refresh,
    ],
  );

  return (
    <ProviderProfileContext.Provider value={value}>
      {children}
    </ProviderProfileContext.Provider>
  );
}

export function useProviderProfile() {
  const ctx = useContext(ProviderProfileContext);
  if (ctx === undefined) {
    throw new Error("useProviderProfile must be used within ProviderProfileProvider");
  }
  return ctx;
}
