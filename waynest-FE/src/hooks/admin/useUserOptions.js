import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { extractAdminCollection } from "@/utils/adminCollection";
import { usersAdminService } from "@/api/admin";







export const useUserOptions = (loadErrorMessage) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await usersAdminService.list();
        const collection = extractAdminCollection(response);
        const sortedUsers = [...collection.items].sort((left, right) =>
        (left.email || left.username || "").localeCompare(
          right.email || right.username || ""
        )
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
      users
    }),
    [loading, users]
  );
};