import { useMemo, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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

  const query = useMemo(
    () => ({ page, pageSize }),
    [page, pageSize],
  );

  const fields = [
    { name: "code", label: t("admin.currencies.code"), type: "text", required: true },
    {
      name: "name",
      label: t("admin.places.name"),
      type: "text",
      required: true,
    },
    {
      name: "fractionSize",
      label: t("admin.currencies.fractionSize"),
      type: "number",
      required: false,
    },
  ];

  const columns = [
    {
      title: t("admin.currencies.code"),
      dataIndex: "code",
      key: "code",
    },
    {
      title: t("admin.places.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("admin.currencies.fractionSize"),
      dataIndex: "fractionSize",
      key: "fractionSize",
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
    service: currenciesAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.currencies.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.currencies.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.currencies.title").toLowerCase()}`,
      createdSuccess: `${t("admin.currencies.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.currencies.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.currencies.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  return (
    <div className="currencies-page">
      <div className="currencies-page-header">
        <h1>{t("admin.currencies.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("admin.currencies.addCurrency")}
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
            ? t("admin.currencies.editCurrency")
            : t("admin.currencies.addCurrency")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.currencies.deleteCurrency")}
        content={`${t("admin.currencies.deleteConfirm")} ${selectedRecord?.code ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default CurrenciesPage;
