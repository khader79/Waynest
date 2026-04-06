import { message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { extractAdminCollection } from "@/utils/adminCollection";
import { tagsAdminService } from "@/api/admin";

export const useTagOptions = (loadErrorMessage) => {
  const query = useQuery({
    queryKey: ["admin", "tags", "options"],
    queryFn: async () => {
      try {
        const response = await tagsAdminService.list();
        const collection = extractAdminCollection(response);
        return [...collection.items].sort((left, right) =>
          left.name.localeCompare(right.name),
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
    tags: query.data ?? [],
  };
};
