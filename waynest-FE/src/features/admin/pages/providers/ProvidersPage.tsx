import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
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
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "displayName", label: "Display Name", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", required: true },
    {
      name: "providerType",
      label: "Provider Type",
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
    { name: "phone", label: "Phone", type: "text", required: true },
    { name: "website", label: "Website", type: "text", required: false },
    {
      name: "verificationStatus",
      label: "Verification Status",
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
      title: "Display Name",
      dataIndex: "displayName",
      key: "displayName",
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
    },
    {
      title: "Type",
      dataIndex: "providerType",
      key: "providerType",
    },
    {
      title: "Status",
      dataIndex: "verificationStatus",
      key: "verificationStatus",
    },
    {
      title: "Active",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (isActive ? "Yes" : "No"),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await adminService.fetchList("providers");
      setProviders(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load providers");
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
      await adminService.updateItem("providers", selectedProvider.id, values);
      message.success("Provider updated successfully");
      setModalOpen(false);
      setSelectedProvider(null);
      fetchProviders();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to update provider");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProvider) return;
    try {
      setFormLoading(true);
      await adminService.deleteItem("providers", selectedProvider.id);
      message.success("Provider deleted successfully");
      setDeleteModalOpen(false);
      setSelectedProvider(null);
      fetchProviders();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete provider");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Providers Management</h1>
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
        title="Edit Provider"
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
        title="Delete Provider"
        content={`Are you sure you want to delete provider ${selectedProvider?.displayName}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default ProvidersPage;
