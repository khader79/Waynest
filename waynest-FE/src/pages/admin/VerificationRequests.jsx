import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Table, Space, Modal, message } from "antd";
import {
  fetchVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
} from "@/api/provider";
import { useTranslation } from "react-i18next";
import "./VerificationRequests.css";

export default function VerificationRequests() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [processingIds, setProcessingIds] = useState(new Set());
  const [processedIds, setProcessedIds] = useState(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "verificationRequests"],
    queryFn: fetchVerificationRequests,
  });

  const approveMut = useMutation({
    mutationFn: (id) => approveVerificationRequest(id),
    onMutate: async (id) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    onSuccess: (_, id) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setProcessedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      qc.invalidateQueries({ queryKey: ["admin", "verificationRequests"] });
    },
    onError: (err, id) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      message.error(
        t(
          "toasts.verification.approveFailed",
          "Failed to approve verification",
        ),
      );
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id) => rejectVerificationRequest(id),
    onMutate: async (id) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    onSuccess: (_, id) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setProcessedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      qc.invalidateQueries({ queryKey: ["admin", "verificationRequests"] });
    },
    onError: (err, id) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      message.error(
        t("toasts.verification.rejectFailed", "Failed to reject verification"),
      );
    },
  });

  const rows = Array.isArray(data) ? data : data?.data || [];

  const columns = [
    {
      title: t("admin.requests.place", { defaultValue: "Place" }),
      dataIndex: ["place", "name"],
      key: "place",
    },
    {
      title: t("admin.requests.provider", { defaultValue: "Provider" }),
      key: "provider",
      render: (_, row) => {
        const providerName = row.place?.provider?.displayName;
        if (providerName) return providerName;
        const user = row.requestedByUser;
        if (user) return user.displayName || user.username || user.id;
        return row.requestedByUserId || "-";
      },
    },
    {
      title: t("admin.requests.status", { defaultValue: "Status" }),
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colorMap = {
          PENDING: "orange",
          APPROVED: "green",
          REJECTED: "red",
        };
        return (
          <span
            className="verif-status-badge"
            style={{
              background: `color-mix(in srgb, var(--color-${colorMap[status] || "gray"}) 14%, transparent)`,
              color: `var(--color-${colorMap[status] || "gray"})`,
            }}>
            {status}
          </span>
        );
      },
    },
    {
      title: t("admin.requests.actions", { defaultValue: "Actions" }),
      key: "actions",
      render: (_, row) => {
        const id = row.id;
        const isProcessing = processingIds.has(id);
        const isProcessed = processedIds.has(id) || row.status !== "PENDING";

        return (
          <Space>
            <Button
              type="primary"
              size="middle"
              loading={isProcessing}
              onClick={() =>
                Modal.confirm({
                  title: t("admin.requests.approveConfirmTitle", {
                    defaultValue: "Approve verification?",
                  }),
                  onOk: async () => {
                    try {
                      await approveMut.mutateAsync(id);
                    } catch (e) {
                      throw e;
                    }
                  },
                })
              }
              disabled={isProcessed}
              className="verif-action-btn verif-approve-btn">
              {t("admin.requests.approve", { defaultValue: "Approve" })}
            </Button>

            <Button
              danger
              size="middle"
              loading={isProcessing}
              onClick={() =>
                Modal.confirm({
                  title: t("admin.requests.rejectConfirmTitle", {
                    defaultValue: "Reject verification?",
                  }),
                  onOk: async () => {
                    try {
                      await rejectMut.mutateAsync(id);
                    } catch (e) {
                      throw e;
                    }
                  },
                })
              }
              disabled={isProcessed}
              className="verif-action-btn verif-reject-btn">
              {t("admin.requests.reject", { defaultValue: "Reject" })}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.requests.title", {
              defaultValue: "Verification Requests",
            })}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.requests.subtitle", {
              defaultValue: "Approve or reject place verification requests",
            })}
          </p>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          columns={columns}
          className="admin-table verif-table"
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </div>
    </div>
  );
}
