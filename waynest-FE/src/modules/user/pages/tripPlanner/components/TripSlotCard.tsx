import type { TripSlot } from "../tripPlanner.types";

type TripSlotCardProps = {
  label: string;
  slot: TripSlot | null;
  className: string;
  onViewPlace: (placeId: string) => void;
  onAddWishlist: (placeId: string) => void;
};

export const TripSlotCard = ({
  className,
  label,
  onAddWishlist,
  onViewPlace,
  slot,
}: TripSlotCardProps) => {
  if (!slot) {
    return (
      <div className={`trip-slot ${className}`}>
        <div className="slot-header">
          <span className="slot-time">{label}</span>
        </div>
        <div className="slot-content">
          <p className="slot-name">No suitable place found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`trip-slot ${className}`}>
      <div className="slot-header">
        <span className="slot-time">{label}</span>
        <span className="slot-duration">{slot.duration}</span>
      </div>
      <div className="slot-content">
        <h4 className="slot-name">{slot.name}</h4>
        {slot.type && <span className="slot-type">{slot.type}</span>}
        <div className="slot-info">
          <span className="slot-cost">{slot.estimatedCost.toFixed(2)} ILS</span>
          {slot.openTime && slot.closeTime && (
            <span className="slot-hours">
              {slot.openTime} - {slot.closeTime}
            </span>
          )}
        </div>
        {slot.placeId && (
          <div className="slot-actions">
            <button
              className="action-button wishlist-button"
              type="button"
              onClick={() => onAddWishlist(slot.placeId!)}>
              Wishlist
            </button>
            <button
              className="action-button view-button"
              type="button"
              onClick={() => onViewPlace(slot.placeId!)}>
              View Place
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
