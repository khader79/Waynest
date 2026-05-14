import { useMemo, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";

import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { usersAdminService } from "@/api/admin";
import "./UsersPage.css";

function UsersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const query = useMemo(
    () => ({ page, pageSize }),
    [page, pageSize],
  );

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
    service: usersAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad")} ${t("admin.users.title").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave")} ${t("admin.users.title").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete")} ${t("admin.users.title").toLowerCase()}`,
      createdSuccess: `${t("admin.users.title").split(" ")[0]} ${t("admin.common.createdSuccessfully")}`,
      updatedSuccess: `${t("admin.users.title").split(" ")[0]} ${t("admin.common.updatedSuccessfully")}`,
      deletedSuccess: `${t("admin.users.title").split(" ")[0]} ${t("admin.common.deletedSuccessfully")}`,
    },
  });

  const fields = [
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
      required: !selectedRecord,
    },
    {
      name: "role",
      label: t("admin.users.role"),
      type: "select",
      required: true,
      options: [
        { label: t("admin.users.roleOptions.user"), value: "USER" },
        { label: t("admin.users.roleOptions.provider"), value: "PROVIDER" },
        { label: t("admin.users.roleOptions.admin"), value: "ADMIN" },
      ],
    },
    {
      name: "phone",
      label: t("admin.users.phone"),
      type: "text",
      required: false,
    },
  ];

  const columns = [
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
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div className="users-page">
      <div className="users-page-header">
        <h1>{t("admin.users.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("admin.users.addUser")}
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
        onCancel={closeForm}
        onSubmit={submit}
        title={
          selectedRecord ? t("admin.users.editUser") : t("admin.users.addUser")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.users.deleteUser")}
        content={`${t("admin.users.deleteConfirm")} ${selectedRecord?.email ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default UsersPage;
