import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { ColumnsType } from "antd/es/table";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import AdminTable from "../../components/AdminTable/AdminTable";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { useCrudPage } from "../../hooks/useCrudPage";
import { extractAdminCollection } from "../../utils/adminCollection";
import { placePricingAdminService } from "@/services/admin/admin.service";
import "./PlacePricingPage.css";

interface PlacePricing {
  id: string;
  basePrice: number;
  currencyCode: string;
  perPerson: boolean;
  maxPeople?: number;
  validFrom?: string;
  validTo?: string;
  createdAt: string;
}

function PlacePricingPage() {
  const { t } = useTranslation();

  const fields: FormField[] = [
    { name: "basePrice", label: "Base Price", type: "number", required: true },
    {
      name: "currencyCode",
      label: "Currency Code",
      type: "text",
      required: true,
    },
    {
      name: "perPerson",
      label: "Per Person",
      type: "select",
      required: true,
      options: [
        { label: t("admin.common.yes"), value: true },
        { label: t("admin.common.no"), value: false },
      ],
    },
    { name: "maxPeople", label: "Max People", type: "number", required: false },
    { name: "validFrom", label: "Valid From", type: "date", required: false },
    { name: "validTo", label: "Valid To", type: "date", required: false },
  ];

  const columns: ColumnsType<PlacePricing> = [
    {
      title: "Base Price",
      dataIndex: "basePrice",
      key: "basePrice",
      render: (price: number, record: PlacePricing) =>
        `${price} ${record.currencyCode}`,
    },
    {
      title: "Per Person",
      dataIndex: "perPerson",
      key: "perPerson",
      render: (perPerson: boolean) =>
        perPerson ? t("admin.common.yes") : t("admin.common.no"),
    },
    {
      title: "Max People",
      dataIndex: "maxPeople",
      key: "maxPeople",
    },
    {
      title: "Valid From",
      dataIndex: "validFrom",
      key: "validFrom",
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : "-"),
    },
    {
      title: "Valid To",
      dataIndex: "validTo",
      key: "validTo",
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : "-"),
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
    openCreate,
    openDelete,
    openEdit,
    records,
    selectedRecord,
    submit,
    submitting,
  } = useCrudPage<PlacePricing, Record<string, unknown>>({
    service: placePricingAdminService,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.placePricing.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.placePricing.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.placePricing.title").toLowerCase()}`,
      createdSuccess: `${t("admin.placePricing.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.placePricing.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.placePricing.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  return (
    <div className="place-pricing-page">
      <div className="place-pricing-page-header">
        <h1>{t("admin.placePricing.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("admin.placePricing.addPlacePricing")}
        </Button>
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
        title={
          selectedRecord
            ? t("admin.placePricing.editPlacePricing")
            : t("admin.placePricing.addPlacePricing")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.placePricing.deletePlacePricing")}
        content={t("admin.placePricing.deleteConfirm")}
        loading={submitting}
      />
    </div>
  );
}

export default PlacePricingPage;
