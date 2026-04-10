import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Table, Space, Modal, message } from "antd";
import {
  fetchVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
} from "@/api/provider";
import { useTranslation } from "react-i18next";

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
        "Could not approve verification request. Please try again.",
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
      message.error("Could not reject verification request. Please try again.");
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
    },
    {
      title: t("admin.requests.actions", { defaultValue: "Actions" }),
      key: "actions",
      render: (_, row) => {
        const id = row.id;
        const isProcessing = processingIds.has(id);
        const isProcessed = processedIds.has(id) || row.status !== "PENDING";
        const approveDisabled = isProcessed || isProcessing;
        const rejectDisabled = isProcessed || isProcessing;

        return (
          <Space>
            <Button
              type="primary"
              size="large"
              shape="round"
              loading={isProcessing}
              onClick={() =>
                Modal.confirm({
                  title: t("admin.requests.approveConfirmTitle", {
                    defaultValue: "Approve verification?",
                  }),
                  onOk: () => approveMut.mutate(id),
                })
              }
              disabled={approveDisabled}
              style={
                approveDisabled
                  ? {
                      minWidth: 96,
                      background: "transparent",
                      borderColor: "var(--panel-border-strong)",
                      color: "var(--color-text-secondary)",
                    }
                  : {
                      minWidth: 96,
                      background: "var(--color-primary)",
                      borderColor: "var(--color-primary)",
                      color: "var(--color-text-inverse)",
                    }
              }>
              {t("admin.requests.approve", { defaultValue: "Approve" })}
            </Button>

            <Button
              danger
              size="large"
              shape="round"
              loading={isProcessing}
              onClick={() =>
                Modal.confirm({
                  title: t("admin.requests.rejectConfirmTitle", {
                    defaultValue: "Reject verification?",
                  }),
                  onOk: () => rejectMut.mutate(id),
                })
              }
              disabled={rejectDisabled}
              style={
                rejectDisabled
                  ? {
                      minWidth: 96,
                      background: "transparent",
                      borderColor: "var(--panel-border-strong)",
                      color: "var(--color-text-secondary)",
                    }
                  : {
                      minWidth: 96,
                      background: "var(--color-danger)",
                      borderColor: "var(--color-danger)",
                      color: "var(--color-text-inverse)",
                    }
              }>
              {t("admin.requests.reject", { defaultValue: "Reject" })}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <h2>
        {t("admin.requests.title", { defaultValue: "Verification Requests" })}
      </h2>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={rows}
        columns={columns}
      />
    </div>
  );
}
