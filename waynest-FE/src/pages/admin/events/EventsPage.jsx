import { useMemo, useState } from "react";
import { Form } from "antd";
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
  const [searchQuery, setSearchQuery] = useState("");

  const query = useMemo(
    () => ({ page, pageSize, search: searchQuery || undefined }),
    [page, pageSize, searchQuery],
  );

  const { places } = usePlaceOptions(
    `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.places.title", "Places").toLowerCase()}`,
  );

  const fields = [
    {
      name: "title",
      label: t("admin.events.titleField", "Title"),
      type: "text",
      required: true,
    },
    {
      name: "description",
      label: t("admin.places.description", "Description"),
      type: "textarea",
      required: false,
    },
    {
      name: "venue",
      label: t("admin.events.venue", "Venue"),
      type: "select",
      required: true,
      options: places.map((place) => ({ label: place.name, value: place.id })),
    },
    {
      name: "startDate",
      label: t("admin.events.startDate", "Start Date"),
      type: "date",
      required: true,
    },
    {
      name: "endDate",
      label: t("admin.events.endDate", "End Date"),
      type: "date",
      required: true,
    },
    {
      name: "availableTickets",
      label: t("admin.events.availableTickets", "Available Tickets"),
      type: "number",
      required: true,
    },
    {
      name: "ticketPrice",
      label: t("admin.events.ticketPrice", "Ticket Price"),
      type: "number",
      required: true,
    },
    {
      name: "currencyCode",
      label: t("admin.events.currencyCode", "Currency Code"),
      type: "text",
      required: true,
    },
  ];

  const columns = [
    {
      title: t("admin.events.titleField", "Title"),
      dataIndex: "title",
      key: "title",
    },
    {
      title: t("admin.events.startDate", "Start Date"),
      dataIndex: "startDate",
      key: "startDate",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: t("admin.events.venue", "Venue"),
      dataIndex: ["venue", "name"],
      key: "venue",
      render: (venueName) => venueName ?? "-",
    },
    {
      title: t("admin.events.endDate", "End Date"),
      dataIndex: "endDate",
      key: "endDate",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: t("admin.events.availableTickets", "Available Tickets"),
      dataIndex: "availableTickets",
      key: "availableTickets",
    },
    {
      title: t("admin.events.ticketPrice", "Ticket Price"),
      dataIndex: "ticketPrice",
      key: "ticketPrice",
      render: (price, record) => `${price} ${record.currencyCode}`,
    },
    {
      title: t("admin.places.isActive", "Active"),
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) =>
        isActive ? t("admin.common.yes", "Yes") : t("admin.common.no", "No"),
    },
    {
      title: t("admin.users.createdAt", "Created At"),
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
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.events.title", "Events").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.events.title", "Events").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.events.title", "Events").toLowerCase()}`,
      createdSuccess: `${t("admin.events.title", "Events").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.events.title", "Events").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.events.title", "Events").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.events.title", "Events")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.events.subtitle", { defaultValue: "Manage events" })}
          </p>
        </div>
      </div>

      <AdminTable
        data={records}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={openDelete}
        onAdd={openCreate}
        addLabel={t("admin.events.addEvent", "Add Event")}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search events...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.events.title", "Events")}
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
            ? t("admin.events.editEvent", "Edit Event")
            : t("admin.events.addEvent", "Add Event")
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
        title={t("admin.events.deleteEvent", "Delete Event")}
        content={`${t("admin.events.deleteConfirm", "Delete")} ${selectedRecord?.title ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default EventsPage;
