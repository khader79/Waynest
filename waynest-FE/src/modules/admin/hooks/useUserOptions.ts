import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { extractAdminCollection } from "@/modules/admin/utils/adminCollection";
import { usersAdminService } from "@/services/admin/admin.service";

export interface UserOption {
  id: string;
  email: string;
  username?: string;
}

export const useUserOptions = (loadErrorMessage: string) => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await usersAdminService.list();
        const collection = extractAdminCollection<UserOption>(response);
        const sortedUsers = [...collection.items].sort((left, right) =>
          (left.email || left.username || "").localeCompare(
            right.email || right.username || "",
          ),
        );
        setUsers(sortedUsers);
      } catch {
        message.error(loadErrorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchUsers();
  }, [loadErrorMessage]);

  return useMemo(
    () => ({
      loading,
      users,
    }),
    [loading, users],
  );
};
