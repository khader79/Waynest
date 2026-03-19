import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { ColumnsType } from "antd/es/table";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import AdminTable from "../../components/AdminTable/AdminTable";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { useCrudPage } from "../../hooks/useCrudPage";
import { extractAdminCollection } from "../../utils/adminCollection";
import { providerMembershipAdminService } from "@/services/admin/admin.service";
import "./ProviderMembershipPage.css";

interface ProviderMembership {
  id: string;
  providerRole: string;
  createdAt: string;
}

function ProviderMembershipPage() {
  const { t } = useTranslation();

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

  const {
    closeDelete,
    closeForm,
    confirmDelete,
    isDeleteOpen,
    isFormOpen,
    loading,
    openCreate,
    openDelete,
    openEdit,
    records,
    selectedRecord,
    submit,
    submitting,
  } = useCrudPage<ProviderMembership, Record<string, unknown>>({
    service: providerMembershipAdminService,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.providerMembership.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.providerMembership.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.providerMembership.title").toLowerCase()}`,
      createdSuccess: `${t("admin.providerMembership.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.providerMembership.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.providerMembership.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  return (
    <div className="provider-membership-page">
      <div className="provider-membership-page-header">
        <h1>{t("admin.providerMembership.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("admin.providerMembership.addProviderMembership")}
        </Button>
      </div>

      <AdminTable
        data={records}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.providerMembership.editProviderMembership")
            : t("admin.providerMembership.addProviderMembership")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.providerMembership.deleteProviderMembership")}
        content={`${t("admin.providerMembership.deleteConfirm")}?`}
        loading={submitting}
      />
    </div>
  );
}

export default ProviderMembershipPage;
