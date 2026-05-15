import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { tagsAdminService } from "@/api/admin";
import "./TagsPage.css";

function TagsPage() {
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
      name: "name",
      label: t("admin.places.name", "Name"),
      type: "text",
      required: true,
    },
  ];

  const columns = [
    {
      title: t("admin.places.name", "Name"),
      dataIndex: "name",
      key: "name",
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
    service: tagsAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.tags.title", "Tags").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.tags.title", "Tags").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.tags.title", "Tags").toLowerCase()}`,
      createdSuccess: `${t("admin.tags.title", "Tags").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.tags.title", "Tags").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.tags.title", "Tags").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">{t("admin.tags.title", "Tags")}</h1>
          <p className="crud-page-subtitle">
            {t("admin.tags.subtitle", { defaultValue: "Manage tags" })}
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
        addLabel={t("admin.tags.addTag", "Add Tag")}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search tags...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.tags.title", "Tags")}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.tags.editTag", "Edit Tag")
            : t("admin.tags.addTag", "Add Tag")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.tags.deleteTag", "Delete Tag")}
        content={`${t("admin.tags.deleteConfirm", "Delete")} ${selectedRecord?.name ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default TagsPage;
