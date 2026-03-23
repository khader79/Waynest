import { useEffect, useState } from "react";
import { useAuth } from "@/core/providers/AuthContext";
import { fetchUserProfile } from "@/services/user/user.service";
import { fetchWishlist } from "@/services/wishlist/wishlist.service";
import { fetchSavedTripPlans } from "@/services/tripPlanner/tripPlanner.service";
import { extractTripPlans } from "@/features/trip-planner/utils/dataNormalizers";

type UserProfileView = {
  email: string;
  fullName: string;
  phone: string;
  savedPlansCount: number;
  wishlistCount: number;
  recentSavedPlans: Array<{ id: string; title: string; createdAt: string }>;
  recentWishlist: Array<{ id: string; placeId: string; name: string }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractWishlistPreview = (payload: unknown) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.placeId !== "string") {
        return null;
      }
      const place = isRecord(item.place) ? item.place : null;
      const name = place && typeof place.name === "string" ? place.name : "";
      if (!name) {
        return null;
      }
      return { id: item.id, name, placeId: item.placeId };
    })
    .filter((item): item is { id: string; placeId: string; name: string } => item !== null);
};

export const useUserProfilePage = () => {
  const { loading: authLoading, user } = useAuth();
  const [profile, setProfile] = useState<UserProfileView>({
    email: "",
    fullName: "",
    phone: "",
    savedPlansCount: 0,
    wishlistCount: 0,
    recentSavedPlans: [],
    recentWishlist: [],
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (authLoading || !user?.userId) {
        return;
      }

      try {
        const [payload, wishlistPayload, plansPayload] = await Promise.all([
          fetchUserProfile(user.userId),
          fetchWishlist(),
          fetchSavedTripPlans(),
        ]);

        const wishlist = extractWishlistPreview(wishlistPayload);
        const savedPlans = extractTripPlans(plansPayload);
        setProfile({
          email: payload.email || "",
          fullName: `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim(),
          phone: payload.phone || "",
          recentSavedPlans: savedPlans
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3)
            .map((plan) => ({
              id: plan.id,
              title: plan.title || `Trip Plan #${plan.id.slice(0, 6)}`,
              createdAt: plan.createdAt,
            })),
          recentWishlist: wishlist.slice(0, 3),
          savedPlansCount: savedPlans.length,
          wishlistCount: wishlist.length,
        });
      } catch {
        setProfile({
          email: "",
          fullName: "",
          phone: "",
          recentSavedPlans: [],
          recentWishlist: [],
          savedPlansCount: 0,
          wishlistCount: 0,
        });
      }
    };

    void loadProfile();
  }, [authLoading, user?.userId]);

  return profile;
};
