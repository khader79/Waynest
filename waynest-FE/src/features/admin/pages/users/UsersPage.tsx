import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { useTranslation } from "react-i18next";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get, postJson, patch, del } from "../../../../api/apiService";
import type { ColumnsType } from "antd/es/table";
import "./UsersPage.css";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: string;
  status: string;
  phone?: string;
  createdAt: string;
}

function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    {
      name: "firstName",
      label: t("admin.users.firstName"),
      type: "text",
      required: true,
    },
    {
      name: "lastName",
      label: t("admin.users.lastName"),
      type: "text",
      required: true,
    },
    {
      name: "email",
      label: t("admin.users.email"),
      type: "email",
      required: true,
    },
    {
      name: "username",
      label: t("admin.users.username"),
      type: "text",
      required: true,
    },
    {
      name: "password",
      label: t("admin.users.password"),
      type: "password",
      required: !selectedUser,
    },
    {
      name: "role",
      label: t("admin.users.role"),
      type: "select",
      required: true,
      options: [
        { label: "USER", value: "USER" },
        { label: "PROVIDER", value: "PROVIDER" },
        { label: "ADMIN", value: "ADMIN" },
      ],
    },
    {
      name: "phone",
      label: t("admin.users.phone"),
      type: "text",
      required: false,
    },
  ];

  const columns: ColumnsType<User> = [
    {
      title: t("admin.users.firstName"),
      dataIndex: "firstName",
      key: "firstName",
    },
    {
      title: t("admin.users.lastName"),
      dataIndex: "lastName",
      key: "lastName",
    },
    {
      title: t("admin.users.email"),
      dataIndex: "email",
      key: "email",
    },
    {
      title: t("admin.users.username"),
      dataIndex: "username",
      key: "username",
    },
    {
      title: t("admin.users.role"),
      dataIndex: "role",
      key: "role",
    },
    {
      title: t("admin.users.status"),
      dataIndex: "status",
      key: "status",
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.USERS_LIST);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(
        t("admin.common.failedToLoad") +
          " " +
          t("admin.users.title").toLowerCase(),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = () => {
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedUser) {
        await patch(ADMIN_ENDPOINTS.USERS_UPDATE(selectedUser.id), values);
        message.success(
          t("admin.users.title").split(" ")[0] +
            " " +
            t("admin.common.updatedSuccessfully"),
        );
      } else {
        await postJson(ADMIN_ENDPOINTS.USERS_CREATE, values);
        message.success(
          t("admin.users.title").split(" ")[0] +
            " " +
            t("admin.common.createdSuccessfully"),
        );
      }
      setModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          t("admin.common.failedToSave") +
            " " +
            t("admin.users.title").toLowerCase(),
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.USERS_DELETE(selectedUser.id));
      message.success(
        t("admin.users.title").split(" ")[0] +
          " " +
          t("admin.common.deletedSuccessfully"),
      );
      setDeleteModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          t("admin.common.failedToDelete") +
            " " +
            t("admin.users.title").toLowerCase(),
      );
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="users-page">
      <div className="users-page-header">
        <h1>{t("admin.users.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.users.addUser")}
        </Button>
      </div>
      <AdminTable
        data={users}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleSubmit}
        title={
          selectedUser ? t("admin.users.editUser") : t("admin.users.addUser")
        }
        initialValues={selectedUser}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("admin.users.deleteUser")}
        content={`${t("admin.users.deleteConfirm")} ${selectedUser?.email}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default UsersPage;
