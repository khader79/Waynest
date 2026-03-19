import { message } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "@/core/providers/AuthContext";
import { fetchAllReviews, fetchUserProfile } from "@/services/user/user.service";

type UserStats = {
  bookings: number;
  wishlist: number;
  reviews: number;
};

export const useUserDashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    bookings: 0,
    wishlist: 0,
    reviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.userId) {
        return;
      }

      try {
        setLoading(true);
        await fetchUserProfile(user.userId);

        try {
          const reviews = await fetchAllReviews();
          const userReviews = Array.isArray(reviews)
            ? reviews.filter(
                (review: { user?: { id?: string } }) =>
                  review.user?.id === user.userId,
              ).length
            : 0;
          setStats((current) => ({
            ...current,
            reviews: userReviews,
          }));
        } catch {
          setStats((current) => current);
        }

        setStats((current) => ({
          ...current,
          bookings: 0,
          wishlist: 0,
        }));
      } catch {
        message.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [user?.userId]);

  return {
    loading,
    stats,
  };
};
