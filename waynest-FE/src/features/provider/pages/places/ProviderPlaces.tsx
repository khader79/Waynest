import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../../admin/components/AdminTable";
import AdminFormModal from "../../../admin/components/AdminFormModal";
import type { FormField } from "../../../admin/components/AdminFormModal";
import DeleteConfirmModal from "../../../admin/components/DeleteConfirmModal";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get, postJson, patch, del } from "../../../../api/apiService";
import { useAuth } from "../../../../context/AuthContext";
import type { ColumnsType } from "antd/es/table";

interface Place {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  latitude: number;
  longitude: number;
  ratingAverage: number;
  isActive: boolean;
  createdAt: string;
}

function ProviderPlaces() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { label: "HOTEL", value: "HOTEL" },
        { label: "RESTAURANT", value: "RESTAURANT" },
        { label: "ACTIVITY", value: "ACTIVITY" },
        { label: "TOUR", value: "TOUR" },
        { label: "LANDMARK", value: "LANDMARK" },
        { label: "CAFE", value: "CAFE" },
        { label: "PARK", value: "PARK" },
        { label: "SHOP", value: "SHOP" },
      ],
    },
    { name: "latitude", label: "Latitude", type: "number", required: true },
    { name: "longitude", label: "Longitude", type: "number", required: true },
  ];

  const columns: ColumnsType<Place> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Rating",
      dataIndex: "ratingAverage",
      key: "ratingAverage",
      render: (rating: number) => rating?.toFixed(2) || "0.00",
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

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.PLACES_LIST);
      // Filter places for current provider if needed
      setPlaces(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load places");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const handleAdd = () => {
    setSelectedPlace(null);
    setModalOpen(true);
  };

  const handleEdit = (place: Place) => {
    setSelectedPlace(place);
    setModalOpen(true);
  };

  const handleDelete = (place: Place) => {
    setSelectedPlace(place);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedPlace) {
        await patch(ADMIN_ENDPOINTS.PLACES_UPDATE(selectedPlace.id), values);
        message.success("Place updated successfully");
      } else {
        await postJson(ADMIN_ENDPOINTS.PLACES_CREATE, values);
        message.success("Place created successfully");
      }
      setModalOpen(false);
      setSelectedPlace(null);
      fetchPlaces();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save place");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPlace) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.PLACES_DELETE(selectedPlace.id));
      message.success("Place deleted successfully");
      setDeleteModalOpen(false);
      setSelectedPlace(null);
      fetchPlaces();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete place");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>My Places</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Place
        </Button>
      </div>
      <AdminTable
        data={places}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedPlace(null);
        }}
        onSubmit={handleSubmit}
        title={selectedPlace ? "Edit Place" : "Add Place"}
        initialValues={selectedPlace}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedPlace(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Place"
        content={`Are you sure you want to delete place ${selectedPlace?.name}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default ProviderPlaces;
