import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { cancelBooking, fetchMyBookings } from "@/api/user";
import { pickPlaceImageField } from "@/utils/placeImage";

const isRecord = (value) => typeof value === "object" && value !== null;

const extractBookings = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!isRecord(item) || typeof item.id !== "string") {
        return null;
      }

      const place = isRecord(item.place) ? item.place : null;
      const name = place && typeof place.name === "string" ? place.name : "";
      if (!name) {
        return null;
      }

      const imageUrl = place ? pickPlaceImageField(place) : null;
      const bookingDate =
        typeof item.bookingDate === "string" ? item.bookingDate : "";
      const persons = Number(item.persons ?? 1);
      const totalCost =
        item.totalCost === null ? null : Number(item.totalCost ?? 0);

      return {
        bookingDate,
        currencyCode:
          typeof item.currencyCode === "string" ? item.currencyCode : "ILS",
        id: item.id,
        persons: Number.isFinite(persons) ? persons : 1,
        place: {
          id: place && typeof place.id === "string" ? place.id : item.id,
          imageUrl,
          name,
        },
        status: typeof item.status === "string" ? item.status : "pending",
        totalCost:
          totalCost !== null && Number.isFinite(totalCost) ? totalCost : null,
      };
    })
    .filter((item) => item !== null);
};

export const useBookingsPage = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        const payload = await fetchMyBookings();
        setBookings(extractBookings(payload));
      } catch {
        toast.error(t("toasts.bookingsPage.failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    void loadBookings();
  }, []);

  const cancel = async (bookingId) => {
    const previousBookings = bookings;
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId
          ? { ...booking, status: "cancelled" }
          : booking,
      ),
    );

    try {
      await cancelBooking(bookingId);
      toast.success(t("toasts.bookingsPage.bookingCancelled"));
    } catch {
      setBookings(previousBookings);
      toast.error(t("toasts.bookingsPage.failedToCancel"));
    }
  };

  return {
    bookings,
    cancel,
    loading,
  };
};
