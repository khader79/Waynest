import { useNavigate } from "react-router-dom";
import { useBookingsPage } from "../../hooks/useBookingsPage";
import "./Bookings.css";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    weekday: "short",
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
  const { bookings, cancel, loading } = useBookingsPage();

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
                        onClick={() => void cancel(booking.id)}>
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
