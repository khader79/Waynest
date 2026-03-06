import { useState, useEffect, useMemo } from "react";
import { Button, message, Form } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
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
  ratingCount: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  city?: {
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
  };
}

interface City {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  const fields: FormField[] = useMemo(
    () => [
      { name: "name", label: "Name", type: "text" as const, required: true },
      { name: "slug", label: "Slug", type: "text" as const, required: true },
      { name: "description", label: "Description", type: "textarea" as const, required: true },
      {
        name: "type",
        label: "Type",
        type: "select" as const,
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
      {
        name: "city",
        label: "City",
        type: "select" as const,
        required: true,
        options: cities.map((city) => ({
          label: city.name,
          value: city.id,
        })),
      },
      { name: "latitude", label: "Latitude", type: "number" as const, required: true },
      { name: "longitude", label: "Longitude", type: "number" as const, required: true },
    ],
    [cities]
  );

  const columns: ColumnsType<Place> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
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
      title: "Verified",
      dataIndex: "isVerified",
      key: "isVerified",
      render: (isVerified: boolean) => (isVerified ? "Yes" : "No"),
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
      const data = await adminService.fetchList("places");
      setPlaces(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load places");
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const data = await adminService.fetchList("cities");
      setCities(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load cities");
    }
  };

  useEffect(() => {
    fetchPlaces();
    fetchCities();
  }, []);

  const handleCityChange = (cityId: string) => {
    const selectedCity = cities.find((c) => c.id === cityId);
    if (selectedCity && selectedCity.latitude && selectedCity.longitude) {
      form.setFieldsValue({
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
      });
    }
  };

  const handleAdd = () => {
    setSelectedPlace(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (place: Place) => {
    setSelectedPlace(place);
    // Set city ID if place has city relation
    const placeData = {
      ...place,
      city: place.city?.id || null,
    };
    form.setFieldsValue(placeData);
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
        await adminService.updateItem("places", selectedPlace.id, values);
        message.success("Place updated successfully");
      } else {
        await adminService.createItem("places", values);
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
      await adminService.deleteItem("places", selectedPlace.id);
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
        <h1>Places Management</h1>
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
          form.resetFields();
        }}
        onSubmit={handleSubmit}
        title={selectedPlace ? "Edit Place" : "Add Place"}
        initialValues={selectedPlace}
        fields={fields}
        loading={formLoading}
        form={form}
        onFieldChange={{
          city: handleCityChange,
        }}
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

export default PlacesPage;
