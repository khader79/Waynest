import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { BOOKINGS_ENDPOINTS } from "../../../../api/endpoints";
import { get, patch } from "../../../../api/apiService";
import "./Bookings.css";

type BookingPlace = {
  id: string;
  name: string;
  imageUrl: string | null;
};

type BookingItem = {
  id: string;
  bookingDate: string;
  persons: number;
  totalCost: number | null;
  currencyCode: string;
  status: string;
  place: BookingPlace;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractBookings = (payload: unknown): BookingItem[] => {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item) => {
      if (!isRecord(item) || typeof item.id !== "string") return null;
      const place = isRecord(item.place) ? (item.place as Record<string, unknown>) : null;
      const name = place && typeof place.name === "string" ? place.name : "";
      if (!name) return null;
      const imageUrl = place && typeof place.imageUrl === "string" ? place.imageUrl : null;
      const bookingDate = typeof item.bookingDate === "string" ? item.bookingDate : "";
      const persons = Number(item.persons ?? 1);
      const totalCost = item.totalCost === null ? null : Number(item.totalCost ?? 0);
      const currencyCode = typeof item.currencyCode === "string" ? item.currencyCode : "ILS";
      const status = typeof item.status === "string" ? item.status : "pending";
      return {
        id: item.id,
        bookingDate,
        persons: Number.isFinite(persons) ? persons : 1,
        totalCost: totalCost !== null && Number.isFinite(totalCost) ? totalCost : null,
        currencyCode,
        status,
        place: {
          id: place && typeof place.id === "string" ? place.id : item.id,
          name,
          imageUrl,
        },
      };
    })
    .filter((item): item is BookingItem => item !== null);
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCost = (value: number | null, currency: string) =>
  `${(value ?? 0).toFixed(2)} ${currency}`;

const statusLabel = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

const statusClass = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "status-confirmed";
    case "cancelled":
      return "status-cancelled";
    case "completed":
      return "status-completed";
    default:
      return "status-pending";
  }
};

const Bookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await get(BOOKINGS_ENDPOINTS.MY_BOOKINGS);
      setBookings(extractBookings(data));
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBookings();
  }, []);

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    const previous = bookings;
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId ? { ...booking, status: "cancelled" } : booking,
      ),
    );
    try {
      await patch(BOOKINGS_ENDPOINTS.CANCEL(bookingId), {});
      toast.success("Booking cancelled");
    } catch {
      setBookings(previous);
      toast.error("Failed to cancel booking");
    }
  };

  return (
    <section className="bookings-page">
      <h1 className="bookings-title">My Bookings</h1>
      {loading ? (
        <div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bookings-skeleton-row" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bookings-empty">
          <p>No bookings yet. Explore places to book your visit!</p>
          <button
            type="button"
            className="bookings-explore-button"
            onClick={() => navigate("/explore")}>
            Explore Places
          </button>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => {
            const canCancel =
              booking.status.toLowerCase() === "pending" ||
              booking.status.toLowerCase() === "confirmed";
            return (
              <div key={booking.id} className="booking-card">
                {booking.place.imageUrl ? (
                  <img
                    src={booking.place.imageUrl}
                    alt={booking.place.name}
                    className="booking-card-image"
                  />
                ) : (
                  <div className="booking-card-image-placeholder" />
                )}
                <div className="booking-card-content">
                  <div className="booking-card-header">
                    <h3 className="booking-card-name">{booking.place.name}</h3>
                    <span className={`booking-status-badge ${statusClass(booking.status)}`}>
                      {statusLabel(booking.status)}
                    </span>
                  </div>
                  <div className="booking-card-details">
                    <span>{formatDate(booking.bookingDate)}</span>
                    <span>{booking.persons} persons</span>
                    <span>{formatCost(booking.totalCost, booking.currencyCode)}</span>
                  </div>
                  {canCancel && (
                    <div className="booking-card-actions">
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => handleCancel(booking.id)}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Bookings;
