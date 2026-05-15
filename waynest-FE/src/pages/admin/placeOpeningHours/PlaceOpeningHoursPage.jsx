import { useMemo, useState } from "react";
import { Form } from "antd";
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

  const daysOfWeek = useMemo(
    () => [
      t("admin.placeOpeningHours.days.sunday", "Sunday"),
      t("admin.placeOpeningHours.days.monday", "Monday"),
      t("admin.placeOpeningHours.days.tuesday", "Tuesday"),
      t("admin.placeOpeningHours.days.wednesday", "Wednesday"),
      t("admin.placeOpeningHours.days.thursday", "Thursday"),
      t("admin.placeOpeningHours.days.friday", "Friday"),
      t("admin.placeOpeningHours.days.saturday", "Saturday"),
    ],

    [t],
  );

  const fields = useMemo(
    () => [
      {
        name: "place",
        label: t("admin.places.title", "Place"),
        type: "select",
        required: true,
        options: places.map((place) => ({
          label: place.name,
          value: place.id,
        })),
      },
      {
        name: "dayOfWeek",
        label: t("admin.placeOpeningHours.dayOfWeek", "Day"),
        type: "select",
        required: true,
        options: daysOfWeek.map((day, index) => ({
          label: day,
          value: index,
        })),
      },
      {
        name: "openTime",
        label: t("admin.placeOpeningHours.openTime", "Open"),
        type: "text",
        required: true,
        placeholder: "08:00",
      },
      {
        name: "closeTime",
        label: t("admin.placeOpeningHours.closeTime", "Close"),
        type: "text",
        required: true,
        placeholder: "17:00",
      },
    ],

    [daysOfWeek, places, t],
  );

  const columns = [
    {
      title: t("admin.places.title", "Place"),
      dataIndex: ["place", "name"],
      key: "place",
      render: (placeName) => placeName ?? "-",
    },
    {
      title: t("admin.placeOpeningHours.dayOfWeek", "Day"),
      dataIndex: "dayOfWeek",
      key: "dayOfWeek",
      render: (day) => daysOfWeek[day],
    },
    {
      title: t("admin.placeOpeningHours.openTime", "Open"),
      dataIndex: "openTime",
      key: "openTime",
    },
    {
      title: t("admin.placeOpeningHours.closeTime", "Close"),
      dataIndex: "closeTime",
      key: "closeTime",
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
    service: placeOpeningHoursAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.placeOpeningHours.title", "Opening hours").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.placeOpeningHours.title", "Opening hours").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.placeOpeningHours.title", "Opening hours").toLowerCase()}`,
      createdSuccess: `${t("admin.placeOpeningHours.title", "Opening hours").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.placeOpeningHours.title", "Opening hours").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.placeOpeningHours.title", "Opening hours").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.placeOpeningHours.title", "Opening hours")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.placeOpeningHours.subtitle", {
              defaultValue: "Manage place opening hours",
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
        addLabel={t(
          "admin.placeOpeningHours.addPlaceOpeningHours",
          "Add opening hours",
        )}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search opening hours...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.placeOpeningHours.title", "Opening hours")}
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
            ? t(
                "admin.placeOpeningHours.editPlaceOpeningHours",
                "Edit opening hours",
              )
            : t(
                "admin.placeOpeningHours.addPlaceOpeningHours",
                "Add opening hours",
              )
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
        title={t(
          "admin.placeOpeningHours.deletePlaceOpeningHours",
          "Delete opening hours",
        )}
        content={`${t("admin.placeOpeningHours.deleteConfirm", "Are you sure you want to delete these opening hours?")}?`}
        loading={submitting}
      />
    </div>
  );
}

export default PlaceOpeningHoursPage;
