import { useMemo, useState } from "react";
import { Form } from "antd";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { usePlaceOptions } from "@/hooks/admin/usePlaceOptions";
import { useUserOptions } from "@/hooks/admin/useUserOptions";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { reviewsAdminService } from "@/api/admin";
import "./ReviewsPage.css";

function ReviewsPage() {
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
  const { users } = useUserOptions(
    `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.users.title", "Users").toLowerCase()}`,
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
      name: "user",
      label: t("admin.users.title", "User"),
      type: "select",
      required: true,
      options: users.map((user) => ({
        label: user.email || user.username || user.id,
        value: user.id,
      })),
    },
    {
      name: "rating",
      label: t("admin.places.ratingAverage", "Rating"),
      type: "number",
      required: true,
      min: 1,
      max: 5,
    },
    {
      name: "comment",
      label: t("admin.reviews.comment", "Comment"),
      type: "textarea",
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
      title: t("admin.users.title", "User"),
      dataIndex: ["user", "email"],
      key: "user",
      render: (_email, record) =>
        record.user?.email ?? record.user?.username ?? "-",
    },
    {
      title: t("admin.places.ratingAverage", "Rating"),
      dataIndex: "rating",
      key: "rating",
      render: (rating) => `${rating}/5`,
    },
    {
      title: t("admin.reviews.comment", "Comment"),
      dataIndex: "comment",
      key: "comment",
      ellipsis: true,
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
    service: reviewsAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.reviews.title", "Reviews").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.reviews.title", "Reviews").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.reviews.title", "Reviews").toLowerCase()}`,
      createdSuccess: `${t("admin.reviews.title", "Reviews").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.reviews.title", "Reviews").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.reviews.title", "Reviews").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.reviews.title", "Reviews")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.reviews.subtitle", { defaultValue: "Manage reviews" })}
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
        addLabel={t("admin.reviews.addReview", "Add Review")}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search reviews...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.reviews.title", "Reviews")}
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
            ? t("admin.reviews.editReview", "Edit Review")
            : t("admin.reviews.addReview", "Add Review")
        }
        initialValues={
          selectedRecord
            ? {
                ...selectedRecord,
                place: selectedRecord.place?.id ?? null,
                user: selectedRecord.user?.id ?? null,
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
        title={t("admin.reviews.deleteReview", "Delete Review")}
        content={t("admin.reviews.deleteConfirm", "Delete")}
        loading={submitting}
      />
    </div>
  );
}

export default ReviewsPage;
