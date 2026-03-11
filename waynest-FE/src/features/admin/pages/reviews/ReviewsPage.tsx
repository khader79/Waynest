import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { useTranslation } from "react-i18next";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get, postJson, patch, del } from "../../../../api/apiService";
import type { ColumnsType } from "antd/es/table";
import "./ReviewsPage.css";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

function ReviewsPage() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
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

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.REVIEWS_LIST);
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(t("admin.common.failedToLoad") + " " + t("admin.reviews.title").toLowerCase());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleAdd = () => {
    setSelectedReview(null);
    setModalOpen(true);
  };

  const handleEdit = (review: Review) => {
    setSelectedReview(review);
    setModalOpen(true);
  };

  const handleDelete = (review: Review) => {
    setSelectedReview(review);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedReview) {
        await patch(ADMIN_ENDPOINTS.REVIEWS_UPDATE(selectedReview.id), values);
        message.success(t("admin.reviews.title").split(" ")[0] + " " + t("admin.common.updatedSuccessfully"));
      } else {
        await postJson(ADMIN_ENDPOINTS.REVIEWS_CREATE, values);
        message.success(t("admin.reviews.title").split(" ")[0] + " " + t("admin.common.createdSuccessfully"));
      }
      setModalOpen(false);
      setSelectedReview(null);
      fetchReviews();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToSave") + " " + t("admin.reviews.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReview) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.REVIEWS_DELETE(selectedReview.id));
      message.success(t("admin.reviews.title").split(" ")[0] + " " + t("admin.common.deletedSuccessfully"));
      setDeleteModalOpen(false);
      setSelectedReview(null);
      fetchReviews();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToDelete") + " " + t("admin.reviews.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="reviews-page">
      <div className="reviews-page-header">
        <h1>{t("admin.reviews.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.reviews.addReview")}
        </Button>
      </div>
      <AdminTable
        data={reviews}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedReview(null);
        }}
        onSubmit={handleSubmit}
        title={selectedReview ? t("admin.reviews.editReview") : t("admin.reviews.addReview")}
        initialValues={selectedReview}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedReview(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("admin.reviews.deleteReview")}
        content={t("admin.reviews.deleteConfirm")}
        loading={formLoading}
      />
    </div>
  );
}

export default ReviewsPage;
