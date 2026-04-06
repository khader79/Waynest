import { message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { extractAdminCollection } from "@/utils/adminCollection";
import { usersAdminService } from "@/api/admin";

export const useUserOptions = (loadErrorMessage) => {
  const query = useQuery({
    queryKey: ["admin", "users", "options"],
    queryFn: async () => {
      try {
        const response = await usersAdminService.list();
        const collection = extractAdminCollection(response);
        return [...collection.items].sort((left, right) =>
          (left.email || left.username || "").localeCompare(
            right.email || right.username || "",
          ),
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
    users: query.data ?? [],
  };
};
