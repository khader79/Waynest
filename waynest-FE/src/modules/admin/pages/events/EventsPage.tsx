import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { ColumnsType } from "antd/es/table";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import AdminTable from "../../components/AdminTable/AdminTable";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { useCrudPage } from "../../hooks/useCrudPage";
import { extractAdminCollection } from "../../utils/adminCollection";
import { eventsAdminService } from "@/services/admin/admin.service";
import "./EventsPage.css";

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  availableTickets: number;
  ticketPrice: number;
  currencyCode: string;
  isActive: boolean;
  createdAt: string;
}

function EventsPage() {
  const { t } = useTranslation();

  const fields: FormField[] = [
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "description",
      label: t("admin.places.description"),
      type: "textarea",
      required: false,
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

  const columns: ColumnsType<Event> = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (date: string) => new Date(date).toLocaleDateString(),
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
      render: (price: number, record: Event) => `${price} ${record.currencyCode}`,
    },
    {
      title: t("admin.places.isActive"),
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) =>
        isActive ? t("admin.common.yes") : t("admin.common.no"),
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
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
  } = useCrudPage<Event, Record<string, unknown>>({
    service: eventsAdminService,
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
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={selectedRecord ? t("admin.events.editEvent") : t("admin.events.addEvent")}
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
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
