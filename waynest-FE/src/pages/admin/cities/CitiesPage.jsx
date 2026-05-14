import { useMemo, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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

  const query = useMemo(
    () => ({
      page,
      pageSize,
    }),
    [page, pageSize],
  );

  const fields = [
    {
      name: "name",
      label: t("admin.places.name"),
      type: "text",
      required: true,
    },
    { name: "stateName", label: t("admin.cities.stateName", "State Name"), type: "text", required: false },
    {
      name: "latitude",
      label: t("admin.places.latitude"),
      type: "number",
      required: false,
    },
    {
      name: "longitude",
      label: t("admin.places.longitude"),
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
      title: t("admin.places.name"),
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
      title: t("admin.places.latitude"),
      dataIndex: "latitude",
      key: "latitude",
    },
    {
      title: t("admin.places.longitude"),
      dataIndex: "longitude",
      key: "longitude",
    },
    {
      title: t("admin.users.createdAt"),
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
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.cities.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.cities.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.cities.title").toLowerCase()}`,
      createdSuccess: `${t("admin.cities.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.cities.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.cities.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  return (
    <div className="cities-page">
      <div className="cities-page-header">
        <h1>{t("admin.cities.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("admin.cities.addCity")}
        </Button>
      </div>

      <AdminTable
        data={records}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={openDelete}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.cities.editCity")
            : t("admin.cities.addCity")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.cities.deleteCity")}
        content={`${t("admin.cities.deleteConfirm")} ${selectedRecord?.name ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default CitiesPage;
