/**
 * TripSlotCard - Displays a single time slot in the trip
 */

import { useTranslation } from "react-i18next";
import styles from "@/pages/shared/TripPlanner.module.css";
import { Select } from "antd";
import { useNavigate } from "react-router-dom";
import { convertAmount, AVAILABLE_CURRENCIES } from "@/utils/currency";
import formatCurrency from "@/utils/currency";

export const TripSlotCard = ({
  label,
  slot,
  className = "",
  onAddWishlist,
  onViewPlace,
  onViewEvent,
  dayIndex,
  slotKey,
  selectedCurrency = "ILS",
  onUpdateSlotCurrency,
  scheduledDate,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!slot) {
    return (
      <div className={`${styles.slot} ${className}`}>
        <div className={styles.slotHeader}>
          <span className={styles.slotTime}>{label}</span>
        </div>
        <div className={styles.slotContent}>
          <p className={styles.slotName}>
            {t("tripPlanner.slot.noSuitablePlaceFound", {
              defaultValue: "No suitable place found",
            })}
          </p>
        </div>
      </div>
    );
  }

  const originalCurrency = slot.currencyCode || "ILS";
  const originalAmount = Number(slot.estimatedCost ?? 0);
  const slotDisplayCurrency = slot.displayCurrency ?? selectedCurrency;
  const convertedAmount = convertAmount(
    originalAmount,
    originalCurrency,
    slotDisplayCurrency,
  );
  const showEventFormula =
    String(slot.type || "").toUpperCase() === "EVENT" &&
    Number.isFinite(Number(slot.ticketPrice)) &&
    Number.isFinite(Number(slot.persons));
  const isEvent = String(slot.type || "").toUpperCase() === "EVENT";

  const handleAddToCalendar = () => {
    const params = new URLSearchParams();

    if (scheduledDate) {
      params.set("date", scheduledDate.slice(0, 10));
    }

    if (slot.openTime) {
      params.set("time", slot.openTime.slice(0, 5));
    }

    if (slot.name) {
      params.set("title", slot.name);
      params.set("placeName", slot.name);
    }

    if (slot.placeId) {
      params.set("placeId", slot.placeId);
      params.set("sourceType", "place");
    }

    if (slot.eventId) {
      params.set("eventId", slot.eventId);
      params.set("sourceType", "event");
    }

    navigate(`/calendar${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className={`${styles.slot} ${className}`}>
      <div className={styles.slotHeader}>
        <span className={styles.slotTime}>{label}</span>
        <span className={styles.slotDuration}>{slot.duration}</span>
      </div>
      <div className={styles.slotContent}>
        <h4 className={styles.slotName}>{slot.name}</h4>
        {slot.type && <span className={styles.slotType}>{slot.type}</span>}
        <div className={styles.slotInfo}>
          <span className={styles.slotCost}>
            {formatCurrency(originalAmount, originalCurrency)}
          </span>
          <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400 }}>
            {slotDisplayCurrency && slotDisplayCurrency !== originalCurrency ? (
              <span>
                ≈ {formatCurrency(convertedAmount, slotDisplayCurrency)}
              </span>
            ) : null}
          </span>
          {onUpdateSlotCurrency && (
            <div style={{ marginLeft: 8 }}>
              <Select
                size="small"
                value={slotDisplayCurrency}
                options={AVAILABLE_CURRENCIES}
                onChange={(val) => onUpdateSlotCurrency(dayIndex, slotKey, val)}
                style={{ width: 110 }}
              />
            </div>
          )}
          {showEventFormula && (
            <span className={styles.slotHours}>
              {Number(slot.ticketPrice).toFixed(2)} x {Number(slot.persons)}
            </span>
          )}
          {slot.openTime && slot.closeTime && (
            <span className={styles.slotHours}>
              {slot.openTime} - {slot.closeTime}
            </span>
          )}
        </div>
        {(slot.placeId || slot.eventId) && (
          <div className={styles.slotActions}>
            {!isEvent && slot.placeId ? (
              <button
                className={`${styles.actionButton} ${styles.wishlistButton}`}
                type="button"
                onClick={() => onAddWishlist(slot.placeId)}>
                {t("tripPlanner.results.addToWishlist", {
                  defaultValue: "Add to Wishlist",
                })}
              </button>
            ) : null}
            {isEvent && slot.eventId ? (
              <button
                className={`${styles.actionButton} ${styles.viewButton}`}
                type="button"
                onClick={() => onViewEvent?.(slot.eventId)}>
                {t("tripPlanner.slot.viewEvent", {
                  defaultValue: "View Event",
                })}
              </button>
            ) : slot.placeId ? (
              <button
                className={`${styles.actionButton} ${styles.viewButton}`}
                type="button"
                onClick={() => onViewPlace(slot.placeId)}>
                {t("tripPlanner.slot.viewPlace", {
                  defaultValue: "View Place",
                })}
              </button>
            ) : null}
            <button
              className={`${styles.actionButton} ${styles.viewButton}`}
              type="button"
              onClick={handleAddToCalendar}>
              {t("tripPlanner.calendar.addToCalendar", {
                defaultValue: "Add to Calendar",
              })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripSlotCard;
