import { useMemo, useState } from "react";
import { Button, Form } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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

  const query = useMemo(
    () => ({ page, pageSize }),
    [page, pageSize],
  );
  const { places } = usePlaceOptions(
    `${t("admin.common.failedToLoad")} ${t("admin.places.title").toLowerCase()}`,
  );
  const { users } = useUserOptions(
    `${t("admin.common.failedToLoad")} ${t("admin.users.title").toLowerCase()}`,
  );

  const fields = [
    {
      name: "place",
      label: t("admin.places.title"),
      type: "select",
      required: true,
      options: places.map((place) => ({ label: place.name, value: place.id })),
    },
    {
      name: "user",
      label: t("admin.users.title"),
      type: "select",
      required: true,
      options: users.map((user) => ({
        label: user.email || user.username || user.id,
        value: user.id,
      })),
    },
    {
      name: "rating",
      label: t("admin.places.ratingAverage"),
      type: "number",
      required: true,
      min: 1,
      max: 5,
    },
    { name: "comment", label: "Comment", type: "textarea", required: false },
  ];

  const columns = [
    {
      title: t("admin.places.title"),
      dataIndex: ["place", "name"],
      key: "place",
      render: (placeName) => placeName ?? "-",
    },
    {
      title: t("admin.users.title"),
      dataIndex: ["user", "email"],
      key: "user",
      render: (_email, record) =>
        record.user?.email ?? record.user?.username ?? "-",
    },
    {
      title: t("admin.places.ratingAverage"),
      dataIndex: "rating",
      key: "rating",
      render: (rating) => `${rating}/5`,
    },
    {
      title: "Comment",
      dataIndex: "comment",
      key: "comment",
      ellipsis: true,
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
    total,
  } = useCrudPage({
    service: reviewsAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.reviews.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.reviews.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.reviews.title").toLowerCase()}`,
      createdSuccess: `${t("admin.reviews.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.reviews.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.reviews.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  return (
    <div className="reviews-page">
      <div className="reviews-page-header">
        <h1>{t("admin.reviews.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("admin.reviews.addReview")}
        </Button>
      </div>

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
            ? t("admin.reviews.editReview")
            : t("admin.reviews.addReview")
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
        title={t("admin.reviews.deleteReview")}
        content={t("admin.reviews.deleteConfirm")}
        loading={submitting}
      />
    </div>
  );
}

export default ReviewsPage;
