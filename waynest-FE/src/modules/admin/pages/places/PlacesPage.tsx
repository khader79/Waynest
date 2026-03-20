import { useMemo } from "react";
import { Button, Form } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { ColumnsType } from "antd/es/table";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import AdminTable from "../../components/AdminTable/AdminTable";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { useCityOptions } from "../../hooks/useCityOptions";
import { useProviderOptions } from "../../hooks/useProviderOptions";
import { useTagOptions } from "../../hooks/useTagOptions";
import { useCrudPage } from "../../hooks/useCrudPage";
import { extractAdminCollection } from "../../utils/adminCollection";
import { placesAdminService } from "@/services/admin/admin.service";
import "./PlacesPage.css";

interface Place {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  latitude: number;
  longitude: number;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  city?: { id: string; name: string; latitude?: number; longitude?: number };
  provider?: { id: string; displayName: string };
  tags?: Array<{ id: string; name: string }>;
}

function PlacesPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
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
  } = useCrudPage<
    Place,
    Record<string, unknown>,
    { page?: number; pageSize?: number }
  >({
    service: placesAdminService,
    mapListResponse: extractAdminCollection,
    query: { page: 1, pageSize: 100 },
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.places.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.places.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.places.title").toLowerCase()}`,
      createdSuccess: `${t("admin.places.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.places.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.places.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  const fields: FormField[] = useMemo(
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
          { label: "HOTEL", value: "HOTEL" },
          { label: "RESTAURANT", value: "RESTAURANT" },
          { label: "ACTIVITY", value: "ACTIVITY" },
          { label: "TOUR", value: "TOUR" },
          { label: "LANDMARK", value: "LANDMARK" },
          { label: "CAFE", value: "CAFE" },
          { label: "PARK", value: "PARK" },
          { label: "SHOP", value: "SHOP" },
        ],
      },
      {
        name: "city",
        label: t("admin.places.city"),
        type: "select",
        required: true,
        options: cities.map((city) => ({ label: city.name, value: city.id })),
      },
      {
        name: "provider",
        label: t("admin.providers.title"),
        type: "select",
        required: true,
        options: providers.map((provider) => ({
          label: provider.displayName,
          value: provider.id,
        })),
      },
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
    [cities, providers, tags, t],
  );

  const columns: ColumnsType<Place> = [
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
      render: (active: boolean) =>
        active ? t("admin.common.yes") : t("admin.common.no"),
    },
    {
      title: t("admin.places.isVerified"),
      dataIndex: "isVerified",
      key: "isVerified",
      render: (verified: boolean) =>
        verified ? t("admin.common.yes") : t("admin.common.no"),
    },
    {
      title: t("admin.providers.title"),
      dataIndex: ["provider", "displayName"],
      key: "provider",
      render: (providerName?: string) => providerName ?? "-",
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const handleCityChange = (value: unknown) => {
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
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={() => {
          closeForm();
          form.resetFields();
        }}
        onSubmit={submit}
        title={selectedRecord ? t("admin.places.editPlace") : t("admin.places.addPlace")}
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
