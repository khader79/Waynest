import { message } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchMyBookings } from "@/api/user";
import { fetchWishlist } from "@/api/user";
import { fetchAllReviews, fetchUserProfile } from "@/api/user";







export const useUserDashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    bookings: 0,
    wishlist: 0,
    reviews: 0
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
          const userReviews = Array.isArray(reviews) ?
          reviews.filter(
            (review) =>
            review.user?.userId === user.userId
          ).length :
          0;
          reviewsCount = userReviews;
        } catch {
          reviewsCount = 0;
        }

        setStats({
          bookings: bookingsCount,
          wishlist: wishlistCount,
          reviews: reviewsCount
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
    stats
  };
};