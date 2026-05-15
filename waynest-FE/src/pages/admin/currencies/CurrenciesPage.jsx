import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { currenciesAdminService } from "@/api/admin";
import "./CurrenciesPage.css";

function CurrenciesPage() {
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
      name: "code",
      label: t("admin.currencies.code", "Code"),
      type: "text",
      required: true,
    },
    {
      name: "name",
      label: t("admin.places.name", "Name"),
      type: "text",
      required: true,
    },
    {
      name: "fractionSize",
      label: t("admin.currencies.fractionSize", "Fraction Size"),
      type: "number",
      required: false,
    },
  ];

  const columns = [
    {
      title: t("admin.currencies.code", "Code"),
      dataIndex: "code",
      key: "code",
    },
    {
      title: t("admin.places.name", "Name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("admin.currencies.fractionSize", "Fraction Size"),
      dataIndex: "fractionSize",
      key: "fractionSize",
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
    service: currenciesAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.currencies.title", "Currencies").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.currencies.title", "Currencies").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.currencies.title", "Currencies").toLowerCase()}`,
      createdSuccess: `${t("admin.currencies.title", "Currencies").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.currencies.title", "Currencies").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.currencies.title", "Currencies").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.currencies.title", "Currencies")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.currencies.subtitle", {
              defaultValue: "Manage currencies",
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
        addLabel={t("admin.currencies.addCurrency", "Add currency")}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search currencies...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.currencies.title", "Currencies")}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.currencies.editCurrency", "Edit currency")
            : t("admin.currencies.addCurrency", "Add currency")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.currencies.deleteCurrency", "Delete currency")}
        content={`${t("admin.currencies.deleteConfirm", "Are you sure you want to delete this currency?")} ${selectedRecord?.code ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default CurrenciesPage;
