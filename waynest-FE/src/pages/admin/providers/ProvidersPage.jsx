import { useMemo, useState } from "react";
import { Image, Tag, Space } from "antd";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { providersAdminService } from "@/api/admin";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./ProvidersPage.css";

const STATUS_COLOR = {
  VERIFIED: "green", PENDING: "orange",
  UNDER_REVIEW: "blue", REJECTED: "red", SUSPENDED: "volcano",
};

function ProvidersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const query = useMemo(() => ({ page, pageSize, search: searchQuery || undefined }), [page, pageSize, searchQuery]);

  const fields = [
    { name: "displayName",        label: "Display Name",     type: "text",     required: true },
    { name: "slug",               label: "Slug",             type: "text",     required: true },
    { name: "phone",              label: "Phone",            type: "text",     required: true },
    { name: "website",            label: "Website",          type: "text",     required: false },
    { name: "description",        label: "Description",      type: "textarea", required: false },
    {
      name: "verificationStatus", label: "Verification",     type: "select",   required: true,
      options: [
        { label: "Pending",      value: "PENDING" },
        { label: "Under Review", value: "UNDER_REVIEW" },
        { label: "Verified ✓",  value: "VERIFIED" },
        { label: "Rejected",     value: "REJECTED" },
        { label: "Suspended",    value: "SUSPENDED" },
      ],
    },
  ];

  const columns = [
    {
      title: "Logo", key: "logo", width: 60,
      render: (_, r) => {
        const url = resolveMediaUrl(r.logo_url || r.logoUrl);
        const init = (r.displayName ?? "?")[0].toUpperCase();
        return url ? (
          <Image src={url} alt={r.displayName} width={44} height={44}
            style={{ objectFit: "cover", borderRadius: 8 }}
            fallback={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'%3E%3Crect width='44' height='44' fill='%23e2e8f0'/%3E%3Ctext x='22' y='29' text-anchor='middle' font-size='18' fill='%23666'%3E${init}%3C/text%3E%3C/svg%3E`}
          />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 8, background: "linear-gradient(135deg,#667eea,#764ba2)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>
            {init}
          </div>
        );
      },
    },
    {
      title: "Provider", key: "name",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.displayName}</div>
          {r.website && (
            <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
               target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#6b7280" }}>
              🌐 {r.website}
            </a>
          )}
        </div>
      ),
    },
    {
      title: "Verification", dataIndex: "verificationStatus", key: "verificationStatus",
      render: (s) => <Tag color={STATUS_COLOR[s] ?? "default"}>{s === "VERIFIED" ? "✓ " : ""}{s?.replace("_", " ") ?? "-"}</Tag>,
    },
    {
      title: "Active", dataIndex: "isActive", key: "isActive",
      render: (v) => <Tag color={v ? "green" : "red"}>{v ? "Active" : "Inactive"}</Tag>,
    },
    { title: "Phone", dataIndex: "phone", key: "phone", render: (p) => p ?? "-" },
    {
      title: "Slug", dataIndex: "slug", key: "slug",
      render: (s) => s ? <a href={`/p/${encodeURIComponent(s)}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>{s}</a> : "-",
    },
    {
      title: "Created", dataIndex: "createdAt", key: "createdAt",
      render: (d) => d ? new Date(d).toLocaleDateString() : "-",
    },
  ];

  const { closeDelete, closeForm, confirmDelete, isDeleteOpen, isFormOpen, loading,
          openCreate, openDelete, openEdit, records, selectedRecord, submit, submitting, total } =
    useCrudPage({ service: providersAdminService, query, mapListResponse: extractAdminCollection,
      messages: { loadError: "Failed to load providers", saveError: "Failed to save provider",
        deleteError: "Failed to delete provider", createdSuccess: "Provider created",
        updatedSuccess: "Provider updated", deletedSuccess: "Provider deleted" } });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">Providers</h1>
          <p className="crud-page-subtitle">Manage service providers</p>
        </div>
      </div>
      <AdminTable data={records} columns={columns} loading={loading} onEdit={openEdit}
        onDelete={openDelete} onAdd={openCreate} addLabel="Add provider" total={total}
        page={page} pageSize={pageSize} onPageChange={(p, ps) => { setPage(p); setPageSize(ps); }}
        searchable searchPlaceholder="Search providers..." onSearch={setSearchQuery}
        exportable title="Providers" />
      <AdminFormModal open={isFormOpen} onCancel={closeForm} onSubmit={submit}
        title={selectedRecord ? "Edit provider" : "Add provider"}
        initialValues={selectedRecord ?? undefined} fields={fields} loading={submitting} />
      <DeleteConfirmModal open={isDeleteOpen} onCancel={closeDelete} onConfirm={confirmDelete}
        title="Delete provider"
        content={`Are you sure you want to delete "${selectedRecord?.displayName ?? ""}"?`}
        loading={submitting} />
    </div>
  );
}

export default ProvidersPage;
