import { useTranslation } from "react-i18next";
import type { ColumnsType } from "antd/es/table";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import AdminTable from "../../components/AdminTable/AdminTable";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { useCrudPage } from "../../hooks/useCrudPage";
import { extractAdminCollection } from "../../utils/adminCollection";
import { providersAdminService } from "@/services/admin/admin.service";
import "./ProvidersPage.css";

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

  const fields: FormField[] = [
    {
      name: "displayName",
      label: t("admin.providers.displayName"),
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
    {
      name: "phone",
      label: t("admin.users.phone"),
      type: "text",
      required: true,
    },
    {
      name: "website",
      label: t("admin.providers.website"),
      type: "text",
      required: false,
    },
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
      render: (isActive: boolean) =>
        isActive ? t("admin.common.yes") : t("admin.common.no"),
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

  const {
    closeDelete,
    closeForm,
    confirmDelete,
    isDeleteOpen,
    isFormOpen,
    loading,
    openDelete,
    openEdit,
    records,
    selectedRecord,
    submit,
    submitting,
  } = useCrudPage<Provider, Record<string, unknown>>({
    service: providersAdminService,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.providers.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.providers.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.providers.title").toLowerCase()}`,
      createdSuccess: t("admin.common.createdSuccessfully"),
      updatedSuccess: `${t("admin.providers.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.providers.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  return (
    <div className="providers-page">
      <div className="providers-page-header">
        <h1>{t("admin.providers.title")}</h1>
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
        title={t("admin.providers.editProvider")}
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.providers.deleteProvider")}
        content={`${t("admin.providers.deleteConfirm")} ${selectedRecord?.displayName ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default ProvidersPage;
