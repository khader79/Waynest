import { message } from "antd";
import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/utils/errors";

export const useCrudPage = ({ service, mapListResponse, query, messages }) => {
  const qc = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const serializedQuery = useMemo(() => JSON.stringify(query ?? {}), [query]);
  const queryKey = useMemo(
    () => ["admin", "crud", service.cacheKey ?? "unknown", serializedQuery],
    [serializedQuery, service.cacheKey],
  );

  const listQuery = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const response = await service.list(query);
        const collection = mapListResponse(response);
        return {
          items: collection.items,
          total: collection.total ?? collection.items.length,
        };
      } catch (error) {
        message.error(messages.loadError);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey });
  }, [qc, queryKey]);

  const openCreate = useCallback(() => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  }, []);

  const openEdit = useCallback((record) => {
    setSelectedRecord(record);
    setIsFormOpen(true);
  }, []);

  const openDelete = useCallback((record) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setSelectedRecord(null);
  }, []);

  const closeDelete = useCallback(() => {
    setIsDeleteOpen(false);
    setSelectedRecord(null);
  }, []);

  const submit = useCallback(
    async (values) => {
      setSubmitting(true);
      try {
        if (selectedRecord) {
          await service.update(selectedRecord.id, values);
          message.success(messages.updatedSuccess);
        } else if (service.create) {
          await service.create(values);
          message.success(messages.createdSuccess);
        } else {
          throw new Error("Create operation is not available for this page.");
        }

        closeForm();
        await refresh();
      } catch (error) {
        message.error(getApiErrorMessage(error, messages.saveError));
      } finally {
        setSubmitting(false);
      }
    },
    [closeForm, messages.createdSuccess, messages.saveError, messages.updatedSuccess, refresh, selectedRecord, service],
  );

  const confirmDelete = useCallback(async () => {
    if (!selectedRecord) {
      return;
    }

    setSubmitting(true);
    try {
      await service.remove(selectedRecord.id);
      message.success(messages.deletedSuccess);
      closeDelete();
      await refresh();
    } catch (error) {
      message.error(getApiErrorMessage(error, messages.deleteError));
    } finally {
      setSubmitting(false);
    }
  }, [closeDelete, messages.deleteError, messages.deletedSuccess, refresh, selectedRecord, service]);

  return useMemo(
    () => ({
      closeDelete,
      closeForm,
      confirmDelete,
      isDeleteOpen,
      isFormOpen,
      loading: listQuery.isLoading,
      openCreate,
      openDelete,
      openEdit,
      records: listQuery.data?.items ?? [],
      refresh,
      selectedRecord,
      submit,
      submitting,
      total: listQuery.data?.total ?? 0,
    }),
    [
      closeDelete,
      closeForm,
      confirmDelete,
      isDeleteOpen,
      isFormOpen,
      listQuery.data,
      listQuery.isFetching,
      listQuery.isLoading,
      openCreate,
      openDelete,
      openEdit,
      refresh,
      selectedRecord,
      submit,
    ],
  );
};
