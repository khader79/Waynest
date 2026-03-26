import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { extractAdminCollection } from "@/modules/admin/utils/adminCollection";
import { tagsAdminService } from "@/modules/admin/api";






export const useTagOptions = (loadErrorMessage) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        const response = await tagsAdminService.list();
        const collection = extractAdminCollection(response);
        const sortedTags = [...collection.items].sort((left, right) =>
        left.name.localeCompare(right.name)
        );
        setTags(sortedTags);
      } catch {
        message.error(loadErrorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchTags();
  }, [loadErrorMessage]);

  return useMemo(
    () => ({
      loading,
      tags
    }),
    [loading, tags]
  );
};