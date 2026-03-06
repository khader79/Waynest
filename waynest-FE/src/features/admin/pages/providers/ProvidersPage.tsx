import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { useTranslation } from "react-i18next";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get, patch, del } from "../../../../api/apiService";
import type { ColumnsType } from "antd/es/table";

interface Provider {
  id: string;
  displayName: string;
  slug: string;
  providerType: string;
  verificationStatus: string;
  isActive: boolean;
  phone: string;
  website?: string;
  createdAt: string;
}

function ProvidersPage() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "displayName", label: t("admin.providers.displayName"), type: "text", required: true },
    { name: "slug", label: t("admin.places.slug"), type: "text", required: true },
    {
      name: "providerType",
      label: t("admin.providers.providerType"),
      type: "select",
      required: true,
      options: [
        { label: "HOTEL", value: "HOTEL" },
        { label: "RESTAURANT", value: "RESTAURANT" },
        { label: "TOUR_PROVIDER", value: "TOUR_PROVIDER" },
        { label: "EVENT_ORGANIZER", value: "EVENT_ORGANIZER" },
        { label: "ACTIVITY_PROVIDER", value: "ACTIVITY_PROVIDER" },
      ],
    },
    { name: "phone", label: t("admin.users.phone"), type: "text", required: true },
    { name: "website", label: t("admin.providers.website"), type: "text", required: false },
    {
      name: "verificationStatus",
      label: t("admin.providers.verificationStatus"),
      type: "select",
      required: true,
      options: [
        { label: "PENDING", value: "PENDING" },
        { label: "UNDER_REVIEW", value: "UNDER_REVIEW" },
        { label: "VERIFIED", value: "VERIFIED" },
        { label: "REJECTED", value: "REJECTED" },
        { label: "SUSPENDED", value: "SUSPENDED" },
      ],
    },
  ];

  const columns: ColumnsType<Provider> = [
    {
      title: t("admin.providers.displayName"),
      dataIndex: "displayName",
      key: "displayName",
    },
    {
      title: t("admin.places.slug"),
      dataIndex: "slug",
      key: "slug",
    },
    {
      title: t("admin.providers.providerType"),
      dataIndex: "providerType",
      key: "providerType",
    },
    {
      title: t("admin.providers.verificationStatus"),
      dataIndex: "verificationStatus",
      key: "verificationStatus",
    },
    {
      title: t("admin.places.isActive"),
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (isActive ? t("admin.common.yes") : t("admin.common.no")),
    },
    {
      title: t("admin.users.phone"),
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.PROVIDERS_LIST);
      setProviders(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(t("admin.common.failedToLoad") + " " + t("admin.providers.title").toLowerCase());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleEdit = (provider: Provider) => {
    setSelectedProvider(provider);
    setModalOpen(true);
  };

  const handleDelete = (provider: Provider) => {
    setSelectedProvider(provider);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    if (!selectedProvider) return;
    try {
      setFormLoading(true);
      await patch(ADMIN_ENDPOINTS.PROVIDERS_UPDATE(selectedProvider.id), values);
      message.success(t("admin.providers.title").split(" ")[0] + " " + t("admin.common.updatedSuccessfully"));
      setModalOpen(false);
      setSelectedProvider(null);
      fetchProviders();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToSave") + " " + t("admin.providers.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProvider) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.PROVIDERS_DELETE(selectedProvider.id));
      message.success(t("admin.providers.title").split(" ")[0] + " " + t("admin.common.deletedSuccessfully"));
      setDeleteModalOpen(false);
      setSelectedProvider(null);
      fetchProviders();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToDelete") + " " + t("admin.providers.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{t("admin.providers.title")}</h1>
      </div>
      <AdminTable
        data={providers}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedProvider(null);
        }}
        onSubmit={handleSubmit}
        title={t("admin.providers.editProvider")}
        initialValues={selectedProvider}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedProvider(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("admin.providers.deleteProvider")}
        content={`${t("admin.providers.deleteConfirm")} ${selectedProvider?.displayName}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default ProvidersPage;
