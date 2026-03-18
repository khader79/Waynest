import { useState, useEffect, useMemo } from "react";
import { Button, message, Form } from "antd";
import { useTranslation } from "react-i18next";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get, postJson, patch, del } from "../../../../api/apiService";
import type { ColumnsType } from "antd/es/table";
import "./PlacesPage.css";

interface Place {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  latitude: number;
  longitude: number;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  city?: { id: string; name: string; latitude?: number; longitude?: number };
}

interface City {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

function PlacesPage() {
  const { t } = useTranslation();
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
      {
        name: "name",
        label: t("admin.places.name"),
        type: "text",
        required: true,
      },
      {
        name: "slug",
        label: t("admin.places.slug"),
        type: "text",
        required: true,
      },
      {
        name: "description",
        label: t("admin.places.description"),
        type: "textarea",
        required: true,
      },
      {
        name: "type",
        label: t("admin.places.type"),
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
      {
        name: "city",
        label: t("admin.places.city"),
        type: "select",
        required: true,
        options: cities.map((city) => ({ label: city.name, value: city.id })),
      },
      {
        name: "latitude",
        label: t("admin.places.latitude"),
        type: "number",
        required: true,
      },
      {
        name: "longitude",
        label: t("admin.places.longitude"),
        type: "number",
        required: true,
      },
    ],
    [cities, t],
  );
  const columns: ColumnsType<Place> = [
    { title: t("admin.places.name"), dataIndex: "name", key: "name" },
    { title: t("admin.places.slug"), dataIndex: "slug", key: "slug" },
    { title: t("admin.places.type"), dataIndex: "type", key: "type" },
    {
      title: t("admin.places.ratingAverage"),
      dataIndex: "ratingAverage",
      key: "ratingAverage",
      render: (rating) => rating,
    },
    {
      title: t("admin.places.isActive"),
      dataIndex: "isActive",
      key: "isActive",
      render: (active) =>
        active ? t("admin.common.yes") : t("admin.common.no"),
    },
    {
      title: t("admin.places.isVerified"),
      dataIndex: "isVerified",
      key: "isVerified",
      render: (verified) =>
        verified ? t("admin.common.yes") : t("admin.common.no"),
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];
  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const data = await get(ADMIN_ENDPOINTS.PLACES_LIST);
      setPlaces(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      message.error(
        `${t("admin.common.failedToLoad")} ${t("admin.places.title").toLowerCase()}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const data = await get(ADMIN_ENDPOINTS.CITIES_LIST(1));
      setCities(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      message.error(
        `${t("admin.common.failedToLoad")} ${t("admin.cities.title").toLowerCase()}`,
      );
    }
  };

  useEffect(() => {
    fetchPlaces();
    fetchCities();
  }, []);
  const handleCityChange = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    if (city?.latitude && city?.longitude) {
      form.setFieldsValue({
        latitude: city.latitude,
        longitude: city.longitude,
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
    form.setFieldsValue({ ...place, city: place.city?.id || null });
    setModalOpen(true);
  };

  const handleDelete = (place: Place) => {
    setSelectedPlace(place);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    try {
      if (selectedPlace) {
        await patch(ADMIN_ENDPOINTS.PLACES_UPDATE(selectedPlace.id), values);
        message.success(
          `${t("admin.places.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
        );
      } else {
        await postJson(ADMIN_ENDPOINTS.PLACES_CREATE, values);
        message.success(
          `${t("admin.places.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
        );
      }
      setModalOpen(false);
      setSelectedPlace(null);
      fetchPlaces();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          `${t("admin.common.failedToSave")} ${t("admin.places.title").toLowerCase()}`,
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPlace) return;
    setFormLoading(true);
    try {
      await del(ADMIN_ENDPOINTS.PLACES_DELETE(selectedPlace.id));
      message.success(
        `${t("admin.places.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
      );
      setDeleteModalOpen(false);
      setSelectedPlace(null);
      fetchPlaces();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          `${t("admin.common.failedToDelete")} ${t("admin.places.title").toLowerCase()}`,
      );
    } finally {
      setFormLoading(false);
    }
  };
  return (
    <div className="places-page">
      <header className="places-page-header">
        <h1>{t("admin.places.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.places.addPlace")}
        </Button>
      </header>

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
        title={
          selectedPlace
            ? t("admin.places.editPlace")
            : t("admin.places.addPlace")
        }
        initialValues={selectedPlace || {}}
        fields={fields}
        loading={formLoading}
        form={form}
        onFieldChange={{ city: handleCityChange }}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedPlace(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("admin.places.deletePlace")}
        content={`${t("admin.places.deleteConfirm")} ${selectedPlace?.name || ""}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default PlacesPage;
