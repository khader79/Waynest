import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { useTranslation } from "react-i18next";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get, postJson, patch, del } from "../../../../api/apiService";
import type { ColumnsType } from "antd/es/table";
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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: t("admin.places.description"), type: "textarea", required: false },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    { name: "endDate", label: "End Date", type: "date", required: true },
    { name: "availableTickets", label: "Available Tickets", type: "number", required: true },
    { name: "ticketPrice", label: "Ticket Price", type: "number", required: true },
    { name: "currencyCode", label: "Currency Code", type: "text", required: true },
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
      render: (isActive: boolean) => (isActive ? t("admin.common.yes") : t("admin.common.no")),
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.EVENTS_LIST);
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(t("admin.common.failedToLoad") + " " + t("admin.events.title").toLowerCase());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAdd = () => {
    setSelectedEvent(null);
    setModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleDelete = (event: Event) => {
    setSelectedEvent(event);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedEvent) {
        await patch(ADMIN_ENDPOINTS.EVENTS_UPDATE(selectedEvent.id), values);
        message.success(t("admin.events.title").split(" ")[0] + " " + t("admin.common.updatedSuccessfully"));
      } else {
        await postJson(ADMIN_ENDPOINTS.EVENTS_CREATE, values);
        message.success(t("admin.events.title").split(" ")[0] + " " + t("admin.common.createdSuccessfully"));
      }
      setModalOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToSave") + " " + t("admin.events.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEvent) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.EVENTS_DELETE(selectedEvent.id));
      message.success(t("admin.events.title").split(" ")[0] + " " + t("admin.common.deletedSuccessfully"));
      setDeleteModalOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToDelete") + " " + t("admin.events.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="events-page">
      <div className="events-page-header">
        <h1>{t("admin.events.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.events.addEvent")}
        </Button>
      </div>
      <AdminTable
        data={events}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedEvent(null);
        }}
        onSubmit={handleSubmit}
        title={selectedEvent ? t("admin.events.editEvent") : t("admin.events.addEvent")}
        initialValues={selectedEvent}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedEvent(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("admin.events.deleteEvent")}
        content={`${t("admin.events.deleteConfirm")} ${selectedEvent?.title}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default EventsPage;
