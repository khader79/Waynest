import { Button, Space, Table, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  approveProviderApplication,
  fetchProviderApplicationsAdmin,
  rejectProviderApplication,
} from "@/api/providerApplications";
import { getApiErrorMessage } from "@/utils/errors";

const statusColors = {
  PENDING: "orange",
  APPROVED: "green",
  REJECTED: "red",
};

const ProviderApplicationsAdminPage = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchProviderApplicationsAdmin();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("admin.providerApplications.loadFailed", {
            defaultValue: "Failed to load applications",
          }),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = [
    {
      title: t("admin.providerApplications.status", { defaultValue: "Status" }),
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <span
          className="app-status-badge"
          style={{
            background: `color-mix(in srgb, var(--color-${statusColors[status] || "gray"}) 14%, transparent)`,
            color: `var(--color-${statusColors[status] || "gray"})`,
          }}
        >
          {status}
        </span>
      ),
    },
    {
      title: t("admin.providerApplications.user", { defaultValue: "User" }),
      key: "user",
      render: (_, record) => record.user?.email ?? record.userId,
    },
    {
      title: t("admin.providerApplications.submitted", {
        defaultValue: "Submitted",
      }),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "-"),
    },
    {
      title: t("admin.providerApplications.actions", {
        defaultValue: "Actions",
      }),
      key: "actions",
      render: (_, record) =>
        record.status === "PENDING" ? (
          <Space>
            <Button
              type="primary"
              size="small"
              className="app-action-btn"
              onClick={async () => {
                try {
                  await approveProviderApplication(record.id);
                  toast.success(
                    t("admin.providerApplications.approved", {
                      defaultValue: "Application approved",
                    }),
                  );
                  void load();
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "Approve failed"));
                }
              }}
            >
              {t("admin.providerApplications.approve", {
                defaultValue: "Approve",
              })}
            </Button>
            <Button
              danger
              size="small"
              className="app-action-btn"
              onClick={async () => {
                try {
                  await rejectProviderApplication(record.id, {});
                  toast.success(
                    t("admin.providerApplications.rejected", {
                      defaultValue: "Application rejected",
                    }),
                  );
                  void load();
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "Reject failed"));
                }
              }}
            >
              {t("admin.providerApplications.reject", {
                defaultValue: "Reject",
              })}
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.providerApplications.title", {
              defaultValue: "Provider applications",
            })}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.providerApplications.subtitle", {
              defaultValue: "Review and manage provider applications",
            })}
          </p>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          className="admin-table app-table"
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </div>
    </div>
  );
};

export default ProviderApplicationsAdminPage;