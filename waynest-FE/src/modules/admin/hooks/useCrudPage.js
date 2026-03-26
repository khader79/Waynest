import { message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/core/utils/errors";

































export const useCrudPage = (



{
  service,
  mapListResponse,
  query,
  messages
}) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const response = await service.list(query);
      const collection = mapListResponse(response);
      setRecords(collection.items);
      setTotal(collection.total ?? collection.items.length);
    } catch {
      message.error(messages.loadError);
    } finally {
      setLoading(false);
    }
  }, [mapListResponse, messages.loadError, query, service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      try {
        setSubmitting(true);

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
    [closeForm, messages.createdSuccess, messages.saveError, messages.updatedSuccess, refresh, selectedRecord, service]
  );

  const confirmDelete = useCallback(async () => {
    if (!selectedRecord) {
      return;
    }

    try {
      setSubmitting(true);
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
      loading,
      openCreate,
      openDelete,
      openEdit,
      records,
      refresh,
      selectedRecord,
      submit,
      submitting,
      total
    }),
    [
    closeDelete,
    closeForm,
    confirmDelete,
    isDeleteOpen,
    isFormOpen,
    loading,
    openCreate,
    openDelete,
    openEdit,
    records,
    refresh,
    selectedRecord,
    submit,
    submitting,
    total]

  );
};