import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
import type { ColumnsType } from "antd/es/table";

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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: false },
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
      title: "Active",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (isActive ? "Yes" : "No"),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await adminService.fetchList("events");
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load events");
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
        await adminService.updateItem("events", selectedEvent.id, values);
        message.success("Event updated successfully");
      } else {
        await adminService.createItem("events", values);
        message.success("Event created successfully");
      }
      setModalOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save event");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEvent) return;
    try {
      setFormLoading(true);
      await adminService.deleteItem("events", selectedEvent.id);
      message.success("Event deleted successfully");
      setDeleteModalOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete event");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Events Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Event
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
        title={selectedEvent ? "Edit Event" : "Add Event"}
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
        title="Delete Event"
        content={`Are you sure you want to delete event ${selectedEvent?.title}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default EventsPage;
