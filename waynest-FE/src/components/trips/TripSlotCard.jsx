/**
 * TripSlotCard - Displays a single time slot in the trip
 */

import styles from "@/pages/shared/TripPlanner.module.css";
import { Select } from "antd";
import { convertAmount, AVAILABLE_CURRENCIES } from "@/utils/currency";

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

  const currency = slot.currencyCode || "ILS";
  const displayCost = convertAmount(
    slot.estimatedCost ?? 0,
    currency,
    selectedCurrency,
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
            {displayCost.toFixed(2)} {selectedCurrency}
          </span>
          {onUpdateSlotCurrency && (
            <div style={{ marginLeft: 8 }}>
              <Select
                size="small"
                value={currency}
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
