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

interface City {
  id: string;
  name: string;
  stateName?: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  createdAt: string;
}

function CitiesPage() {
  const { t } = useTranslation();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [page, setPage] = useState(1);
  const fields: FormField[] = [
    {
      name: "name",
      label: t("admin.places.name"),
      type: "text",
      required: true,
    },
    { name: "stateName", label: "State Name", type: "text", required: false },
    {
      name: "latitude",
      label: t("admin.places.latitude"),
      type: "number",
      required: false,
    },
    {
      name: "longitude",
      label: t("admin.places.longitude"),
      type: "number",
      required: false,
    },
    {
      name: "population",
      label: "Population",
      type: "number",
      required: false,
    },
  ];

  const columns: ColumnsType<City> = [
    {
      title: t("admin.places.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: "State",
      dataIndex: "stateName",
      key: "stateName",
    },
    {
      title: "Population",
      dataIndex: "population",
      key: "population",
    },
    {
      title: t("admin.places.latitude"),
      dataIndex: "latitude",
      key: "latitude",
    },
    {
      title: t("admin.places.longitude"),
      dataIndex: "longitude",
      key: "longitude",
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchCities = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.CITIES_LIST(page));
      setCities(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(
        t("admin.common.failedToLoad") +
          " " +
          t("admin.cities.title").toLowerCase(),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const handleAdd = () => {
    setSelectedCity(null);
    setModalOpen(true);
  };

  const handleEdit = (city: City) => {
    setSelectedCity(city);
    setModalOpen(true);
  };

  const handleDelete = (city: City) => {
    setSelectedCity(city);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedCity) {
        await patch(ADMIN_ENDPOINTS.CITIES_UPDATE(selectedCity.id), values);
        message.success(
          t("admin.cities.title").split(" ")[0] +
            " " +
            t("admin.common.updatedSuccessfully"),
        );
      } else {
        await postJson(ADMIN_ENDPOINTS.CITIES_CREATE, values);
        message.success(
          t("admin.cities.title").split(" ")[0] +
            " " +
            t("admin.common.createdSuccessfully"),
        );
      }
      setModalOpen(false);
      setSelectedCity(null);
      fetchCities();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          t("admin.common.failedToSave") +
            " " +
            t("admin.cities.title").toLowerCase(),
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCity) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.CITIES_DELETE(selectedCity.id));
      message.success(
        t("admin.cities.title").split(" ")[0] +
          " " +
          t("admin.common.deletedSuccessfully"),
      );
      setDeleteModalOpen(false);
      setSelectedCity(null);
      fetchCities();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          t("admin.common.failedToDelete") +
            " " +
            t("admin.cities.title").toLowerCase(),
      );
    } finally {
      setFormLoading(false);
    }
  };
  useEffect(() => {
    fetchCities();
  }, [page]);
  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <button onClick={() => setPage((prev) => prev + 1)}>More</button>
        <h1>{t("admin.cities.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.cities.addCity")}
        </Button>
      </div>
      <AdminTable
        data={cities}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedCity(null);
        }}
        onSubmit={handleSubmit}
        title={
          selectedCity ? t("admin.cities.editCity") : t("admin.cities.addCity")
        }
        initialValues={selectedCity}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedCity(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("admin.cities.deleteCity")}
        content={`${t("admin.cities.deleteConfirm")} ${selectedCity?.name}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default CitiesPage;
