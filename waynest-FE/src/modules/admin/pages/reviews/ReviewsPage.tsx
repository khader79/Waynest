import { Button, Form } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { ColumnsType } from "antd/es/table";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import AdminTable from "../../components/AdminTable/AdminTable";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { usePlaceOptions } from "../../hooks/usePlaceOptions";
import { useUserOptions } from "../../hooks/useUserOptions";
import { useCrudPage } from "../../hooks/useCrudPage";
import { extractAdminCollection } from "../../utils/adminCollection";
import { reviewsAdminService } from "@/services/admin/admin.service";
import "./ReviewsPage.css";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  place?: { id: string; name: string };
  user?: { id: string; email?: string; username?: string };
}

function ReviewsPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { places } = usePlaceOptions(
    `${t("admin.common.failedToLoad")} ${t("admin.places.title").toLowerCase()}`,
  );
  const { users } = useUserOptions(
    `${t("admin.common.failedToLoad")} ${t("admin.users.title").toLowerCase()}`,
  );

  const fields: FormField[] = [
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

  const columns: ColumnsType<Review> = [
    {
      title: t("admin.places.title"),
      dataIndex: ["place", "name"],
      key: "place",
      render: (placeName?: string) => placeName ?? "-",
    },
    {
      title: t("admin.users.title"),
      dataIndex: ["user", "email"],
      key: "user",
      render: (_email: string | undefined, record: Review) =>
        record.user?.email ?? record.user?.username ?? "-",
    },
    {
      title: t("admin.places.ratingAverage"),
      dataIndex: "rating",
      key: "rating",
      render: (rating: number) => `${rating}/5`,
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
  } = useCrudPage<Review, Record<string, unknown>>({
    service: reviewsAdminService,
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
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={() => {
          closeForm();
          form.resetFields();
        }}
        onSubmit={submit}
        title={
          selectedRecord ? t("admin.reviews.editReview") : t("admin.reviews.addReview")
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
