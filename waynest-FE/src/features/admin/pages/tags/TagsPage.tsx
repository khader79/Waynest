import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
import type { ColumnsType } from "antd/es/table";

interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "name", label: "Name", type: "text", required: true },
  ];

  const columns: ColumnsType<Tag> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchTags = async () => {
    try {
      setLoading(true);
      const data = await adminService.fetchList("tags");
      setTags(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load tags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleAdd = () => {
    setSelectedTag(null);
    setModalOpen(true);
  };

  const handleEdit = (tag: Tag) => {
    setSelectedTag(tag);
    setModalOpen(true);
  };

  const handleDelete = (tag: Tag) => {
    setSelectedTag(tag);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedTag) {
        await adminService.updateItem("tags", selectedTag.id, values);
        message.success("Tag updated successfully");
      } else {
        await adminService.createItem("tags", values);
        message.success("Tag created successfully");
      }
      setModalOpen(false);
      setSelectedTag(null);
      fetchTags();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save tag");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTag) return;
    try {
      setFormLoading(true);
      await adminService.deleteItem("tags", selectedTag.id);
      message.success("Tag deleted successfully");
      setDeleteModalOpen(false);
      setSelectedTag(null);
      fetchTags();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete tag");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Tags Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Tag
        </Button>
      </div>
      <AdminTable
        data={tags}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedTag(null);
        }}
        onSubmit={handleSubmit}
        title={selectedTag ? "Edit Tag" : "Add Tag"}
        initialValues={selectedTag}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedTag(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Tag"
        content={`Are you sure you want to delete tag ${selectedTag?.name}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default TagsPage;
