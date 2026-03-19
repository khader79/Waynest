import { message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/core/utils/errors";

type CrudEntity = {
  id: string;
};

type CrudService<TFormValues, TQuery> = {
  list: (query?: TQuery) => Promise<unknown>;
  create?: (payload: TFormValues) => Promise<unknown>;
  update: (id: string, payload: TFormValues) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

type CrudMessages = {
  createdSuccess: string;
  deletedSuccess: string;
  deleteError: string;
  loadError: string;
  saveError: string;
  updatedSuccess: string;
};

type CrudCollection<TRecord> = {
  items: TRecord[];
  total?: number;
};

type UseCrudPageOptions<TRecord extends CrudEntity, TFormValues, TQuery> = {
  mapListResponse: (payload: unknown) => CrudCollection<TRecord>;
  messages: CrudMessages;
  query?: TQuery;
  service: CrudService<TFormValues, TQuery>;
};

export const useCrudPage = <
  TRecord extends CrudEntity,
  TFormValues = Record<string, unknown>,
  TQuery = void,
>({
  service,
  mapListResponse,
  query,
  messages,
}: UseCrudPageOptions<TRecord, TFormValues, TQuery>) => {
  const [records, setRecords] = useState<TRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TRecord | null>(null);
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

  const openEdit = useCallback((record: TRecord) => {
    setSelectedRecord(record);
    setIsFormOpen(true);
  }, []);

  const openDelete = useCallback((record: TRecord) => {
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
    async (values: TFormValues) => {
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
    [closeForm, messages.createdSuccess, messages.saveError, messages.updatedSuccess, refresh, selectedRecord, service],
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
      total,
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
      total,
    ],
  );
};
