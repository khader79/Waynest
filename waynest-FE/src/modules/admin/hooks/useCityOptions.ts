import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { extractAdminCollection } from "@/modules/admin/utils/adminCollection";
import { citiesAdminService } from "@/services/admin/admin.service";

export interface CityOption {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export const useCityOptions = (loadErrorMessage: string) => {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoading(true);
        const nextCities: CityOption[] = [];
        const seenIds = new Set<string>();
        const pageSize = 50;
        let page = 1;
        let total = Number.POSITIVE_INFINITY;

        while (nextCities.length < total) {
          const response = await citiesAdminService.list({ page, pageSize });
          const collection = extractAdminCollection<CityOption>(response);
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
        setCities(nextCities);
      } catch {
        message.error(loadErrorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchCities();
  }, [loadErrorMessage]);

  return useMemo(
    () => ({
      cities,
      loading,
    }),
    [cities, loading],
  );
};
