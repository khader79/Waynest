import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { extractAdminCollection } from "@/modules/admin/utils/adminCollection";
import { providersAdminService } from "@/services/admin/admin.service";

export interface ProviderOption {
  id: string;
  displayName: string;
}

export const useProviderOptions = (loadErrorMessage: string) => {
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        const response = await providersAdminService.list();
        const collection = extractAdminCollection<ProviderOption>(response);
        const sortedProviders = [...collection.items].sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        );
        setProviders(sortedProviders);
      } catch {
        message.error(loadErrorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchProviders();
  }, [loadErrorMessage]);

  return useMemo(
    () => ({
      loading,
      providers,
    }),
    [loading, providers],
  );
};
