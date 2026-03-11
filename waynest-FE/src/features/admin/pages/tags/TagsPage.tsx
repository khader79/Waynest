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
import "./TagsPage.css";

interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

function TagsPage() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "name", label: t("admin.places.name"), type: "text", required: true },
  ];

  const columns: ColumnsType<Tag> = [
    {
      title: t("admin.places.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchTags = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.TAGS_LIST);
      setTags(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(t("admin.common.failedToLoad") + " " + t("admin.tags.title").toLowerCase());
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
        await patch(ADMIN_ENDPOINTS.TAGS_UPDATE(selectedTag.id), values);
        message.success(t("admin.tags.title").split(" ")[0] + " " + t("admin.common.updatedSuccessfully"));
      } else {
        await postJson(ADMIN_ENDPOINTS.TAGS_CREATE, values);
        message.success(t("admin.tags.title").split(" ")[0] + " " + t("admin.common.createdSuccessfully"));
      }
      setModalOpen(false);
      setSelectedTag(null);
      fetchTags();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToSave") + " " + t("admin.tags.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTag) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.TAGS_DELETE(selectedTag.id));
      message.success(t("admin.tags.title").split(" ")[0] + " " + t("admin.common.deletedSuccessfully"));
      setDeleteModalOpen(false);
      setSelectedTag(null);
      fetchTags();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToDelete") + " " + t("admin.tags.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="tags-page">
      <div className="tags-page-header">
        <h1>{t("admin.tags.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.tags.addTag")}
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
        title={selectedTag ? t("admin.tags.editTag") : t("admin.tags.addTag")}
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
        title={t("admin.tags.deleteTag")}
        content={`${t("admin.tags.deleteConfirm")} ${selectedTag?.name}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default TagsPage;
