/**
 * TripPlannerResultsPanel - Refactored results component
 * Uses CSS Modules for styling
 */

import "react";

import styles from "@/pages/shared/TripPlanner.module.css";
import TripSkeleton from "./TripSkeleton";
import TripSlotCard from "./TripSlotCard";

export const TripPlannerResultsPanel = ({
  generating,
  finishAnimation,
  onSkeletonFinish,
  hasShareLink,
  isAuthenticated,
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
}) => (
  <div className={styles.resultsContainer} ref={resultsRef}>
    {generating ? (
      <TripSkeleton
        days={formData?.days || 3}
        finish={finishAnimation}
        onFinish={onSkeletonFinish}
      />
    ) : tripPlan ? (
      <div className={styles.resultsContainer}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <h2>Trip Summary</h2>
            <button
              type="button"
              className={styles.newPlanButton}
              onClick={onClearPlan}>
              New Plan
            </button>
          </div>

          <div className={styles.summaryInfo}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total Estimated Cost:</span>
              <span className={styles.summaryValue}>
                {tripPlan.totalEstimatedCost.toFixed(2)} ILS
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Days:</span>
              <span className={styles.summaryValue}>
                {tripPlan.days.length}
              </span>
            </div>
          </div>

          <div className={styles.shareCard}>
            <div className={styles.shareContent}>
              <h3>Share this itinerary</h3>
              <p>
                Publish a public link so friends can copy and remix the trip.
              </p>
            </div>
            <div className={styles.shareActions}>
              <button
                type="button"
                className={styles.submitButton}
                onClick={() => void onPublishPlan()}
                disabled={publishing || !isAuthenticated}>
                {publishing
                  ? "Publishing..."
                  : !isAuthenticated
                    ? "Login to Save & Share"
                    : hasShareLink
                      ? "Republish & Copy"
                      : "Publish & Copy Link"}
              </button>
              <button
                type="button"
                className={styles.actionButton}
                style={{ minWidth: "160px" }}
                onClick={() => void onCopyShareLink()}
                disabled={publishing}>
                {!isAuthenticated
                  ? "Login Required"
                  : hasShareLink
                    ? "Copy Link"
                    : "Publish First"}
              </button>
            </div>
            {hasShareLink && (
              <div className={styles.shareLink}>
                <span>Public link</span>
                <a href={publicShareUrl} target="_blank" rel="noreferrer">
                  {publicShareUrl}
                </a>
              </div>
            )}
          </div>

          {tripPlan.tips.length > 0 && (
            <div className={styles.tipsSection}>
              <h3>Tips</h3>
              <ul className={styles.tipsList}>
                {tripPlan.tips.map((tip, index) => (
                  <li key={`${tip}-${index}`}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.daysContainer}>
          {tripPlan.days.map((day) => (
            <div key={day.day} className={styles.dayCard}>
              <h3 className={styles.dayTitle}>Day {day.day}</h3>
              <div className={styles.dayCost}>
                Total Day Cost: {day.totalDayCost.toFixed(2)} ILS
              </div>

              <div className={styles.slotsContainer}>
                <TripSlotCard
                  label="Morning"
                  className={styles.morning}
                  slot={day.morning}
                  onViewPlace={onViewPlace}
                  onAddWishlist={onAddWishlist}
                />

                <TripSlotCard
                  label="Afternoon"
                  className={styles.afternoon}
                  slot={day.afternoon}
                  onViewPlace={onViewPlace}
                  onAddWishlist={onAddWishlist}
                />

                <TripSlotCard
                  label="Evening"
                  className={styles.evening}
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
      <div className={styles.emptyState}>
        <p>Fill out the form to generate your AI trip plan.</p>
      </div>
    )}
  </div>
);

export default TripPlannerResultsPanel;
