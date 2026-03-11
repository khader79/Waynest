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
import "./ProviderMembershipPage.css";

interface ProviderMembership {
  id: string;
  providerRole: string;
  createdAt: string;
}

function ProviderMembershipPage() {
  const { t } = useTranslation();
  const [memberships, setMemberships] = useState<ProviderMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<ProviderMembership | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    {
      name: "providerRole",
      label: t("admin.providerMembership.providerRole"),
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
      title: t("admin.providerMembership.providerRole"),
      dataIndex: "providerRole",
      key: "providerRole",
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.PROVIDER_MEMBERSHIP_LIST);
      setMemberships(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(t("admin.common.failedToLoad") + " " + t("admin.providerMembership.title").toLowerCase());
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
        await patch(ADMIN_ENDPOINTS.PROVIDER_MEMBERSHIP_UPDATE(selectedMembership.id), values);
        message.success(t("admin.providerMembership.title").split(" ")[0] + " " + t("admin.common.updatedSuccessfully"));
      } else {
        await postJson(ADMIN_ENDPOINTS.PROVIDER_MEMBERSHIP_CREATE, values);
        message.success(t("admin.providerMembership.title").split(" ")[0] + " " + t("admin.common.createdSuccessfully"));
      }
      setModalOpen(false);
      setSelectedMembership(null);
      fetchMemberships();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToSave") + " " + t("admin.providerMembership.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMembership) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.PROVIDER_MEMBERSHIP_DELETE(selectedMembership.id));
      message.success(t("admin.providerMembership.title").split(" ")[0] + " " + t("admin.common.deletedSuccessfully"));
      setDeleteModalOpen(false);
      setSelectedMembership(null);
      fetchMemberships();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToDelete") + " " + t("admin.providerMembership.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="provider-membership-page">
      <div className="provider-membership-page-header">
        <h1>{t("admin.providerMembership.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.providerMembership.addProviderMembership")}
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
        title={selectedMembership ? t("admin.providerMembership.editProviderMembership") : t("admin.providerMembership.addProviderMembership")}
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
        title={t("admin.providerMembership.deleteProviderMembership")}
        content={`${t("admin.providerMembership.deleteConfirm")}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default ProviderMembershipPage;
