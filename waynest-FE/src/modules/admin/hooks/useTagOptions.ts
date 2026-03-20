import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { extractAdminCollection } from "@/modules/admin/utils/adminCollection";
import { tagsAdminService } from "@/services/admin/admin.service";

export interface TagOption {
  id: string;
  name: string;
}

export const useTagOptions = (loadErrorMessage: string) => {
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        const response = await tagsAdminService.list();
        const collection = extractAdminCollection<TagOption>(response);
        const sortedTags = [...collection.items].sort((left, right) =>
          left.name.localeCompare(right.name),
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
      tags,
    }),
    [loading, tags],
  );
};
