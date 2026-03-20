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

const extractRows = (payload: unknown): BookingRow[] => {
  const list =
    Array.isArray(payload)
      ? payload
      : payload &&
          typeof payload === "object" &&
          Array.isArray((payload as { data?: unknown[] }).data)
        ? (payload as { data: unknown[] }).data
        : [];

  return list
    .map((event) => {
      if (!event || typeof event !== "object") {
        return null;
      }

      const record = event as Record<string, unknown>;
      return {
        availableTickets: Number(record.availableTickets ?? 0),
        currencyCode: String(record.currencyCode ?? "ILS"),
        endDate: String(record.endDate ?? ""),
        id: String(record.id ?? ""),
        startDate: String(record.startDate ?? ""),
        ticketPrice: Number(record.ticketPrice ?? 0),
        title: String(record.title ?? ""),
      };
    })
    .filter((row): row is BookingRow => row !== null && row.id.length > 0);
};

export const useProviderBookingsData = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const events = await fetchProviderEvents();
        setBookings(extractRows(events));
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
