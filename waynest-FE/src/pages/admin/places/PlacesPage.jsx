import { useMemo, useState } from "react";
import { Button, Form } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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

  const query = useMemo(
    () => ({ page, pageSize }),
    [page, pageSize],
  );
  const { cities } = useCityOptions(
    `${t("admin.common.failedToLoad")} ${t("admin.cities.title").toLowerCase()}`,
  );
  const { providers } = useProviderOptions(
    `${t("admin.common.failedToLoad")} ${t("admin.providers.title").toLowerCase()}`,
  );
  const { tags } = useTagOptions(
    `${t("admin.common.failedToLoad")} ${t("admin.tags.title").toLowerCase()}`,
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
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.places.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.places.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.places.title").toLowerCase()}`,
      createdSuccess: `${t("admin.places.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.places.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.places.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: t("admin.places.name"),
        type: "text",
        required: true,
      },
      {
        name: "slug",
        label: t("admin.places.slug"),
        type: "text",
        required: true,
      },
      {
        name: "description",
        label: t("admin.places.description"),
        type: "textarea",
        required: true,
      },
      {
        name: "type",
        label: t("admin.places.type"),
        type: "select",
        required: true,
        options: [
          { label: t("admin.places.typeOptions.hotel"), value: "HOTEL" },
          { label: t("admin.places.typeOptions.restaurant"), value: "RESTAURANT" },
          { label: t("admin.places.typeOptions.activity"), value: "ACTIVITY" },
          { label: t("admin.places.typeOptions.tour"), value: "TOUR" },
          { label: t("admin.places.typeOptions.landmark"), value: "LANDMARK" },
          { label: t("admin.places.typeOptions.cafe"), value: "CAFE" },
          { label: t("admin.places.typeOptions.park"), value: "PARK" },
          { label: t("admin.places.typeOptions.shop"), value: "SHOP" },
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
          label: t("admin.places.city"),
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
          label: t("admin.providers.title"),
          type: "select",
          required: true,
          options: provOpts,
        };
      })(),
      {
        name: "tags",
        label: t("admin.tags.title"),
        type: "select",
        required: false,
        multiple: true,
        options: tags.map((tag) => ({ label: tag.name, value: tag.id })),
      },
      {
        name: "latitude",
        label: t("admin.places.latitude"),
        type: "number",
        required: true,
      },
      {
        name: "longitude",
        label: t("admin.places.longitude"),
        type: "number",
        required: true,
      },
    ],

    [cities, providers, tags, t, selectedRecord],
  );

  const columns = [
    { title: t("admin.places.name"), dataIndex: "name", key: "name" },
    { title: t("admin.places.slug"), dataIndex: "slug", key: "slug" },
    { title: t("admin.places.type"), dataIndex: "type", key: "type" },
    {
      title: t("admin.places.ratingAverage"),
      dataIndex: "ratingAverage",
      key: "ratingAverage",
    },
    {
      title: t("admin.places.isActive"),
      dataIndex: "isActive",
      key: "isActive",
      render: (active) =>
        active ? t("admin.common.yes") : t("admin.common.no"),
    },
    {
      title: t("admin.places.isVerified"),
      dataIndex: "isVerified",
      key: "isVerified",
      render: (verified) =>
        verified ? t("admin.common.yes") : t("admin.common.no"),
    },
    {
      title: t("admin.providers.title"),
      dataIndex: ["provider", "displayName"],
      key: "provider",
      render: (providerName) => providerName ?? "-",
    },
    {
      title: t("admin.users.createdAt"),
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
    <div className="places-page">
      <header className="places-page-header">
        <h1>{t("admin.places.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("admin.places.addPlace")}
        </Button>
      </header>

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
        onCancel={() => {
          closeForm();
          form.resetFields();
        }}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.places.editPlace")
            : t("admin.places.addPlace")
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
        title={t("admin.places.deletePlace")}
        content={`${t("admin.places.deleteConfirm")} ${selectedRecord?.name ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default PlacesPage;
