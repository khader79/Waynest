import { useMemo, useState } from "react";
import { Form } from "antd";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCityOptions } from "@/hooks/admin/useCityOptions";
import { useProviderOptions } from "@/hooks/admin/useProviderOptions";
import { useTagOptions } from "@/hooks/admin/useTagOptions";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { placesAdminService } from "@/api/admin";
import "./PlacesPage.css";

function PlacesPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const query = useMemo(
    () => ({ page, pageSize, search: searchQuery || undefined }),
    [page, pageSize, searchQuery],
  );
  const { cities } = useCityOptions(
    `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.cities.title", "Cities").toLowerCase()}`,
  );
  const { providers } = useProviderOptions(
    `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.providers.title", "Providers").toLowerCase()}`,
  );
  const { tags } = useTagOptions(
    `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.tags.title", "Tags").toLowerCase()}`,
  );

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
    service: placesAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.places.title", "Places").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.places.title", "Places").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.places.title", "Places").toLowerCase()}`,
      createdSuccess: `${t("admin.places.title", "Places").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.places.title", "Places").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.places.title", "Places").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: t("admin.places.name", "Name"),
        type: "text",
        required: true,
      },
      {
        name: "slug",
        label: t("admin.places.slug", "Slug"),
        type: "text",
        required: true,
      },
      {
        name: "description",
        label: t("admin.places.description", "Description"),
        type: "textarea",
        required: true,
      },
      {
        name: "type",
        label: t("admin.places.type", "Type"),
        type: "select",
        required: true,
        options: [
          {
            label: t("admin.places.typeOptions.hotel", "Hotel"),
            value: "HOTEL",
          },
          {
            label: t("admin.places.typeOptions.restaurant", "Restaurant"),
            value: "RESTAURANT",
          },
          {
            label: t("admin.places.typeOptions.activity", "Activity"),
            value: "ACTIVITY",
          },
          { label: t("admin.places.typeOptions.tour", "Tour"), value: "TOUR" },
          {
            label: t("admin.places.typeOptions.landmark", "Landmark"),
            value: "LANDMARK",
          },
          { label: t("admin.places.typeOptions.cafe", "Cafe"), value: "CAFE" },
          { label: t("admin.places.typeOptions.park", "Park"), value: "PARK" },
          { label: t("admin.places.typeOptions.shop", "Shop"), value: "SHOP" },
        ],
      },
      (() => {
        const cityOpts = cities.map((city) => ({
          label: city.name,
          value: city.id,
        }));
        if (
          selectedRecord?.city?.id &&
          !cityOpts.some((o) => o.value === selectedRecord.city.id)
        ) {
          cityOpts.unshift({
            label: selectedRecord.city.name || selectedRecord.city.id,
            value: selectedRecord.city.id,
          });
        }
        return {
          name: "city",
          label: t("admin.places.city", "City"),
          type: "select",
          required: true,
          options: cityOpts,
        };
      })(),
      (() => {
        const provOpts = providers.map((provider) => ({
          label: provider.displayName,
          value: provider.id,
        }));
        if (
          selectedRecord?.provider?.id &&
          !provOpts.some((o) => o.value === selectedRecord.provider.id)
        ) {
          provOpts.unshift({
            label:
              selectedRecord.provider.displayName || selectedRecord.provider.id,
            value: selectedRecord.provider.id,
          });
        }
        return {
          name: "provider",
          label: t("admin.providers.title", "Provider"),
          type: "select",
          required: true,
          options: provOpts,
        };
      })(),
      {
        name: "tags",
        label: t("admin.tags.title", "Tags"),
        type: "select",
        required: false,
        multiple: true,
        options: tags.map((tag) => ({ label: tag.name, value: tag.id })),
      },
      {
        name: "latitude",
        label: t("admin.places.latitude", "Latitude"),
        type: "number",
        required: true,
      },
      {
        name: "longitude",
        label: t("admin.places.longitude", "Longitude"),
        type: "number",
        required: true,
      },
    ],

    [cities, providers, tags, t, selectedRecord],
  );

  const columns = [
    { title: t("admin.places.name", "Name"), dataIndex: "name", key: "name" },
    { title: t("admin.places.slug", "Slug"), dataIndex: "slug", key: "slug" },
    { title: t("admin.places.type", "Type"), dataIndex: "type", key: "type" },
    {
      title: t("admin.places.ratingAverage", "Rating"),
      dataIndex: "ratingAverage",
      key: "ratingAverage",
    },
    {
      title: t("admin.places.isActive", "Active"),
      dataIndex: "isActive",
      key: "isActive",
      render: (active) =>
        active ? t("admin.common.yes", "Yes") : t("admin.common.no", "No"),
    },
    {
      title: t("admin.places.isVerified", "Verified"),
      dataIndex: "isVerified",
      key: "isVerified",
      render: (verified) =>
        verified ? t("admin.common.yes", "Yes") : t("admin.common.no", "No"),
    },
    {
      title: t("admin.providers.title", "Provider"),
      dataIndex: ["provider", "displayName"],
      key: "provider",
      render: (providerName) => providerName ?? "-",
    },
    {
      title: t("admin.users.createdAt", "Created At"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  const handleCityChange = (value) => {
    if (typeof value !== "string") {
      return;
    }

    const cityId = value;
    const city = cities.find((entry) => entry.id === cityId);
    if (city?.latitude && city?.longitude) {
      form.setFieldsValue({
        latitude: city.latitude,
        longitude: city.longitude,
      });
    }
  };

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.places.title", "Places")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.places.subtitle", {
              defaultValue: "Manage places and venues",
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
        addLabel={t("admin.places.addPlace", "Add place")}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search places...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.places.title", "Places")}
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
            ? t("admin.places.editPlace", "Edit place")
            : t("admin.places.addPlace", "Add place")
        }
        initialValues={
          selectedRecord
            ? {
                ...selectedRecord,
                city: selectedRecord.city?.id ?? null,
                provider: selectedRecord.provider?.id ?? null,
                tags: selectedRecord.tags?.map((tag) => tag.id) ?? [],
              }
            : {}
        }
        fields={fields}
        loading={submitting}
        form={form}
        onFieldChange={{ city: handleCityChange }}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.places.deletePlace", "Delete place")}
        content={`${t("admin.places.deleteConfirm", "Are you sure you want to delete this place?")} ${selectedRecord?.name ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default PlacesPage;
