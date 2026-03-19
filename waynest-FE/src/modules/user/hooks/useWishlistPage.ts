import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchWishlist, removeWishlistItem } from "@/services/wishlist/wishlist.service";

type WishlistItem = {
  id: string;
  placeId: string;
  name: string;
  imageUrl: string | null;
  type: string;
  ratingAverage: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractWishlist = (payload: unknown): WishlistItem[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.placeId !== "string") {
        return null;
      }

      const place = isRecord(item.place)
        ? (item.place as Record<string, unknown>)
        : null;
      const name = place && typeof place.name === "string" ? place.name : "";
      if (!name) {
        return null;
      }

      const type = place && typeof place.type === "string" ? place.type : "PLACE";
      const ratingAverage = place ? Number(place.ratingAverage ?? 0) : 0;
      const imageUrl =
        place && typeof place.imageUrl === "string" ? place.imageUrl : null;

      return {
        id: item.id,
        imageUrl,
        name,
        placeId: item.placeId,
        ratingAverage: Number.isFinite(ratingAverage) ? ratingAverage : 0,
        type,
      };
    })
    .filter((item): item is WishlistItem => item !== null);
};

export const useWishlistPage = () => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        setLoading(true);
        const payload = await fetchWishlist();
        setItems(extractWishlist(payload));
      } catch {
        toast.error("Failed to load wishlist");
      } finally {
        setLoading(false);
      }
    };

    void loadWishlist();
  }, []);

  const removeItem = async (placeId: string) => {
    const previousItems = items;
    setItems((current) => current.filter((item) => item.placeId !== placeId));

    try {
      await removeWishlistItem(placeId);
      toast.success("Removed from wishlist");
    } catch {
      setItems(previousItems);
      toast.error("Failed to remove item");
    }
  };

  return {
    items,
    loading,
    removeItem,
  };
};
