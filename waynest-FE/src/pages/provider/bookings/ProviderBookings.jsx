import { Table } from "antd";

import { useTranslation } from "react-i18next";
import { useProviderBookingsData } from "@/hooks/provider/useProviderBookingsData";
import "../../providerPanel.css";











function ProviderBookings() {
  const { t } = useTranslation();
  const { bookings, loading } = useProviderBookingsData();

  const columns = [
  {
    title: t("provider.bookings.columns.eventTitle"),
    dataIndex: "title",
    key: "title"
  },
  {
    title: t("provider.bookings.columns.startDate"),
    dataIndex: "startDate",
    key: "startDate",
    render: (date) => new Date(date).toLocaleDateString()
  },
  {
    title: t("provider.bookings.columns.endDate"),
    dataIndex: "endDate",
    key: "endDate",
    render: (date) => new Date(date).toLocaleDateString()
  },
  {
    title: t("provider.bookings.columns.availableTickets"),
    dataIndex: "availableTickets",
    key: "availableTickets"
  },
  {
    title: t("provider.bookings.columns.ticketPrice"),
    dataIndex: "ticketPrice",
    key: "ticketPrice",
    render: (price, record) => `${price} ${record.currencyCode}`
  }];


  return (
    <div className="provider-panel-page">
      <h1 className="provider-panel-title">{t("provider.bookings.title")}</h1>
      <div className="provider-panel-table-wrap">
        <Table
          columns={columns}
          dataSource={bookings}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }} />
        
      </div>
    </div>);

}

export default ProviderBookings;