import { useMemo, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import AdminFormModal from "../../components/AdminFormModal";

import AdminTable from "../../components/AdminTable/AdminTable";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { useCrudPage } from "../../hooks/useCrudPage";
import { extractAdminCollection } from "../../utils/adminCollection";
import { countriesAdminService } from "@/modules/admin/api";
import "./CountriesPage.css";













function CountriesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const query = useMemo(
    () => ({
      page,
      pageSize
    }),
    [page, pageSize]
  );

  const fields = [
  {
    name: "name",
    label: t("admin.places.name"),
    type: "text",
    required: true
  },
  {
    name: "nativeName",
    label: t("admin.countries.nativeName"),
    type: "text",
    required: false
  },
  {
    name: "alpha2Code",
    label: t("admin.countries.alpha2"),
    type: "text",
    required: true
  },
  {
    name: "alpha3Code",
    label: t("admin.countries.alpha3"),
    type: "text",
    required: true
  },
  {
    name: "numericCode",
    label: t("admin.countries.numeric"),
    type: "text",
    required: false
  },
  {
    name: "region",
    label: t("destinations.labels.region"),
    type: "text",
    required: false
  },
  {
    name: "capital",
    label: t("destinations.labels.capital"),
    type: "text",
    required: false
  }];


  const columns = [
  { title: t("admin.places.name"), dataIndex: "name", key: "name" },
  {
    title: t("admin.countries.alpha2"),
    dataIndex: "alpha2Code",
    key: "alpha2Code"
  },
  {
    title: t("admin.countries.alpha3"),
    dataIndex: "alpha3Code",
    key: "alpha3Code"
  },
  {
    title: t("destinations.labels.region"),
    dataIndex: "region",
    key: "region"
  },
  {
    title: t("destinations.labels.capital"),
    dataIndex: "capital",
    key: "capital"
  },
  {
    title: t("admin.users.createdAt"),
    dataIndex: "createdAt",
    key: "createdAt",
    render: (date) => new Date(date).toLocaleDateString()
  }];


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
    total
  } = useCrudPage({
    service: countriesAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.countries.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.countries.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.countries.title").toLowerCase()}`,
      createdSuccess: `${t("admin.countries.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.countries.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.countries.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`
    }
  });

  return (
    <div className="countries-page">
      <div className="countries-page-header">
        <h1>{t("admin.countries.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("admin.countries.addCountry")}
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
        }} />
      

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
        selectedRecord ?
        t("admin.countries.editCountry") :
        t("admin.countries.addCountry")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting} />
      

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.countries.deleteCountry")}
        content={`${t("admin.countries.deleteConfirm")} ${selectedRecord?.name ?? ""}?`}
        loading={submitting} />
      
    </div>);

}

export default CountriesPage;