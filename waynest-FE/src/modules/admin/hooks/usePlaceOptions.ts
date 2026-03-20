import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { extractAdminCollection } from "@/modules/admin/utils/adminCollection";
import { placesAdminService } from "@/services/admin/admin.service";

export interface PlaceOption {
  id: string;
  name: string;
}

export const usePlaceOptions = (loadErrorMessage: string) => {
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setLoading(true);
        const nextPlaces: PlaceOption[] = [];
        const seenIds = new Set<string>();
        const pageSize = 100;
        let page = 1;
        let total = Number.POSITIVE_INFINITY;

        while (nextPlaces.length < total) {
          const response = await placesAdminService.list({ page, pageSize });
          const collection = extractAdminCollection<PlaceOption>(response);
          total = collection.total || nextPlaces.length;

          if (collection.items.length === 0) {
            break;
          }

          collection.items.forEach((place) => {
            if (!seenIds.has(place.id)) {
              seenIds.add(place.id);
              nextPlaces.push(place);
            }
          });

          if (collection.items.length < pageSize) {
            break;
          }

          page += 1;
        }

        nextPlaces.sort((left, right) => left.name.localeCompare(right.name));
        setPlaces(nextPlaces);
      } catch {
        message.error(loadErrorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchPlaces();
  }, [loadErrorMessage]);

  return useMemo(
    () => ({
      loading,
      places,
    }),
    [loading, places],
  );
};
