import { message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { extractAdminCollection } from "@/utils/adminCollection";
import { citiesAdminService } from "@/api/admin";

export const useCityOptions = (loadErrorMessage) => {
  const query = useQuery({
    queryKey: ["admin", "cities", "options"],
    queryFn: async () => {
      try {
        const nextCities = [];
        const seenIds = new Set();
        const pageSize = 50;
        let page = 1;
        let total = Number.POSITIVE_INFINITY;

        while (nextCities.length < total) {
          const response = await citiesAdminService.list({ page, pageSize });
          const collection = extractAdminCollection(response);
          total = collection.total || nextCities.length;

          if (collection.items.length === 0) {
            break;
          }

          collection.items.forEach((city) => {
            if (!seenIds.has(city.id)) {
              seenIds.add(city.id);
              nextCities.push(city);
            }
          });

          if (collection.items.length < pageSize) {
            break;
          }

          page += 1;
        }

        nextCities.sort((left, right) => left.name.localeCompare(right.name));
        return nextCities;
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
    cities: query.data ?? [],
    loading: query.isLoading,
  };
};
