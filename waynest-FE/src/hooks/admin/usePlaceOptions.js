import { message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { extractAdminCollection } from "@/utils/adminCollection";
import { placesAdminService } from "@/api/admin";

export const usePlaceOptions = (loadErrorMessage) => {
  const query = useQuery({
    queryKey: ["admin", "places", "options"],
    queryFn: async () => {
      try {
        const nextPlaces = [];
        const seenIds = new Set();
        const pageSize = 100;
        let page = 1;
        let total = Number.POSITIVE_INFINITY;

        while (nextPlaces.length < total) {
          const response = await placesAdminService.list({ page, pageSize });
          const collection = extractAdminCollection(response);
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
        return nextPlaces;
      } catch (error) {
        message.error(loadErrorMessage);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  return {
    loading: query.isLoading,
    places: query.data ?? [],
  };
};
