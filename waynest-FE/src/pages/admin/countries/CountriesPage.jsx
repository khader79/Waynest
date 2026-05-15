import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { countriesAdminService } from "@/api/admin";
import "./CountriesPage.css";

function CountriesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const query = useMemo(
    () => ({
      page,
      pageSize,
      search: searchQuery || undefined,
    }),
    [page, pageSize, searchQuery],
  );

  const fields = [
    {
      name: "name",
      label: t("admin.places.name", "Name"),
      type: "text",
      required: true,
    },
    {
      name: "nativeName",
      label: t("admin.countries.nativeName", "Native name"),
      type: "text",
      required: false,
    },
    {
      name: "alpha2Code",
      label: t("admin.countries.alpha2", "Alpha-2"),
      type: "text",
      required: true,
    },
    {
      name: "alpha3Code",
      label: t("admin.countries.alpha3", "Alpha-3"),
      type: "text",
      required: true,
    },
    {
      name: "numericCode",
      label: t("admin.countries.numeric", "Numeric"),
      type: "text",
      required: false,
    },
    {
      name: "region",
      label: t("destinations.labels.region"),
      type: "text",
      required: false,
    },
    {
      name: "capital",
      label: t("destinations.labels.capital"),
      type: "text",
      required: false,
    },
  ];

  const columns = [
    { title: t("admin.places.name", "Name"), dataIndex: "name", key: "name" },
    {
      title: t("admin.countries.alpha2", "Alpha-2"),
      dataIndex: "alpha2Code",
      key: "alpha2Code",
    },
    {
      title: t("admin.countries.alpha3", "Alpha-3"),
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
    service: countriesAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.countries.title", "Countries").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.countries.title", "Countries").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.countries.title", "Countries").toLowerCase()}`,
      createdSuccess: `${t("admin.countries.title", "Countries").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.countries.title", "Countries").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.countries.title", "Countries").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.countries.title", "Countries")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.countries.subtitle", {
              defaultValue: "Manage countries",
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
        addLabel={t("admin.countries.addCountry", "Add country")}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search countries...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.countries.title", "Countries")}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.countries.editCountry", "Edit country")
            : t("admin.countries.addCountry", "Add country")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.countries.deleteCountry", "Delete country")}
        content={`${t("admin.countries.deleteConfirm", "Are you sure you want to delete this country?")} ${selectedRecord?.name ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default CountriesPage;
