import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ADMIN_ENDPOINTS, PROVIDER_ENDPOINTS } from "../../../../api/endpoints";
import { get } from "../../../../api/apiService";

type ProviderProfile = {
  id: string;
};

type PlaceItem = {
  id: string;
  name: string;
  type: string;
  ratingAverage: number;
  isActive: boolean;
  imageUrl: string | null;
  providerId?: string;
  provider?: { id?: string };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeProvider = (value: unknown): ProviderProfile | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string") return null;
  return { id: value.id };
};

const extractPlaces = (payload: unknown): PlaceItem[] => {
  const list = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.data)
      ? payload.data
      : [];
  //@ts-ignore
  return (
    list
      .map((item) => {
        if (
          !isRecord(item) ||
          typeof item.id !== "string" ||
          typeof item.name !== "string"
        ) {
          return null;
        }
        const provider = isRecord(item.provider)
          ? (item.provider as Record<string, unknown>)
          : null;
        const ratingAverage = Number(item.ratingAverage ?? 0);
        return {
          id: item.id,
          name: item.name,
          type: typeof item.type === "string" ? item.type : "PLACE",
          ratingAverage: Number.isFinite(ratingAverage) ? ratingAverage : 0,
          isActive: typeof item.isActive === "boolean" ? item.isActive : false,
          imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
          providerId:
            typeof item.providerId === "string" ? item.providerId : undefined,
          provider: provider
            ? {
                id: typeof provider.id === "string" ? provider.id : undefined,
              }
            : undefined,
        };
      })
      //@ts-ignore
      .filter((item): item is PlaceItem => item !== null)
  );
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) return undefined;
  const response = error.response;
  if (!isRecord(response)) return undefined;
  const status = response.status;
  return typeof status === "number" ? status : undefined;
};

const ProviderPlaces = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const providerData = await get(PROVIDER_ENDPOINTS.MY_PROFILE);
        const provider = normalizeProvider(providerData);
        if (!provider) {
          throw new Error("Invalid provider payload");
        }
        const placesData = await get(ADMIN_ENDPOINTS.PLACES_LIST);
        const allPlaces = extractPlaces(placesData);
        const filtered = allPlaces.filter(
          (place) =>
            place.providerId === provider.id ||
            place.provider?.id === provider.id,
        );
        setPlaces(filtered);
      } catch (error) {
        if (getErrorStatus(error) === 404) {
          setNotFound(true);
        } else {
          toast.error("Failed to load places");
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

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 0 32px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}>
      <style>
        {`@keyframes placePulse { 0% { opacity: 0.45; } 50% { opacity: 0.9; } 100% { opacity: 0.45; } }`}
      </style>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>My Places</h1>
        <button
          type="button"
          onClick={() => navigate("/admin/places")}
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 999,
            border: "1px solid var(--panel-border)",
            background: "transparent",
            color: "var(--color-text-primary)",
            cursor: "pointer",
          }}>
          Edit Places
        </button>
      </div>

      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              style={{
                height: 240,
                borderRadius: "var(--radius-lg)",
                background: "var(--panel-input-bg)",
                animation: "placePulse 1.4s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : places.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "var(--color-text-secondary)",
          }}>
          No places found for your provider account.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}>
          {places.map((place) => (
            <div
              key={place.id}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--panel-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}>
              {place.imageUrl ? (
                <img
                  src={place.imageUrl}
                  alt={place.name}
                  style={{ width: "100%", height: 160, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 160,
                    background: "var(--panel-input-bg)",
                  }}
                />
              )}
              <div
                style={{
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}>
                <strong style={{ fontSize: 15 }}>{place.name}</strong>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                  }}>
                  {place.type} · {place.ratingAverage.toFixed(1)} ★
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 999,
                    width: "fit-content",
                    background: place.isActive
                      ? "var(--color-background-success)"
                      : "var(--color-background-danger)",
                    color: place.isActive
                      ? "var(--color-text-success)"
                      : "var(--color-text-danger)",
                  }}>
                  {place.isActive ? "Active" : "Inactive"}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/admin/places")}
                  style={{
                    height: 36,
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--panel-border)",
                    background: "transparent",
                    color: "var(--color-text-primary)",
                    cursor: "pointer",
                  }}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProviderPlaces;
