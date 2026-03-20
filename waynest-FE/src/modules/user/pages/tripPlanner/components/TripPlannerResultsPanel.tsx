import type { RefObject } from "react";
import { TripSlotCard } from "./TripSlotCard";
import { EnhancedSkeletonLoader } from "./AdvancedSkeleton";
import type { TripPlanView } from "../tripPlanner.types";

type TripPlannerResultsPanelProps = {
  generating: boolean;
  hasShareLink: boolean;
  onAddWishlist: (placeId: string) => void;
  onClearPlan: () => void;
  onCopyShareLink: () => void;
  onPublishPlan: () => void;
  onViewPlace: (placeId: string) => void;
  publicShareUrl: string;
  publishing: boolean;
  resultsRef: RefObject<HTMLDivElement | null>;
  tripPlan: TripPlanView | null;
  formData?: {
    days?: number;
    budget?: number;
    persons?: number;
  };
};

export const TripPlannerResultsPanel = ({
  generating,
  hasShareLink,
  onAddWishlist,
  onClearPlan,
  onCopyShareLink,
  onPublishPlan,
  onViewPlace,
  publicShareUrl,
  publishing,
  resultsRef,
  tripPlan,
  formData,
}: TripPlannerResultsPanelProps) => (
  <div className="trip-planner-results" ref={resultsRef}>
    {generating ? (
      <EnhancedSkeletonLoader days={formData?.days || 3} />
    ) : tripPlan ? (
      <div className="trip-plan-results">
        <div className="trip-summary-card">
          <div className="trip-summary-head">
            <h2>Trip Summary</h2>
            <button type="button" className="generate-button" onClick={onClearPlan}>
              New Plan
            </button>
          </div>

          <div className="summary-info">
            <div className="summary-item">
              <span className="summary-label">Total Estimated Cost:</span>
              <span className="summary-value">
                {tripPlan.totalEstimatedCost.toFixed(2)} ILS
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Days:</span>
              <span className="summary-value">{tripPlan.days.length}</span>
            </div>
          </div>

          <div className="trip-share-card">
            <div className="trip-share-copy">
              <h3>Share this itinerary</h3>
              <p>Publish a public link so friends can copy and remix the trip.</p>
            </div>
            <div className="trip-share-actions">
              <button
                type="button"
                className="generate-button trip-share-primary"
                onClick={() => void onPublishPlan()}
                disabled={publishing}>
                {publishing
                  ? "Publishing..."
                  : hasShareLink
                    ? "Republish & Copy"
                    : "Publish & Copy Link"}
              </button>
              <button
                type="button"
                className="action-button trip-share-secondary"
                onClick={() => void onCopyShareLink()}
                disabled={publishing}>
                {hasShareLink ? "Copy Link" : "Publish First"}
              </button>
            </div>
            {hasShareLink && (
              <div className="trip-share-link">
                <span>Public link</span>
                <a href={publicShareUrl} target="_blank" rel="noreferrer">
                  {publicShareUrl}
                </a>
              </div>
            )}
          </div>

          {tripPlan.tips.length > 0 && (
            <div className="tips-section">
              <h3>Tips</h3>
              <ul className="tips-list">
                {tripPlan.tips.map((tip, index) => (
                  <li key={`${tip}-${index}`}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="trip-days">
          {tripPlan.days.map((day) => (
            <div key={day.day} className="trip-day-card">
              <h3 className="day-title">Day {day.day}</h3>
              <div className="day-cost">
                Total Day Cost: {day.totalDayCost.toFixed(2)} ILS
              </div>

              <div className="trip-slots">
                <TripSlotCard
                  label="Morning"
                  className="morning"
                  slot={day.morning}
                  onViewPlace={onViewPlace}
                  onAddWishlist={onAddWishlist}
                />
                <TripSlotCard
                  label="Afternoon"
                  className="afternoon"
                  slot={day.afternoon}
                  onViewPlace={onViewPlace}
                  onAddWishlist={onAddWishlist}
                />
                <TripSlotCard
                  label="Evening"
                  className="evening"
                  slot={day.evening}
                  onViewPlace={onViewPlace}
                  onAddWishlist={onAddWishlist}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="empty-state">
        <p>Fill out the form to generate your AI trip plan.</p>
      </div>
    )}
  </div>
);
