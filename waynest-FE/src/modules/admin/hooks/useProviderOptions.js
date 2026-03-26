import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { extractAdminCollection } from "@/modules/admin/utils/adminCollection";
import { providersAdminService } from "@/modules/admin/api";






export const useProviderOptions = (loadErrorMessage) => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        const response = await providersAdminService.list();
        const collection = extractAdminCollection(response);
        const sortedProviders = [...collection.items].sort((left, right) =>
        left.displayName.localeCompare(right.displayName)
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
      providers
    }),
    [loading, providers]
  );
};