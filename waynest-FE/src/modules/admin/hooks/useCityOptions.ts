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
        const response = await citiesAdminService.list({ page: 1 });
        const collection = extractAdminCollection<CityOption>(response);
        setCities(collection.items);
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
