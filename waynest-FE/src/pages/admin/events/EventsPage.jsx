import { useMemo, useState } from "react";
import { Button, Form } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";

import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { usePlaceOptions } from "@/hooks/admin/usePlaceOptions";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { eventsAdminService } from "@/api/admin";
import "./EventsPage.css";

function EventsPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const query = useMemo(
    () => ({ page, pageSize }),
    [page, pageSize],
  );

  const { places } = usePlaceOptions(
    `${t("admin.common.failedToLoad")} ${t("admin.places.title").toLowerCase()}`,
  );

  const fields = [
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "description",
      label: t("admin.places.description"),
      type: "textarea",
      required: false,
    },
    {
      name: "venue",
      label: "Venue",
      type: "select",
      required: true,
      options: places.map((place) => ({ label: place.name, value: place.id })),
    },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    { name: "endDate", label: "End Date", type: "date", required: true },
    {
      name: "availableTickets",
      label: "Available Tickets",
      type: "number",
      required: true,
    },
    {
      name: "ticketPrice",
      label: "Ticket Price",
      type: "number",
      required: true,
    },
    {
      name: "currencyCode",
      label: "Currency Code",
      type: "text",
      required: true,
    },
  ];

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Venue",
      dataIndex: ["venue", "name"],
      key: "venue",
      render: (venueName) => venueName ?? "-",
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Available Tickets",
      dataIndex: "availableTickets",
      key: "availableTickets",
    },
    {
      title: "Ticket Price",
      dataIndex: "ticketPrice",
      key: "ticketPrice",
      render: (price, record) => `${price} ${record.currencyCode}`,
    },
    {
      title: t("admin.places.isActive"),
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) =>
        isActive ? t("admin.common.yes") : t("admin.common.no"),
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  const {
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
    selectedRecord,
    submit,
    submitting,
    total,
  } = useCrudPage({
    service: eventsAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.events.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.events.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.events.title").toLowerCase()}`,
      createdSuccess: `${t("admin.events.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.events.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.events.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  return (
    <div className="events-page">
      <div className="events-page-header">
        <h1>{t("admin.events.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("admin.events.addEvent")}
        </Button>
      </div>

      <AdminTable
        data={records}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={openDelete}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={() => {
          closeForm();
          form.resetFields();
        }}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.events.editEvent")
            : t("admin.events.addEvent")
        }
        initialValues={
          selectedRecord
            ? {
                ...selectedRecord,
                venue: selectedRecord.venue?.id ?? null,
              }
            : undefined
        }
        fields={fields}
        loading={submitting}
        form={form}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.events.deleteEvent")}
        content={`${t("admin.events.deleteConfirm")} ${selectedRecord?.title ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default EventsPage;
