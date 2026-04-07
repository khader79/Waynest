import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorStatus } from "@/utils/errors";
import { fetchProviderPlaces } from "@/api/provider";












const isRecord = (value) =>
typeof value === "object" && value !== null;

const extractPlaces = (payload) => {
  const list = Array.isArray(payload) ?
  payload :
  isRecord(payload) && Array.isArray(payload.data) ?
  payload.data :
  [];

  return list.
  map((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string") {
      return null;
    }

    const provider = isRecord(item.provider) ?
    item.provider :
    null;
    const ratingAverage = Number(item.ratingAverage ?? 0);

    return {
      id: item.id,
      imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
      isActive: typeof item.isActive === "boolean" ? item.isActive : false,
      name: item.name,
      provider: provider ?
      {
        id: typeof provider.id === "string" ? provider.id : undefined
      } :
      undefined,
      providerId:
      typeof item.providerId === "string" ? item.providerId : undefined,
      ratingAverage: Number.isFinite(ratingAverage) ? ratingAverage : 0,
      type: typeof item.type === "string" ? item.type : "PLACE"
    };
  }).
  filter((item) => item !== null);
};

export const useProviderPlacesData = () => {
  const { t } = useTranslation();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const placesPayload = await fetchProviderPlaces();
        setPlaces(extractPlaces(placesPayload));
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
    places
  };
};