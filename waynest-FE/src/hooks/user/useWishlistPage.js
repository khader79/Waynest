import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { fetchWishlist, removeWishlistItem } from "@/api/user";
import { pickPlaceImageField } from "@/utils/placeImage";

const isRecord = (value) => typeof value === "object" && value !== null;

const extractWishlist = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (
        !isRecord(item) ||
        typeof item.id !== "string" ||
        typeof item.placeId !== "string"
      ) {
        return null;
      }

      const place = isRecord(item.place) ? item.place : null;
      const name = place && typeof place.name === "string" ? place.name : "";
      if (!name) {
        return null;
      }

      const type =
        place && typeof place.type === "string" ? place.type : "PLACE";
      const ratingAverage = place ? Number(place.ratingAverage ?? 0) : 0;
      const imageUrl = place ? pickPlaceImageField(place) : null;

      return {
        id: item.id,
        imageUrl,
        name,
        placeId: item.placeId,
        ratingAverage: Number.isFinite(ratingAverage) ? ratingAverage : 0,
        type,
      };
    })
    .filter((item) => item !== null);
};

export const useWishlistPage = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        setLoading(true);
        const payload = await fetchWishlist();
        setItems(extractWishlist(payload));
      } catch {
        toast.error(t("toasts.wishlistPage.failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    void loadWishlist();
  }, []);

  const removeItem = async (placeId) => {
    const previousItems = items;
    setItems((current) => current.filter((item) => item.placeId !== placeId));

    try {
      await removeWishlistItem(placeId);
      toast.success(t("toasts.wishlistPage.removedFrom"));
    } catch {
      setItems(previousItems);
      toast.error(t("toasts.wishlistPage.failedToRemove"));
    }
  };

  return {
    items,
    loading,
    removeItem,
  };
};
