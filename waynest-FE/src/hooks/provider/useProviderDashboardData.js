import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { fetchProviderProfile, fetchProviderStats } from "@/api/provider";

const isRecord = (value) => typeof value === "object" && value !== null;

const normalizeProvider = (value) => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.displayName !== "string"
  ) {
    return null;
  }

  return {
    displayName: value.displayName,
    id: value.id,
    isActive: typeof value.isActive === "boolean" ? value.isActive : true,
  };
};

const normalizeStats = (value) => {
  if (!isRecord(value)) {
    return {
      averageRating: 0,
      totalBookings: 0,
      totalPlaces: 0,
      totalReviews: 0,
    };
  }

  return {
    averageRating: Number(value.averageRating ?? 0),
    totalBookings: Number(value.totalBookings ?? 0),
    totalPlaces: Number(value.totalPlaces ?? 0),
    totalReviews: Number(value.totalReviews ?? 0),
  };
};

export const useProviderDashboardData = () => {
  const { t } = useTranslation();
  const [provider, setProvider] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        const [profilePayload, statsPayload] = await Promise.all([
          fetchProviderProfile(),
          fetchProviderStats(),
        ]);

        if (!profilePayload) {
          setNotFound(true);
          return;
        }

        const parsedProvider = normalizeProvider(profilePayload);
        if (!parsedProvider) {
          setNotFound(true);
          return;
        }

        setProvider(parsedProvider);
        setStats(normalizeStats(statsPayload));
      } catch {
        toast.error(t("provider.dashboard.feedback.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [t]);

  return {
    loading,
    notFound,
    provider,
    stats,
  };
};
