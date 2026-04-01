import { message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { fetchMySummary } from "@/api/user";

const EMPTY_STATS = {
  bookings: 0,
  wishlist: 0,
  reviews: 0,
  savedPlans: 0,
};

export const useUserDashboardStats = () => {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await fetchMySummary();
      setStats({
        bookings: Number(payload?.bookingsCount ?? 0),
        wishlist: Number(payload?.wishlistCount ?? 0),
        reviews: Number(payload?.reviewsCount ?? 0),
        savedPlans: Number(payload?.savedPlansCount ?? 0),
      });
    } catch {
      setStats(EMPTY_STATS);
      message.error("Failed to load your dashboard summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    refresh,
    stats,
  };
};
