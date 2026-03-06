import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
import type { ColumnsType } from "antd/es/table";

interface PlaceOpeningHour {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  createdAt: string;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function PlaceOpeningHoursPage() {
  const [openingHours, setOpeningHours] = useState<PlaceOpeningHour[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOpeningHour, setSelectedOpeningHour] = useState<PlaceOpeningHour | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    {
      name: "dayOfWeek",
      label: "Day of Week",
      type: "select",
      required: true,
      options: DAYS_OF_WEEK.map((day, index) => ({
        label: day,
        value: index,
      })),
    },
    { name: "openTime", label: "Open Time", type: "text", required: true, placeholder: "08:00" },
    { name: "closeTime", label: "Close Time", type: "text", required: true, placeholder: "17:00" },
  ];

  const columns: ColumnsType<PlaceOpeningHour> = [
    {
      title: "Day of Week",
      dataIndex: "dayOfWeek",
      key: "dayOfWeek",
      render: (day: number) => DAYS_OF_WEEK[day],
    },
    {
      title: "Open Time",
      dataIndex: "openTime",
      key: "openTime",
    },
    {
      title: "Close Time",
      dataIndex: "closeTime",
      key: "closeTime",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchOpeningHours = async () => {
    try {
      setLoading(true);
      const data = await adminService.fetchList("placeOpeningHours");
      setOpeningHours(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load place opening hours");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpeningHours();
  }, []);

  const handleAdd = () => {
    setSelectedOpeningHour(null);
    setModalOpen(true);
  };

  const handleEdit = (openingHour: PlaceOpeningHour) => {
    setSelectedOpeningHour(openingHour);
    setModalOpen(true);
  };

  const handleDelete = (openingHour: PlaceOpeningHour) => {
    setSelectedOpeningHour(openingHour);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedOpeningHour) {
        await adminService.updateItem("placeOpeningHours", selectedOpeningHour.id, values);
        message.success("Place opening hour updated successfully");
      } else {
        await adminService.createItem("placeOpeningHours", values);
        message.success("Place opening hour created successfully");
      }
      setModalOpen(false);
      setSelectedOpeningHour(null);
      fetchOpeningHours();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save place opening hour");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedOpeningHour) return;
    try {
      setFormLoading(true);
      await adminService.deleteItem("placeOpeningHours", selectedOpeningHour.id);
      message.success("Place opening hour deleted successfully");
      setDeleteModalOpen(false);
      setSelectedOpeningHour(null);
      fetchOpeningHours();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete place opening hour");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Place Opening Hours Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Opening Hour
        </Button>
      </div>
      <AdminTable
        data={openingHours}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedOpeningHour(null);
        }}
        onSubmit={handleSubmit}
        title={selectedOpeningHour ? "Edit Place Opening Hour" : "Add Place Opening Hour"}
        initialValues={selectedOpeningHour}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedOpeningHour(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Place Opening Hour"
        content={`Are you sure you want to delete this opening hour?`}
        loading={formLoading}
      />
    </div>
  );
}

export default PlaceOpeningHoursPage;
