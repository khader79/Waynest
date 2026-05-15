import { useMemo, useState } from "react";
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
  const safeT = (key, fallback) => {
    try {
      const res = t(key, fallback);
      if (typeof res === "string") {
        // i18next may return a debug string when the key points to an object
        if (res.includes("returned an object instead of string")) {
          return fallback ?? "";
        }
        return res;
      }
      return fallback ?? String(res ?? "");
    } catch {
      return fallback ?? "";
    }
  };
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const query = useMemo(
    () => ({ page, pageSize, search: searchQuery || undefined }),
    [page, pageSize, searchQuery],
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
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.users.title", "Users").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.users.title", "Users").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.users.title", "Users").toLowerCase()}`,
      createdSuccess: `${t("admin.users.title", "Users").split(" ")[0]} ${t("admin.common.createdSuccessfully", "created successfully")}`,
      updatedSuccess: `${t("admin.users.title", "Users").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.users.title", "Users").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  const fields = [
    {
      name: "firstName",
      label: t("admin.users.firstName", "First Name"),
      type: "text",
      required: true,
      placeholder: t("admin.users.firstNamePlaceholder", "Enter first name"),
    },
    {
      name: "lastName",
      label: t("admin.users.lastName", "Last Name"),
      type: "text",
      required: true,
      placeholder: t("admin.users.lastNamePlaceholder", "Enter last name"),
    },
    {
      name: "email",
      label: t("admin.users.email", "Email"),
      type: "email",
      required: true,
      placeholder: "user@example.com",
    },
    {
      name: "username",
      label: t("admin.users.username", "Username"),
      type: "text",
      required: true,
      placeholder: t("admin.users.usernamePlaceholder", "Enter username"),
    },
    {
      name: "password",
      label: t("admin.users.password", "Password"),
      type: "password",
      required: !selectedRecord,
      placeholder: selectedRecord
        ? t("admin.users.passwordPlaceholder", "Leave blank to keep current")
        : undefined,
    },
    {
      name: "role",
      label: safeT("admin.users.role", "Role"),
      type: "select",
      required: true,
      placeholder: safeT("admin.users.rolePlaceholder", "Select role"),
      options: [
        { label: safeT("admin.users.roleOptions.user", "User"), value: "USER" },
        {
          label: safeT("admin.users.roleOptions.provider", "Provider"),
          value: "PROVIDER",
        },
        {
          label: safeT("admin.users.roleOptions.admin", "Admin"),
          value: "ADMIN",
        },
      ],
    },
    {
      name: "phone",
      label: t("admin.users.phone", "Phone"),
      type: "text",
      required: false,
      placeholder: "+1 (555) 000-0000",
    },
  ];

  const columns = [
    {
      title: t("admin.users.firstName", "First Name"),
      dataIndex: "firstName",
      key: "firstName",
      sorter: (a, b) => (a.firstName || "").localeCompare(b.firstName || ""),
    },
    {
      title: t("admin.users.lastName", "Last Name"),
      dataIndex: "lastName",
      key: "lastName",
      sorter: (a, b) => (a.lastName || "").localeCompare(b.lastName || ""),
    },
    {
      title: t("admin.users.email", "Email"),
      dataIndex: "email",
      key: "email",
      ellipsis: true,
    },
    {
      title: t("admin.users.username", "Username"),
      dataIndex: "username",
      key: "username",
    },
    {
      title: safeT("admin.users.role", "Role"),
      dataIndex: "role",
      key: "role",
      render: (role) => {
        const colorMap = {
          ADMIN: "purple",
          PROVIDER: "blue",
          USER: "green",
        };
        return (
          <span
            className="crud-role-badge"
            data-role={role || "USER"}
            style={{
              background: `color-mix(in srgb, var(--color-${colorMap[role] || "primary"}) 14%, transparent)`,
              color: `var(--color-${colorMap[role] || "primary"})`,
            }}>
            {role}
          </span>
        );
      },
    },
    {
      title: t("admin.users.status", "Status"),
      dataIndex: "status",
      key: "status",
    },
    {
      title: t("admin.users.createdAt", "Created At"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "-"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
  ];

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">{t("admin.users.title", "Users")}</h1>
          <p className="crud-page-subtitle">
            {t("admin.users.subtitle", {
              defaultValue: "Manage platform users",
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
        addLabel={t("admin.users.addUser", "Add User")}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search users...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.users.title", "Users")}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.users.editUser", "Edit User")
            : t("admin.users.addUser", "Add User")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.users.deleteUser", "Delete User")}
        content={`${t("admin.users.deleteConfirm", "Delete")} ${selectedRecord?.email ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default UsersPage;
