import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchMyProfile, fetchWishlist } from "@/api/user";
import { fetchMyConnectionCounts } from "@/api/social";
import { fetchSavedTripPlans } from "@/api/trips";
import { extractTripPlans } from "@/utils/trips/dataNormalizers";

const isRecord = (value) => typeof value === "object" && value !== null;

const extractWishlistPreview = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (
        !isRecord(item) ||
        typeof item.id !== "string" ||
        typeof item.placeId !== "string"
      ) {
        return null;
      }

      const place = isRecord(item.place) ? item.place : null;
      const name = place && typeof place.name === "string" ? place.name : "";

      if (!name) {
        return null;
      }

      return { id: item.id, name, placeId: item.placeId };
    })
    .filter((item) => item !== null);
};

const EMPTY_PROFILE = {
  email: "",
  fullName: "",
  phone: "",
  username: "",
  avatarUrl: null,
  savedPlansCount: 0,
  wishlistCount: 0,
  friendsCount: 0,
  followersCount: 0,
  followingCount: 0,
  recentSavedPlans: [],
  recentWishlist: [],
};

export const useUserProfilePage = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [payload, wishlistPayload, plansPayload, countsPayload] =
        await Promise.all([
          fetchMyProfile(),
          fetchWishlist(),
          fetchSavedTripPlans(),
          fetchMyConnectionCounts().catch(() => ({
            friendsCount: 0,
            followersCount: 0,
            followingCount: 0,
          })),
        ]);

      const wishlist = extractWishlistPreview(wishlistPayload);
      const savedPlans = extractTripPlans(plansPayload);

      setProfile({
        email: payload.email || "",
        fullName: `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim(),
        phone: payload.phone || "",
        username: typeof payload.username === "string" ? payload.username : "",
        avatarUrl: payload.avatarUrl ?? null,
        recentSavedPlans: savedPlans
          .slice()
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 3)
          .map((plan) => ({
            id: plan.id,
            title: plan.title || `Trip Plan #${plan.id.slice(0, 6)}`,
            createdAt: plan.createdAt,
          })),
        recentWishlist: wishlist.slice(0, 3),
        savedPlansCount: savedPlans.length,
        wishlistCount: wishlist.length,
        friendsCount: countsPayload.friendsCount,
        followersCount: countsPayload.followersCount,
        followingCount: countsPayload.followingCount,
      });
    } catch (loadError) {
      setError(loadError);
      setProfile(EMPTY_PROFILE);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    error,
    loading,
    profile,
    refresh,
  };
};
