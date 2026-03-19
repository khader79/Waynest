import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchPublicPlaces } from "@/services/catalog/catalog.service";

export interface ExplorePlace {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  ratingAverage: string;
  ratingCount: number;
  slug: string;
  latitude: string;
  longitude: string;
  type: string;
  city?: {
    name: string;
  };
}

const extractPlaces = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload as ExplorePlace[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: ExplorePlace[] }).data)
  ) {
    return (payload as { data: ExplorePlace[] }).data;
  }

  return [] as ExplorePlace[];
};

export const useExplorePage = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [places, setPlaces] = useState<ExplorePlace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlaces = async () => {
      setLoading(true);
      try {
        const payload = await fetchPublicPlaces();
        setPlaces(extractPlaces(payload));
      } catch {
        toast.error("Failed to load places");
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    };

    void loadPlaces();
  }, []);

  const filteredPlaces = useMemo(
    () =>
      activeCategory === "all"
        ? places
        : places.filter(
            (place) => place.type?.toUpperCase() === activeCategory.toUpperCase(),
          ),
    [activeCategory, places],
  );

  return {
    activeCategory,
    filteredPlaces,
    loading,
    setActiveCategory,
  };
};
