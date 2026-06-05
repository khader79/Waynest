import { useMemo, useState } from "react";
import { Image, Tag } from "antd";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { usersAdminService } from "@/api/admin";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./UsersPage.css";

const ROLE_COLOR = { ADMIN: "purple", PROVIDER: "blue", USER: "green" };
const ROLE_ICON  = { ADMIN: "🛡", PROVIDER: "🏢", USER: "👤" };

function UsersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const query = useMemo(() => ({ page, pageSize, search: searchQuery || undefined }), [page, pageSize, searchQuery]);

  const { closeDelete, closeForm, confirmDelete, isDeleteOpen, isFormOpen, loading,
          openCreate, openDelete, openEdit, records, selectedRecord, submit, submitting, total } =
    useCrudPage({ service: usersAdminService, query, mapListResponse: extractAdminCollection,
      messages: { loadError: "Failed to load users", saveError: "Failed to save user",
        deleteError: "Failed to delete user", createdSuccess: "User created",
        updatedSuccess: "User updated", deletedSuccess: "User deleted" } });

  const fields = [
    { name: "firstName", label: "First Name", type: "text",     required: true },
    { name: "lastName",  label: "Last Name",  type: "text",     required: true },
    { name: "email",     label: "Email",      type: "email",    required: true },
    { name: "username",  label: "Username",   type: "text",     required: true },
    { name: "password",  label: "Password",   type: "password", required: !selectedRecord,
      placeholder: selectedRecord ? "Leave blank to keep current" : undefined },
    { name: "phone",     label: "Phone",      type: "text",     required: false },
    {
      name: "role", label: "Role", type: "select", required: true,
      options: [
        { label: "👤 User",     value: "USER" },
        { label: "🏢 Provider", value: "PROVIDER" },
        { label: "🛡 Admin",   value: "ADMIN" },
      ],
    },
  ];

  const columns = [
    {
      title: "Avatar", key: "avatar", width: 56,
      render: (_, r) => {
        const url = resolveMediaUrl(r.avatarUrl);
        const init = ((r.firstName ?? r.username ?? r.email ?? "?")[0]).toUpperCase();
        return url ? (
          <Image src={url} alt={r.email} width={40} height={40}
            style={{ objectFit: "cover", borderRadius: "50%" }}
            fallback={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e2e8f0'/%3E%3Ctext x='20' y='26' text-anchor='middle' font-size='16' fill='%23888'%3E${init}%3C/text%3E%3C/svg%3E`}
          />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg,#4facfe,#00f2fe)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 15 }}>
            {init}
          </div>
        );
      },
    },
    {
      title: "User", key: "user",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>@{r.username}</div>
        </div>
      ),
    },
    {
      title: "Email", dataIndex: "email", key: "email",
      render: (e, r) => (
        <div>
          <div style={{ fontSize: 13 }}>{e}</div>
          {r.isEmailVerified && <Tag color="green" style={{ fontSize: 10, padding: "0 4px" }}>✓ Verified</Tag>}
        </div>
      ),
    },
    {
      title: "Role", dataIndex: "role", key: "role",
      render: (role) => (
        <Tag color={ROLE_COLOR[role] ?? "default"}>
          {ROLE_ICON[role] ?? ""} {role ?? "-"}
        </Tag>
      ),
    },
    { title: "Phone", dataIndex: "phone", key: "phone", render: (p) => p ?? "-" },
    {
      title: "Created", dataIndex: "createdAt", key: "createdAt",
      render: (d) => d ? new Date(d).toLocaleDateString() : "-",
    },
  ];

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">Users</h1>
          <p className="crud-page-subtitle">Manage platform users</p>
        </div>
      </div>
      <AdminTable data={records} columns={columns} loading={loading} onEdit={openEdit}
        onDelete={openDelete} onAdd={openCreate} addLabel="Add User" total={total}
        page={page} pageSize={pageSize} onPageChange={(p, ps) => { setPage(p); setPageSize(ps); }}
        searchable searchPlaceholder="Search users..." onSearch={setSearchQuery}
        exportable title="Users" />
      <AdminFormModal open={isFormOpen} onCancel={closeForm} onSubmit={submit}
        title={selectedRecord ? "Edit User" : "Add User"}
        initialValues={selectedRecord ?? undefined} fields={fields} loading={submitting} />
      <DeleteConfirmModal open={isDeleteOpen} onCancel={closeDelete} onConfirm={confirmDelete}
        title="Delete User"
        content={`Are you sure you want to delete "${selectedRecord?.email ?? ""}"?`}
        loading={submitting} />
    </div>
  );
}

export default UsersPage;
