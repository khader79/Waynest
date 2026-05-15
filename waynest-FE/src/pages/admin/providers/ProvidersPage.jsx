import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { providersAdminService } from "@/api/admin";
import "./ProvidersPage.css";

function ProvidersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const query = useMemo(
    () => ({ page, pageSize, search: searchQuery || undefined }),
    [page, pageSize, searchQuery],
  );

  const fields = [
    {
      name: "displayName",
      label: t("admin.providers.displayName", "Display Name"),
      type: "text",
      required: true,
    },
    {
      name: "slug",
      label: t("admin.places.slug", "Slug"),
      type: "text",
      required: true,
    },
    {
      name: "phone",
      label: t("admin.users.phone", "Phone"),
      type: "text",
      required: true,
    },
    {
      name: "website",
      label: t("admin.providers.website", "Website"),
      type: "text",
      required: false,
    },
    {
      name: "verificationStatus",
      label: t("admin.providers.verificationStatus", "Verification"),
      type: "select",
      required: true,
      options: [
        {
          label: t("admin.providers.statusOptions.pending", "Pending"),
          value: "PENDING",
        },
        {
          label: t("admin.providers.statusOptions.underReview", "Under review"),
          value: "UNDER_REVIEW",
        },
        {
          label: t("admin.providers.statusOptions.verified", "Verified"),
          value: "VERIFIED",
        },
        {
          label: t("admin.providers.statusOptions.rejected", "Rejected"),
          value: "REJECTED",
        },
        {
          label: t("admin.providers.statusOptions.suspended", "Suspended"),
          value: "SUSPENDED",
        },
      ],
    },
  ];

  const columns = [
    {
      title: t("admin.providers.displayName", "Display Name"),
      dataIndex: "displayName",
      key: "displayName",
    },
    {
      title: t("admin.places.slug", "Slug"),
      dataIndex: "slug",
      key: "slug",
      render: (slug) =>
        slug ? (
          <a
            href={`/providers/public/by-slug/${encodeURIComponent(slug)}`}
            target="_blank"
            rel="noreferrer">
            {slug}
          </a>
        ) : (
          "-"
        ),
    },
    {
      title: t("admin.providers.verificationStatus", "Verification"),
      dataIndex: "verificationStatus",
      key: "verificationStatus",
      render: (status) => {
        const map = {
          PENDING: t("admin.providers.statusOptions.pending", "Pending"),
          UNDER_REVIEW: t(
            "admin.providers.statusOptions.underReview",
            "Under review",
          ),
          VERIFIED: t("admin.providers.statusOptions.verified", "Verified"),
          REJECTED: t("admin.providers.statusOptions.rejected", "Rejected"),
          SUSPENDED: t("admin.providers.statusOptions.suspended", "Suspended"),
        };
        return map[status] ?? status ?? "-";
      },
    },
    {
      title: t("admin.providers.website", "Website"),
      dataIndex: "website",
      key: "website",
      render: (website) => {
        if (!website) return "-";
        const href = website.startsWith("http")
          ? website
          : `https://${website}`;
        return (
          <a href={href} target="_blank" rel="noreferrer">
            {website}
          </a>
        );
      },
    },
    {
      title: t("admin.places.isActive", "Active"),
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) =>
        isActive ? t("admin.common.yes", "Yes") : t("admin.common.no", "No"),
    },
    {
      title: t("admin.users.phone", "Phone"),
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: t("admin.users.createdAt", "Created At"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => {
        if (!date) return "-";
        try {
          return new Date(date).toLocaleString(undefined, { hour12: false });
        } catch (e) {
          return date;
        }
      },
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
    total,
  } = useCrudPage({
    service: providersAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError: `${t("admin.common.failedToLoad", "Failed to load")} ${t("admin.providers.title", "Providers").toLowerCase()}`,
      saveError: `${t("admin.common.failedToSave", "Failed to save")} ${t("admin.providers.title", "Providers").toLowerCase()}`,
      deleteError: `${t("admin.common.failedToDelete", "Failed to delete")} ${t("admin.providers.title", "Providers").toLowerCase()}`,
      createdSuccess: t(
        "admin.common.createdSuccessfully",
        "created successfully",
      ),
      updatedSuccess: `${t("admin.providers.title", "Providers").split(" ")[0]} ${t("admin.common.updatedSuccessfully", "updated successfully")}`,
      deletedSuccess: `${t("admin.providers.title", "Providers").split(" ")[0]} ${t("admin.common.deletedSuccessfully", "deleted successfully")}`,
    },
  });

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.providers.title", "Providers")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.providers.subtitle", {
              defaultValue: "Manage service providers",
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
        addLabel={t("admin.providers.addProvider", "Add provider")}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        searchable
        searchPlaceholder={t("admin.common.search", "Search providers...")}
        onSearch={setSearchQuery}
        exportable
        title={t("admin.providers.title", "Providers")}
      />

      <AdminFormModal
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={submit}
        title={
          selectedRecord
            ? t("admin.providers.editProvider", "Edit provider")
            : t("admin.providers.addProvider", "Add provider")
        }
        initialValues={selectedRecord ?? undefined}
        fields={fields}
        loading={submitting}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={t("admin.providers.deleteProvider", "Delete provider")}
        content={`${t("admin.providers.deleteConfirm", "Are you sure you want to delete this provider?")} ${selectedRecord?.displayName ?? ""}?`}
        loading={submitting}
      />
    </div>
  );
}

export default ProvidersPage;
