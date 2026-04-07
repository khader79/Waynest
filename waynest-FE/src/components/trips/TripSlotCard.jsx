/**
 * TripSlotCard - Displays a single time slot in the trip
 */

import styles from "@/pages/shared/TripPlanner.module.css";

export const TripSlotCard = ({
  label,
  slot,
  className = "",
  onAddWishlist,
  onViewPlace,
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
            {slot.estimatedCost.toFixed(2)} ILS
          </span>
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
              onClick={() => onAddWishlist(slot.placeId)}
            >
              Wishlist
            </button>
            <button
              className={`${styles.actionButton} ${styles.viewButton}`}
              type="button"
              onClick={() => onViewPlace(slot.placeId)}
            >
              View Place
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripSlotCard;
