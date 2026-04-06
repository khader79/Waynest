import { message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { extractAdminCollection } from "@/utils/adminCollection";
import { providersAdminService } from "@/api/admin";

export const useProviderOptions = (loadErrorMessage) => {
  const query = useQuery({
    queryKey: ["admin", "providers", "options"],
    queryFn: async () => {
      try {
        const response = await providersAdminService.list();
        const collection = extractAdminCollection(response);
        return [...collection.items].sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        );
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
    providers: query.data ?? [],
  };
};
