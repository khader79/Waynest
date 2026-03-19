import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorStatus } from "@/core/utils/errors";
import { fetchProviderPlaces, fetchProviderProfile } from "@/services/provider/provider.service";

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
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  return { id: value.id };
};

const extractPlaces = (payload: unknown): PlaceItem[] => {
  const list = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.data)
      ? payload.data
      : [];

  return list
    .map<PlaceItem | null>((item) => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string") {
        return null;
      }

      const provider = isRecord(item.provider)
        ? (item.provider as Record<string, unknown>)
        : null;
      const ratingAverage = Number(item.ratingAverage ?? 0);

      return {
        id: item.id,
        imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
        isActive: typeof item.isActive === "boolean" ? item.isActive : false,
        name: item.name,
        provider: provider
          ? {
              id: typeof provider.id === "string" ? provider.id : undefined,
            }
          : undefined,
        providerId:
          typeof item.providerId === "string" ? item.providerId : undefined,
        ratingAverage: Number.isFinite(ratingAverage) ? ratingAverage : 0,
        type: typeof item.type === "string" ? item.type : "PLACE",
      };
    })
    .filter((item): item is PlaceItem => item !== null);
};

export const useProviderPlacesData = () => {
  const { t } = useTranslation();
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const providerPayload = await fetchProviderProfile();
        const provider = normalizeProvider(providerPayload);
        if (!provider) {
          throw new Error("Invalid provider payload");
        }

        const placesPayload = await fetchProviderPlaces();
        const filteredPlaces = extractPlaces(placesPayload).filter(
          (place) => place.providerId === provider.id || place.provider?.id === provider.id,
        );
        setPlaces(filteredPlaces);
      } catch (error) {
        if (getApiErrorStatus(error) === 404) {
          setNotFound(true);
        } else {
          toast.error(t("provider.places.feedback.loadError"));
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [t]);

  return {
    loading,
    notFound,
    places,
  };
};
