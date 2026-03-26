import { Button, Form } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import AdminFormModal from "../../components/AdminFormModal";

import AdminTable from "../../components/AdminTable/AdminTable";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { usePlaceOptions } from "../../hooks/usePlaceOptions";
import { useCrudPage } from "../../hooks/useCrudPage";
import { extractAdminCollection } from "../../utils/adminCollection";
import { placePricingAdminService } from "@/modules/admin/api";
import "./PlacePricingPage.css";













function PlacePricingPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { places } = usePlaceOptions(
    `${t("admin.common.failedToLoad")} ${t("admin.places.title").toLowerCase()}`
  );

  const fields = [
  {
    name: "place",
    label: t("admin.places.title"),
    type: "select",
    required: true,
    options: places.map((place) => ({ label: place.name, value: place.id }))
  },
  { name: "basePrice", label: "Base Price", type: "number", required: true },
  {
    name: "currencyCode",
    label: "Currency Code",
    type: "text",
    required: true
  },
  {
    name: "perPerson",
    label: "Per Person",
    type: "select",
    required: true,
    options: [
    { label: t("admin.common.yes"), value: true },
    { label: t("admin.common.no"), value: false }]

  },
  { name: "maxPeople", label: "Max People", type: "number", required: false },
  { name: "validFrom", label: "Valid From", type: "date", required: false },
  { name: "validTo", label: "Valid To", type: "date", required: false }];


  const columns = [
  {
    title: t("admin.places.title"),
    dataIndex: ["place", "name"],
    key: "place",
    render: (placeName) => placeName ?? "-"
  },
  {
    title: "Base Price",
    dataIndex: "basePrice",
    key: "basePrice",
    render: (price, record) =>
    `${price} ${record.currencyCode}`
  },
  {
    title: "Per Person",
    dataIndex: "perPerson",
    key: "perPerson",
    render: (perPerson) =>
    perPerson ? t("admin.common.yes") : t("admin.common.no")
  },
  {
    title: "Max People",
    dataIndex: "maxPeople",
    key: "maxPeople"
  },
  {
    title: "Valid From",
    dataIndex: "validFrom",
    key: "validFrom",
    render: (date) => date ? new Date(date).toLocaleDateString() : "-"
  },
  {
    title: "Valid To",
    dataIndex: "validTo",
    key: "validTo",
    render: (date) => date ? new Date(date).toLocaleDateString() : "-"
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
    service: placePricingAdminService,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.placePricing.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.placePricing.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.placePricing.title").toLowerCase()}`,
      createdSuccess: `${t("admin.placePricing.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.placePricing.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.placePricing.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`
    }
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
        onDelete={openDelete} />
      

      <AdminFormModal
        open={isFormOpen}
        onCancel={() => {
          closeForm();
          form.resetFields();
        }}
        onSubmit={submit}
        title={
        selectedRecord ?
        t("admin.placePricing.editPlacePricing") :
        t("admin.placePricing.addPlacePricing")
        }
        initialValues={
        selectedRecord ?
        {
          ...selectedRecord,
          place: selectedRecord.place?.id ?? null
        } :
        undefined
        }
        fields={fields}
        loading={submitting}
        form={form} />
      

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.placePricing.deletePlacePricing")}
        content={t("admin.placePricing.deleteConfirm")}
        loading={submitting} />
      
    </div>);

}

export default PlacePricingPage;