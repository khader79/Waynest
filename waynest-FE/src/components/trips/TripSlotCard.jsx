/**
 * TripSlotCard - Displays a single time slot in the trip
 */

import styles from "@/pages/shared/TripPlanner.module.css";
import { Select } from "antd";
import { convertAmount, AVAILABLE_CURRENCIES } from "@/utils/currency";
import formatCurrency from "@/utils/currency";

export const TripSlotCard = ({
  label,
  slot,
  className = "",
  onAddWishlist,
  onViewPlace,
  dayIndex,
  slotKey,
  selectedCurrency = "ILS",
  onUpdateSlotCurrency,
}) => {
  if (!slot) {
    return (
      <div className={`${styles.slot} ${className}`}>
        <div className={styles.slotHeader}>
          <span className={styles.slotTime}>{label}</span>
        </div>
        <div className={styles.slotContent}>
          <p className={styles.slotName}>No suitable place found</p>
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
        {slot.placeId && (
          <div className={styles.slotActions}>
            <button
              className={`${styles.actionButton} ${styles.wishlistButton}`}
              type="button"
              onClick={() => onAddWishlist(slot.placeId)}>
              Wishlist
            </button>
            <button
              className={`${styles.actionButton} ${styles.viewButton}`}
              type="button"
              onClick={() => onViewPlace(slot.placeId)}>
              View Place
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripSlotCard;
