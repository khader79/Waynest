import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
import type { ColumnsType } from "antd/es/table";

interface ProviderMembership {
  id: string;
  providerRole: string;
  createdAt: string;
}

function ProviderMembershipPage() {
  const [memberships, setMemberships] = useState<ProviderMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<ProviderMembership | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    {
      name: "providerRole",
      label: "Provider Role",
      type: "select",
      required: true,
      options: [
        { label: "OWNER", value: "OWNER" },
        { label: "MANAGER", value: "MANAGER" },
        { label: "STAFF", value: "STAFF" },
      ],
    },
  ];

  const columns: ColumnsType<ProviderMembership> = [
    {
      title: "Provider Role",
      dataIndex: "providerRole",
      key: "providerRole",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const data = await adminService.fetchList("providerMembership");
      setMemberships(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load provider memberships");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, []);

  const handleAdd = () => {
    setSelectedMembership(null);
    setModalOpen(true);
  };

  const handleEdit = (membership: ProviderMembership) => {
    setSelectedMembership(membership);
    setModalOpen(true);
  };

  const handleDelete = (membership: ProviderMembership) => {
    setSelectedMembership(membership);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedMembership) {
        await adminService.updateItem("providerMembership", selectedMembership.id, values);
        message.success("Provider membership updated successfully");
      } else {
        await adminService.createItem("providerMembership", values);
        message.success("Provider membership created successfully");
      }
      setModalOpen(false);
      setSelectedMembership(null);
      fetchMemberships();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save provider membership");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMembership) return;
    try {
      setFormLoading(true);
      await adminService.deleteItem("providerMembership", selectedMembership.id);
      message.success("Provider membership deleted successfully");
      setDeleteModalOpen(false);
      setSelectedMembership(null);
      fetchMemberships();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete provider membership");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Provider Membership Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Membership
        </Button>
      </div>
      <AdminTable
        data={memberships}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedMembership(null);
        }}
        onSubmit={handleSubmit}
        title={selectedMembership ? "Edit Provider Membership" : "Add Provider Membership"}
        initialValues={selectedMembership}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedMembership(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Provider Membership"
        content={`Are you sure you want to delete this membership?`}
        loading={formLoading}
      />
    </div>
  );
}

export default ProviderMembershipPage;
