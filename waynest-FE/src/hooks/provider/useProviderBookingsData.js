import { message } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchProviderEvents } from "@/api/provider";











const extractRows = (payload) => {
  const list =
  Array.isArray(payload) ?
  payload :
  payload &&
  typeof payload === "object" &&
  Array.isArray(payload.data) ?
  payload.data :
  [];

  return list.
  map((event) => {
    if (!event || typeof event !== "object") {
      return null;
    }

    const record = event;
    return {
      availableTickets: Number(record.availableTickets ?? 0),
      currencyCode: String(record.currencyCode ?? "ILS"),
      endDate: String(record.endDate ?? ""),
      id: String(record.id ?? ""),
      startDate: String(record.startDate ?? ""),
      ticketPrice: Number(record.ticketPrice ?? 0),
      title: String(record.title ?? "")
    };
  }).
  filter((row) => row !== null && row.id.length > 0);
};

export const useProviderBookingsData = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
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
    loading
  };
};