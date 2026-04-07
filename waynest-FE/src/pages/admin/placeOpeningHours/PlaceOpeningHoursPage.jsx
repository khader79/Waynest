import { useMemo } from "react";
import { Button, Form } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";

import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { usePlaceOptions } from "@/hooks/admin/usePlaceOptions";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { placeOpeningHoursAdminService } from "@/api/admin";
import "./PlaceOpeningHoursPage.css";

function PlaceOpeningHoursPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { places } = usePlaceOptions(
    `${t("admin.common.failedToLoad")} ${t("admin.places.title").toLowerCase()}`,
  );

  const daysOfWeek = useMemo(
    () => [
      t("admin.placeOpeningHours.days.sunday"),
      t("admin.placeOpeningHours.days.monday"),
      t("admin.placeOpeningHours.days.tuesday"),
      t("admin.placeOpeningHours.days.wednesday"),
      t("admin.placeOpeningHours.days.thursday"),
      t("admin.placeOpeningHours.days.friday"),
      t("admin.placeOpeningHours.days.saturday"),
    ],

    [t],
  );

  const fields = useMemo(
    () => [
      {
        name: "place",
        label: t("admin.places.title"),
        type: "select",
        required: true,
        options: places.map((place) => ({
          label: place.name,
          value: place.id,
        })),
      },
      {
        name: "dayOfWeek",
        label: t("admin.placeOpeningHours.dayOfWeek"),
        type: "select",
        required: true,
        options: daysOfWeek.map((day, index) => ({
          label: day,
          value: index,
        })),
      },
      {
        name: "openTime",
        label: t("admin.placeOpeningHours.openTime"),
        type: "text",
        required: true,
        placeholder: "08:00",
      },
      {
        name: "closeTime",
        label: t("admin.placeOpeningHours.closeTime"),
        type: "text",
        required: true,
        placeholder: "17:00",
      },
    ],

    [daysOfWeek, places, t],
  );

  const columns = [
    {
      title: t("admin.places.title"),
      dataIndex: ["place", "name"],
      key: "place",
      render: (placeName) => placeName ?? "-",
    },
    {
      title: t("admin.placeOpeningHours.dayOfWeek"),
      dataIndex: "dayOfWeek",
      key: "dayOfWeek",
      render: (day) => daysOfWeek[day],
    },
    {
      title: t("admin.placeOpeningHours.openTime"),
      dataIndex: "openTime",
      key: "openTime",
    },
    {
      title: t("admin.placeOpeningHours.closeTime"),
      dataIndex: "closeTime",
      key: "closeTime",
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
  } = useCrudPage({
    service: placeOpeningHoursAdminService,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.placeOpeningHours.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.placeOpeningHours.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.placeOpeningHours.title").toLowerCase()}`,
      createdSuccess: `${t("admin.placeOpeningHours.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.placeOpeningHours.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.placeOpeningHours.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  return (
    <div className="place-opening-hours-page">
      <div className="place-opening-hours-page-header">
        <h1>{t("admin.placeOpeningHours.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("admin.placeOpeningHours.addPlaceOpeningHours")}
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
        onCancel={() => {
          closeForm();
          form.resetFields();
        }}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.placeOpeningHours.editPlaceOpeningHours")
            : t("admin.placeOpeningHours.addPlaceOpeningHours")
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
        title={t("admin.placeOpeningHours.deletePlaceOpeningHours")}
        content={`${t("admin.placeOpeningHours.deleteConfirm")}?`}
        loading={submitting}
      />
    </div>
  );
}

export default PlaceOpeningHoursPage;
