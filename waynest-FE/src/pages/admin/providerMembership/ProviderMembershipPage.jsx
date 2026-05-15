import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { providerMembershipAdminService } from "@/api/admin";
import "./ProviderMembershipPage.css";

function ProviderMembershipPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const query = useMemo(
    () => ({ page, pageSize, search: searchQuery || undefined }),
    [page, pageSize, searchQuery],
  );

  const fields = [
    {
      name: "providerRole",
      label: t("admin.providerMembership.providerRole", "Provider Role"),
      type: "select",
      required: true,
      options: [
        {
          label: t("admin.providerMembership.roleOptions.owner", "Owner"),
          value: "OWNER",
        },
        {
          label: t("admin.providerMembership.roleOptions.manager", "Manager"),
          value: "MANAGER",
        },
        {
          label: t("admin.providerMembership.roleOptions.staff", "Staff"),
          value: "STAFF",
        },
      ],
    },
  ];

  const columns = [
    {
      title: t("admin.providerMembership.providerRole", "Provider Role"),
      dataIndex: "providerRole",
      key: "providerRole",
    },
    {
      title: t("admin.users.createdAt", "Created At"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
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
    total,
  } = useCrudPage({
    service: providerMembershipAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.providerMembership.title", "Provider membership").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.providerMembership.title", "Provider membership").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.providerMembership.title", "Provider membership").toLowerCase()}`,
      createdSuccess: `${t("admin.providerMembership.title", "Provider membership").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.providerMembership.title", "Provider membership").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.providerMembership.title", "Provider membership").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.providerMembership.title", "Provider membership")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.providerMembership.subtitle", {
              defaultValue: "Manage provider memberships",
            })}
          </p>
        </div>
      </div>

      <AdminTable
        data={records}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={openDelete}
        onAdd={openCreate}
        addLabel={t(
          "admin.providerMembership.addProviderMembership",
          "Add membership",
        )}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search memberships...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.providerMembership.title", "Provider membership")}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
          selectedRecord
            ? t(
                "admin.providerMembership.editProviderMembership",
                "Edit membership",
              )
            : t(
                "admin.providerMembership.addProviderMembership",
                "Add membership",
              )
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t(
          "admin.providerMembership.deleteProviderMembership",
          "Delete membership",
        )}
        content={`${t("admin.providerMembership.deleteConfirm", "Are you sure you want to delete this membership?")}?`}
        loading={submitting}
      />
    </div>
  );
}

export default ProviderMembershipPage;
