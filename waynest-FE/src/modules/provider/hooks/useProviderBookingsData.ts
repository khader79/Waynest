import { message } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchProviderEvents } from "@/services/provider/provider.service";

interface BookingRow {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  availableTickets: number;
  ticketPrice: number;
  currencyCode: string;
}

export const useProviderBookingsData = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const events = await fetchProviderEvents();
        const rows = Array.isArray(events)
          ? events.map((event: Record<string, unknown>) => ({
              availableTickets: Number(event.availableTickets ?? 0),
              currencyCode: String(event.currencyCode ?? "ILS"),
              endDate: String(event.endDate ?? ""),
              id: String(event.id ?? ""),
              startDate: String(event.startDate ?? ""),
              ticketPrice: Number(event.ticketPrice ?? 0),
              title: String(event.title ?? ""),
            }))
          : [];
        setBookings(rows);
      } catch {
        message.error(t("provider.bookings.feedback.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void fetchBookings();
  }, [t]);

  return {
    bookings,
    loading,
  };
};
