import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { adminDashboardService } from "@/modules/admin/api";








const safeCount = (data) => {
  if (Array.isArray(data)) {
    return data.length;
  }

  if (data && typeof data === "object") {
    const record = data;

    if (typeof record.total === "number") {
      return record.total;
    }

    if (Array.isArray(record.data)) {
      return record.data.length;
    }
  }

  return 0;
};

export const useAdminDashboardStats = (loadErrorMessage) => {
  const [stats, setStats] = useState({
    users: 0,
    providers: 0,
    places: 0,
    reviews: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const summary = await adminDashboardService.fetchSummary();
        setStats({
          users: safeCount(summary.users),
          providers: safeCount(summary.providers),
          places: safeCount(summary.places),
          reviews: safeCount(summary.reviews)
        });
      } catch {
        message.error(loadErrorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [loadErrorMessage]);

  return useMemo(
    () => ({
      loading,
      stats
    }),
    [loading, stats]
  );
};