import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { PROVIDER_ENDPOINTS } from "../../../../api/endpoints";
import { get } from "../../../../api/apiService";

type ProviderProfile = {
  id: string;
  displayName: string;
  isActive: boolean;
};

type ProviderStats = {
  totalPlaces: number;
  totalBookings: number;
  totalReviews: number;
  averageRating: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeProvider = (value: unknown): ProviderProfile | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.displayName !== "string") {
    return null;
  }
  return {
    id: value.id,
    displayName: value.displayName,
    isActive: typeof value.isActive === "boolean" ? value.isActive : true,
  };
};

const normalizeStats = (value: unknown): ProviderStats => {
  if (!isRecord(value)) {
    return { totalPlaces: 0, totalBookings: 0, totalReviews: 0, averageRating: 0 };
  }
  return {
    totalPlaces: Number(value.totalPlaces ?? 0),
    totalBookings: Number(value.totalBookings ?? 0),
    totalReviews: Number(value.totalReviews ?? 0),
    averageRating: Number(value.averageRating ?? 0),
  };
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) return undefined;
  const response = error.response;
  if (!isRecord(response)) return undefined;
  const status = response.status;
  return typeof status === "number" ? status : undefined;
};

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileData, statsData] = await Promise.all([
          get(PROVIDER_ENDPOINTS.MY_PROFILE),
          get(PROVIDER_ENDPOINTS.MY_STATS),
        ]);
        const parsedProvider = normalizeProvider(profileData);
        if (!parsedProvider) {
          throw new Error("Invalid provider payload");
        }
        setProvider(parsedProvider);
        setStats(normalizeStats(statsData));
      } catch (error) {
        if (getErrorStatus(error) === 404) {
          setNotFound(true);
        } else {
          toast.error("Failed to load provider dashboard");
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  if (notFound) {
    return (
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "40px 0",
          color: "var(--color-text-secondary)",
          textAlign: "center",
        }}>
        Your provider account is not set up. Contact an administrator.
      </div>
    );
  }

  const metrics = stats ?? {
    totalPlaces: 0,
    totalBookings: 0,
    totalReviews: 0,
    averageRating: 0,
  };

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 0 32px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}>
      <style>
        {`@keyframes dashPulse { 0% { opacity: 0.45; } 50% { opacity: 0.9; } 100% { opacity: 0.45; } }`}
      </style>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>
          {provider?.displayName ?? "Provider Dashboard"}
        </h1>
        {provider && (
          <span
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: provider.isActive
                ? "var(--color-background-success)"
                : "var(--color-background-danger)",
              color: provider.isActive
                ? "var(--color-text-success)"
                : "var(--color-text-danger)",
            }}>
            {provider.isActive ? "Active" : "Inactive"}
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}>
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                style={{
                  height: 120,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--panel-input-bg)",
                  animation: "dashPulse 1.4s ease-in-out infinite",
                }}
              />
            ))
          : [
              { label: "Total Places", value: metrics.totalPlaces },
              { label: "Total Bookings", value: metrics.totalBookings },
              { label: "Total Reviews", value: metrics.totalReviews },
              {
                label: "Avg Rating",
                value: `${metrics.averageRating.toFixed(1)} ★`,
              },
            ].map((metric) => (
              <div
                key={metric.label}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--panel-border-strong)",
                  borderRadius: "var(--radius-lg)",
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {metric.label}
                </span>
                <strong style={{ fontSize: 22, color: "var(--color-text-primary)" }}>
                  {metric.value}
                </strong>
              </div>
            ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 999,
            border: "1px solid var(--panel-border)",
            background: "transparent",
            color: "var(--color-text-primary)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/provider-panel/places")}>
          Manage Places
        </button>
        <button
          type="button"
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 999,
            border: "1px solid var(--panel-border)",
            background: "transparent",
            color: "var(--color-text-primary)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/provider-panel/bookings")}>
          View Bookings
        </button>
        <button
          type="button"
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 999,
            border: "1px solid var(--panel-border)",
            background: "transparent",
            color: "var(--color-text-primary)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/provider-panel/profile")}>
          Provider Profile
        </button>
      </div>
    </div>
  );
};

export default ProviderDashboard;
