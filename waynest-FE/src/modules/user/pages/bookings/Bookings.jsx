import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useBookingsPage } from "../../hooks/useBookingsPage";
import "./Bookings.css";

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    weekday: "short",
    year: "numeric"
  });
};

const formatCost = (value, currency) =>
`${(value ?? 0).toFixed(2)} ${currency}`;

const Bookings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { bookings, cancel, loading } = useBookingsPage();

  const getStatusLabel = (status) => {
    const statusMap = {
      pending: t("user.bookings.status.pending"),
      confirmed: t("user.bookings.status.confirmed"),
      cancelled: t("user.bookings.status.cancelled"),
      completed: t("user.bookings.status.completed")
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const getStatusClass = (status) => {
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

  return (
    <section className="bookings-page">
      <h1 className="bookings-title">{t("user.bookings.title")}</h1>
      {loading ?
      <div>
          {Array.from({ length: 4 }).map((_, index) =>
        <div key={index} className="bookings-skeleton-row" />
        )}
        </div> :
      bookings.length === 0 ?
      <div className="bookings-empty">
          <p>{t("user.bookings.empty")}</p>
          <span className="bookings-empty-hint">{t("user.bookings.emptyAction")}</span>
          <button
          type="button"
          className="bookings-explore-button"
          onClick={() => navigate("/explore")}>
            {t("user.bookings.exploreButton")}
          </button>
        </div> :

      <div className="bookings-list">
          {bookings.map((booking) => {
          const canCancel =
          booking.status.toLowerCase() === "pending" ||
          booking.status.toLowerCase() === "confirmed";
          return (
            <div key={booking.id} className="booking-card">
                {booking.place.imageUrl ?
              <img
                src={booking.place.imageUrl}
                alt={booking.place.name}
                className="booking-card-image" /> :


              <div className="booking-card-image-placeholder" />
              }
                <div className="booking-card-content">
                  <div className="booking-card-header">
                    <h3 className="booking-card-name">{booking.place.name}</h3>
                    <span className={`booking-status-badge ${getStatusClass(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>
                  <div className="booking-card-details">
                    <span>{formatDate(booking.bookingDate)}</span>
                    <span>{booking.persons} {t("user.bookings.persons")}</span>
                    <span>{formatCost(booking.totalCost, booking.currencyCode)}</span>
                  </div>
                  {canCancel &&
                <div className="booking-card-actions">
                      <button
                    type="button"
                    className="cancel-button"
                    onClick={() => void cancel(booking.id)}>
                        {t("user.bookings.cancel")}
                      </button>
                    </div>
                }
                </div>
              </div>);

        })}
        </div>
      }
    </section>);

};

export default Bookings;