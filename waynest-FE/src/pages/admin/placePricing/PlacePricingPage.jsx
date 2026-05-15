import { useMemo, useState } from "react";
import { Form } from "antd";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { usePlaceOptions } from "@/hooks/admin/usePlaceOptions";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { placePricingAdminService } from "@/api/admin";
import "./PlacePricingPage.css";

function PlacePricingPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const query = useMemo(
    () => ({ page, pageSize, search: searchQuery || undefined }),
    [page, pageSize, searchQuery],
  );
  const { places } = usePlaceOptions(
    `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.places.title", "Places").toLowerCase()}`,
  );

  const fields = [
    {
      name: "place",
      label: t("admin.places.title", "Place"),
      type: "select",
      required: true,
      options: places.map((place) => ({ label: place.name, value: place.id })),
    },
    {
      name: "basePrice",
      label: t("admin.placePricing.basePrice", "Base price"),
      type: "number",
      required: true,
    },
    {
      name: "currencyCode",
      label: t("admin.placePricing.currencyCode", "Currency"),
      type: "text",
      required: true,
    },
    {
      name: "perPerson",
      label: t("admin.placePricing.perPerson", "Per person"),
      type: "select",
      required: true,
      options: [
        { label: t("admin.common.yes", "Yes"), value: true },
        { label: t("admin.common.no", "No"), value: false },
      ],
    },
    {
      name: "maxPeople",
      label: t("admin.placePricing.maxPeople", "Max people"),
      type: "number",
      required: false,
    },
    {
      name: "validFrom",
      label: t("admin.placePricing.validFrom", "Valid from"),
      type: "date",
      required: false,
    },
    {
      name: "validTo",
      label: t("admin.placePricing.validTo", "Valid to"),
      type: "date",
      required: false,
    },
  ];

  const columns = [
    {
      title: t("admin.places.title", "Place"),
      dataIndex: ["place", "name"],
      key: "place",
      render: (placeName) => placeName ?? "-",
    },
    {
      title: t("admin.placePricing.basePrice", "Base price"),
      dataIndex: "basePrice",
      key: "basePrice",
      render: (price, record) => `${price} ${record.currencyCode}`,
    },
    {
      title: t("admin.placePricing.perPerson", "Per person"),
      dataIndex: "perPerson",
      key: "perPerson",
      render: (perPerson) =>
        perPerson ? t("admin.common.yes", "Yes") : t("admin.common.no", "No"),
    },
    {
      title: t("admin.placePricing.maxPeople", "Max people"),
      dataIndex: "maxPeople",
      key: "maxPeople",
    },
    {
      title: t("admin.placePricing.validFrom", "Valid from"),
      dataIndex: "validFrom",
      key: "validFrom",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "-"),
    },
    {
      title: t("admin.placePricing.validTo", "Valid to"),
      dataIndex: "validTo",
      key: "validTo",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "-"),
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
    service: placePricingAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.placePricing.title", "Place pricing").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.placePricing.title", "Place pricing").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.placePricing.title", "Place pricing").toLowerCase()}`,
      createdSuccess: `${t("admin.placePricing.title", "Place pricing").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.placePricing.title", "Place pricing").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.placePricing.title", "Place pricing").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.placePricing.title", "Place pricing")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.placePricing.subtitle", {
              defaultValue: "Manage place pricing",
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
        addLabel={t("admin.placePricing.addPlacePricing", "Add pricing")}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search pricing...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.placePricing.title", "Place pricing")}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={() => {
          closeForm();
          form.resetFields();
        }}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.placePricing.editPlacePricing", "Edit pricing")
            : t("admin.placePricing.addPlacePricing", "Add pricing")
        }
        initialValues={
          selectedRecord
            ? {
                ...selectedRecord,
                place: selectedRecord.place?.id ?? null,
              }
            : undefined
        }
        fields={fields}
        loading={submitting}
        form={form}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.placePricing.deletePlacePricing", "Delete pricing")}
        content={t(
          "admin.placePricing.deleteConfirm",
          "Are you sure you want to delete this pricing?",
        )}
        loading={submitting}
      />
    </div>
  );
}

export default PlacePricingPage;
