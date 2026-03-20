import { message } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "@/core/providers/AuthContext";
import { fetchMyBookings } from "@/services/bookings/bookings.service";
import { fetchWishlist } from "@/services/wishlist/wishlist.service";
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

        // Fetch user profile
        await fetchUserProfile(user.userId);

        // Fetch bookings count
        let bookingsCount = 0;
        try {
          const bookings = await fetchMyBookings();
          bookingsCount = Array.isArray(bookings) ? bookings.length : 0;
        } catch {
          bookingsCount = 0;
        }

        // Fetch wishlist count
        let wishlistCount = 0;
        try {
          const wishlist = await fetchWishlist();
          wishlistCount = Array.isArray(wishlist) ? wishlist.length : 0;
        } catch {
          wishlistCount = 0;
        }

        // Fetch reviews count
        let reviewsCount = 0;
        try {
          const reviews = await fetchAllReviews();
          const userReviews = Array.isArray(reviews)
            ? reviews.filter(
                (review: { user?: { userId?: string } }) =>
                  review.user?.userId === user.userId,
              ).length
            : 0;
          reviewsCount = userReviews;
        } catch {
          reviewsCount = 0;
        }

        setStats({
          bookings: bookingsCount,
          wishlist: wishlistCount,
          reviews: reviewsCount,
        });
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
