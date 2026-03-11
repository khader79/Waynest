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
import "./CountriesPage.css";

interface Country {
  id: string;
  name: string;
  nativeName?: string;
  alpha2Code: string;
  alpha3Code: string;
  numericCode?: string;
  region?: string;
  capital?: string;
  createdAt: string;
}

function CountriesPage() {
  const { t } = useTranslation();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "name", label: t("admin.places.name"), type: "text", required: true },
    { name: "nativeName", label: "Native Name", type: "text", required: false },
    { name: "alpha2Code", label: "Alpha 2 Code", type: "text", required: true },
    { name: "alpha3Code", label: "Alpha 3 Code", type: "text", required: true },
    { name: "numericCode", label: "Numeric Code", type: "text", required: false },
    { name: "region", label: t("destinations.labels.region"), type: "text", required: false },
    { name: "capital", label: t("destinations.labels.capital"), type: "text", required: false },
  ];

  const columns: ColumnsType<Country> = [
    {
      title: t("admin.places.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Alpha 2",
      dataIndex: "alpha2Code",
      key: "alpha2Code",
    },
    {
      title: "Alpha 3",
      dataIndex: "alpha3Code",
      key: "alpha3Code",
    },
    {
      title: t("destinations.labels.region"),
      dataIndex: "region",
      key: "region",
    },
    {
      title: t("destinations.labels.capital"),
      dataIndex: "capital",
      key: "capital",
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.COUNTRIES_LIST);
      setCountries(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(t("admin.common.failedToLoad") + " " + t("admin.countries.title").toLowerCase());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const handleAdd = () => {
    setSelectedCountry(null);
    setModalOpen(true);
  };

  const handleEdit = (country: Country) => {
    setSelectedCountry(country);
    setModalOpen(true);
  };

  const handleDelete = (country: Country) => {
    setSelectedCountry(country);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedCountry) {
        await patch(ADMIN_ENDPOINTS.COUNTRIES_UPDATE(selectedCountry.id), values);
        message.success(t("admin.countries.title").split(" ")[0] + " " + t("admin.common.updatedSuccessfully"));
      } else {
        await postJson(ADMIN_ENDPOINTS.COUNTRIES_CREATE, values);
        message.success(t("admin.countries.title").split(" ")[0] + " " + t("admin.common.createdSuccessfully"));
      }
      setModalOpen(false);
      setSelectedCountry(null);
      fetchCountries();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToSave") + " " + t("admin.countries.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCountry) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.COUNTRIES_DELETE(selectedCountry.id));
      message.success(t("admin.countries.title").split(" ")[0] + " " + t("admin.common.deletedSuccessfully"));
      setDeleteModalOpen(false);
      setSelectedCountry(null);
      fetchCountries();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToDelete") + " " + t("admin.countries.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="countries-page">
      <div className="countries-page-header">
        <h1>{t("admin.countries.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.countries.addCountry")}
        </Button>
      </div>
      <AdminTable
        data={countries}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedCountry(null);
        }}
        onSubmit={handleSubmit}
        title={selectedCountry ? t("admin.countries.editCountry") : t("admin.countries.addCountry")}
        initialValues={selectedCountry}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedCountry(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("admin.countries.deleteCountry")}
        content={`${t("admin.countries.deleteConfirm")} ${selectedCountry?.name}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default CountriesPage;
