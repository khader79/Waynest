import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
import type { ColumnsType } from "antd/es/table";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    {
      name: "rating",
      label: "Rating",
      type: "number",
      required: true,
      min: 1,
      max: 5,
    },
    { name: "comment", label: "Comment", type: "textarea", required: false },
  ];

  const columns: ColumnsType<Review> = [
    {
      title: "Rating",
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
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await adminService.fetchList("reviews");
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load reviews");
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
        await adminService.updateItem("reviews", selectedReview.id, values);
        message.success("Review updated successfully");
      } else {
        await adminService.createItem("reviews", values);
        message.success("Review created successfully");
      }
      setModalOpen(false);
      setSelectedReview(null);
      fetchReviews();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save review");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReview) return;
    try {
      setFormLoading(true);
      await adminService.deleteItem("reviews", selectedReview.id);
      message.success("Review deleted successfully");
      setDeleteModalOpen(false);
      setSelectedReview(null);
      fetchReviews();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete review");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Reviews Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Review
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
        title={selectedReview ? "Edit Review" : "Add Review"}
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
        title="Delete Review"
        content={`Are you sure you want to delete this review?`}
        loading={formLoading}
      />
    </div>
  );
}

export default ReviewsPage;
