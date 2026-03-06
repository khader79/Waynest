import { useEffect, useState } from "react";
import { Table, message } from "antd";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get } from "../../../../api/apiService";
import { useAuth } from "../../../../context/AuthContext";
import type { ColumnsType } from "antd/es/table";
import "./Bookings.css";

interface Booking {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
}

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user?.userId) return;
      try {
        setLoading(true);
        // Fetch events as bookings (since events represent bookings in this system)
        const events = await get(ADMIN_ENDPOINTS.EVENTS_LIST);
        // Filter events for this user if needed, or show all events
        const userBookings = Array.isArray(events) 
          ? events.map((event: any) => ({
              id: event.id,
              title: event.title || "Event",
              startDate: event.startDate,
              endDate: event.endDate,
              status: event.isActive ? "Confirmed" : "Cancelled",
            }))
          : [];
        setBookings(userBookings);
      } catch (error) {
        message.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  const columns: ColumnsType<Booking> = [
    {
      title: "Destination/Event",
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
      title: "Status",
      dataIndex: "status",
      key: "status",
    },
  ];

  return (
    <section className="bookings">
      <h1 className="bookings-title">Your Bookings</h1>
      <Table
        columns={columns}
        dataSource={bookings}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />
    </section>
  );
};

export default Bookings;
