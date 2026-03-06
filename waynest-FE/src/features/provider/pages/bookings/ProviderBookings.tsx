import { useEffect, useState } from "react";
import { Table, message } from "antd";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get } from "../../../../api/apiService";
import type { ColumnsType } from "antd/es/table";

interface Booking {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  availableTickets: number;
  ticketPrice: number;
  currencyCode: string;
}

function ProviderBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const events = await get(ADMIN_ENDPOINTS.EVENTS_LIST);
        const bookingsList = Array.isArray(events)
          ? events.map((event: any) => ({
              id: event.id,
              title: event.title,
              startDate: event.startDate,
              endDate: event.endDate,
              availableTickets: event.availableTickets,
              ticketPrice: event.ticketPrice,
              currencyCode: event.currencyCode,
            }))
          : [];
        setBookings(bookingsList);
      } catch (error) {
        message.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const columns: ColumnsType<Booking> = [
    {
      title: "Event Title",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Available Tickets",
      dataIndex: "availableTickets",
      key: "availableTickets",
    },
    {
      title: "Ticket Price",
      dataIndex: "ticketPrice",
      key: "ticketPrice",
      render: (price: number, record: Booking) => `${price} ${record.currencyCode}`,
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "24px" }}>Provider Bookings</h1>
      <Table
        columns={columns}
        dataSource={bookings}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}

export default ProviderBookings;
