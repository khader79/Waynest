import { useMemo, useState } from "react";
import { Select, Table } from "antd";
import { useTranslation } from "react-i18next";
import { useProviderBookingsData } from "@/hooks/provider/useProviderBookingsData";
import "../../providerPanel.css";

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];

function ProviderBookings() {
  const { t } = useTranslation();
  const { bookings, loading, updateStatus, pendingId } = useProviderBookingsData();
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") {
      return bookings;
    }
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  const columns = [
    {
      title: t("provider.bookings.columns.place", { defaultValue: "Place" }),
      key: "place",
      render: (_, row) => row.place?.name ?? "—",
    },
    {
      title: t("provider.bookings.columns.date", { defaultValue: "Booking date" }),
      dataIndex: "bookingDate",
      key: "bookingDate",
      render: (d) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: t("provider.bookings.columns.persons", { defaultValue: "Guests" }),
      dataIndex: "persons",
      key: "persons",
    },
    {
      title: t("provider.bookings.columns.total", { defaultValue: "Total" }),
      key: "total",
      render: (_, row) =>
        row.totalCost != null ? `${row.totalCost} ${row.currencyCode ?? ""}` : "—",
    },
    {
      title: t("provider.bookings.columns.status", { defaultValue: "Status" }),
      dataIndex: "status",
      key: "status",
      render: (status, row) => (
        <Select
          value={status}
          style={{ minWidth: 130 }}
          loading={pendingId === row.id}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: t(`provider.bookings.status.${s}`, { defaultValue: s }),
          }))}
          onChange={(next) =>
            updateStatus({ id: row.id, status: next }).catch(() => {})
          }
        />
      ),
    },
  ];

  return (
    <div className="provider-panel-page">
      <div className="provider-panel-header">
        <h1 className="provider-panel-title">{t("provider.bookings.title")}</h1>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ minWidth: 160 }}
          options={[
            { value: "all", label: t("provider.bookings.filterAll", { defaultValue: "All statuses" }) },
            ...STATUS_OPTIONS.map((s) => ({
              value: s,
              label: t(`provider.bookings.status.${s}`, { defaultValue: s }),
            })),
          ]}
        />
      </div>
      <div className="provider-panel-table-wrap">
        <Table
          columns={columns}
          dataSource={filtered}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>
    </div>
  );
}

export default ProviderBookings;
