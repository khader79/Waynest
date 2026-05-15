import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { citiesAdminService } from "@/api/admin";
import "./CitiesPage.css";

function CitiesPage() {
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
      name: "stateName",
      label: t("admin.cities.stateName", "State Name"),
      type: "text",
      required: false,
    },
    {
      name: "latitude",
      label: t("admin.places.latitude", "Latitude"),
      type: "number",
      required: false,
    },
    {
      name: "longitude",
      label: t("admin.places.longitude", "Longitude"),
      type: "number",
      required: false,
    },
    {
      name: "population",
      label: t("admin.cities.population", "Population"),
      type: "number",
      required: false,
    },
  ];

  const columns = [
    {
      title: t("admin.places.name", "Name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("admin.cities.stateName", "State"),
      dataIndex: "stateName",
      key: "stateName",
    },
    {
      title: t("admin.cities.population", "Population"),
      dataIndex: "population",
      key: "population",
    },
    {
      title: t("admin.places.latitude", "Latitude"),
      dataIndex: "latitude",
      key: "latitude",
    },
    {
      title: t("admin.places.longitude", "Longitude"),
      dataIndex: "longitude",
      key: "longitude",
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
    service: citiesAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.cities.title", "Cities").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.cities.title", "Cities").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.cities.title", "Cities").toLowerCase()}`,
      createdSuccess: `${t("admin.cities.title", "Cities").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.cities.title", "Cities").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.cities.title", "Cities").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.cities.title", "Cities")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.cities.subtitle", { defaultValue: "Manage cities" })}
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
        addLabel={t("admin.cities.addCity", "Add city")}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search cities...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.cities.title", "Cities")}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.cities.editCity", "Edit city")
            : t("admin.cities.addCity", "Add city")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.cities.deleteCity", "Delete city")}
        content={`${t("admin.cities.deleteConfirm", "Are you sure you want to delete this city?")} ${selectedRecord?.name ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default CitiesPage;
