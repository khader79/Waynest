import { Button, Card, Space, Table, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  approveProviderApplication,
  fetchProviderApplicationsAdmin,
  rejectProviderApplication,
} from "@/api/providerApplications";
import { getApiErrorMessage } from "@/utils/errors";

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
      render: (status) => <Tag>{status}</Tag>,
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
    },
    {
      title: t("admin.providerApplications.actions", { defaultValue: "Actions" }),
      key: "actions",
      render: (_, record) =>
        record.status === "PENDING" ? (
          <Space>
            <Button
              type="primary"
              size="small"
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
              {t("admin.providerApplications.approve", { defaultValue: "Approve" })}
            </Button>
            <Button
              danger
              size="small"
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
              {t("admin.providerApplications.reject", { defaultValue: "Reject" })}
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card title={t("admin.providerApplications.title", { defaultValue: "Provider applications" })}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default ProviderApplicationsAdminPage;
