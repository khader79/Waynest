/**
 * TripSlotCard - Displays a single time slot in the trip
 * Now with lazy-loaded background image and blur-up animation.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "@/pages/shared/TripPlanner.module.css";
import { Select } from "antd";
import { useNavigate } from "react-router-dom";
import { convertAmount, AVAILABLE_CURRENCIES } from "@/utils/currency";
import formatCurrency from "@/utils/currency";
import LazyBackgroundImage from "@/components/Image/LazyBackgroundImage";
import PlaceImageGallery from "@/components/shared/PlaceImageGallery/PlaceImageGallery";

// ── Inline gallery modal ──────────────────────────────────────────────────────
function SlotGalleryModal({ slot, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.7)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 560, borderRadius: 16, overflow: "hidden", background: "var(--panel-bg,#fff)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--panel-border,#e5e7eb)" }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{slot.name}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-secondary,#6b7280)", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 12 }}>
          <PlaceImageGallery
            placeName={slot.name}
            city={slot.cityName}
            type={slot.type}
            staticImage={slot.imageUrl ?? undefined}
            maxImages={8}
          />
        </div>
      </div>
    </div>
  );
}

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
  canUseCalendar = true,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!slot) {
    return (
      <div className={`${styles.slot} ${className} ${styles.slotEmpty}`}>
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

  const [showGallery, setShowGallery] = useState(false);

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
  const hasImage = Boolean(slot.imageUrl);

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
    <>
    <div className={`${styles.slot} ${className} ${hasImage ? styles.slotWithImage : ""}`}>
      {hasImage && (
        <LazyBackgroundImage
          src={slot.imageUrl}
          alt={slot.name}
          className={styles.slotBackground}
          fallbackColor="#1a1a2e"
        />
      )}

      {hasImage && <div className={styles.slotOverlay} />}

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
        <div className={styles.slotActions}>
          {/* Photos button — always visible for named places */}
          {slot.name && !isEvent && (
            <button
              className={`${styles.actionButton} ${styles.viewButton}`}
              type="button"
              onClick={() => setShowGallery(true)}>
              📷 {t("tripPlanner.slot.photos", { defaultValue: "Photos" })}
            </button>
          )}
          {(slot.placeId || slot.eventId) && (
            <>
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
              {canUseCalendar ? (
                <button
                  className={`${styles.actionButton} ${styles.viewButton}`}
                  type="button"
                  onClick={handleAddToCalendar}>
                  {t("tripPlanner.calendar.addToCalendar", {
                    defaultValue: "Add to Calendar",
                  })}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>

    {/* Gallery modal */}
    {showGallery && (
      <SlotGalleryModal slot={slot} onClose={() => setShowGallery(false)} />
    )}
    </>
  );
};

export default TripSlotCard;
