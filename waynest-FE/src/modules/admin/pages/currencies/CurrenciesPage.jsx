import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import AdminFormModal from "../../components/AdminFormModal";

import AdminTable from "../../components/AdminTable/AdminTable";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { useCrudPage } from "../../hooks/useCrudPage";
import { extractAdminCollection } from "../../utils/adminCollection";
import { currenciesAdminService } from "@/modules/admin/api";
import "./CurrenciesPage.css";









function CurrenciesPage() {
  const { t } = useTranslation();

  const fields = [
  { name: "code", label: "Code", type: "text", required: true },
  {
    name: "name",
    label: t("admin.places.name"),
    type: "text",
    required: true
  },
  {
    name: "fractionSize",
    label: "Fraction Size",
    type: "number",
    required: false
  }];


  const columns = [
  {
    title: "Code",
    dataIndex: "code",
    key: "code"
  },
  {
    title: t("admin.places.name"),
    dataIndex: "name",
    key: "name"
  },
  {
    title: "Fraction Size",
    dataIndex: "fractionSize",
    key: "fractionSize"
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
    submitting
  } = useCrudPage({
    service: currenciesAdminService,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.currencies.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.currencies.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.currencies.title").toLowerCase()}`,
      createdSuccess: `${t("admin.currencies.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.currencies.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.currencies.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`
    }
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
        onDelete={openDelete} />
      

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
        selectedRecord ?
        t("admin.currencies.editCurrency") :
        t("admin.currencies.addCurrency")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting} />
      

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.currencies.deleteCurrency")}
        content={`${t("admin.currencies.deleteConfirm")} ${selectedRecord?.code ?? ""}?`}
        loading={submitting} />
      
    </div>);

}

export default CurrenciesPage;