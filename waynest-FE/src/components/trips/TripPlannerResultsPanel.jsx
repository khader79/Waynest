/**
 * TripPlannerResultsPanel - Refactored results component
 * Uses CSS Modules for styling
 */

import React from "react";
import styles from "@/pages/shared/TripPlanner.module.css";
import TripSkeleton from "./TripSkeleton";
import TripSlotCard from "./TripSlotCard";
import { convertAmount } from "@/utils/currency";

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
  onUpdateTripPlan,
}) => {
  const targetCurrency = formData?.currencyCode || "ILS";
  const activeInterests = Array.isArray(formData?.interests)
    ? formData.interests.filter(Boolean)
    : [];
  const tripSignals = [
    formData?.days ? `${formData.days} day route` : null,
    formData?.persons ? `${formData.persons} traveler${formData.persons > 1 ? "s" : ""}` : null,
    targetCurrency ? `Budget shown in ${targetCurrency}` : null,
    activeInterests.length > 0
      ? `${activeInterests.length} interest${activeInterests.length > 1 ? "s" : ""} selected`
      : "Balanced discovery mix",
  ].filter(Boolean);

  const handleUpdateSlotCurrency = (dayIndex, slotKey, newCurrency) => {
    if (!tripPlan || !onUpdateTripPlan) return;
    const next = {
      ...tripPlan,
      days: tripPlan.days.map((day, di) => {
        if (di !== dayIndex) return day;
        const updated = { ...day };
        if (updated[slotKey]) {
          // store per-slot display currency (conversion target) without changing base currency
          updated[slotKey] = {
            ...updated[slotKey],
            displayCurrency: newCurrency,
          };
        }
        return updated;
      }),
    };
    onUpdateTripPlan(next);
  };

  return (
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
                <span className={styles.summaryLabel}>
                  Total Estimated Cost:
                </span>
                <span className={styles.summaryValue}>
                  {convertAmount(
                    tripPlan.totalEstimatedCost,
                    tripPlan.currencyCode || "ILS",
                    targetCurrency,
                  ).toFixed(2)}{" "}
                  {targetCurrency}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Days:</span>
                <span className={styles.summaryValue}>
                  {tripPlan.days.length}
                </span>
              </div>
            </div>

            <div className={styles.explainCard}>
              <div className={styles.explainHeader}>
                <div>
                  <span className={styles.explainEyebrow}>
                    How the AI built this route
                  </span>
                  <h3>Waynest used your trip inputs plus live catalog signals</h3>
                </div>
              </div>
              <p className={styles.explainText}>
                The planner combined your destination, group size, budget,
                interests, place pricing, opening hours, and matching events to
                create a route that stays practical instead of generic.
              </p>
              <div className={styles.explainGrid}>
                <article className={styles.explainItem}>
                  <strong>Destination fit</strong>
                  <span>
                    Places were chosen around your selected city and filtered by
                    real availability.
                  </span>
                </article>
                <article className={styles.explainItem}>
                  <strong>Budget awareness</strong>
                  <span>
                    Costs are estimated per slot so you can see whether the
                    route fits the trip shape.
                  </span>
                </article>
                <article className={styles.explainItem}>
                  <strong>Editable output</strong>
                  <span>
                    You can review every stop, change currency display, save,
                    publish, or remix the itinerary.
                  </span>
                </article>
              </div>
              <div className={styles.signalPills}>
                {tripSignals.map((signal) => (
                  <span key={signal} className={styles.signalPill}>
                    {signal}
                  </span>
                ))}
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

            {Array.isArray(tripPlan.tips) && tripPlan.tips.length > 0 && (
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
                  Total Day Cost:{" "}
                  {convertAmount(
                    day.totalDayCost,
                    tripPlan.currencyCode || "ILS",
                    targetCurrency,
                  ).toFixed(2)}{" "}
                  {targetCurrency}
                </div>

                <div className={styles.slotsContainer}>
                  <TripSlotCard
                    label="Morning"
                    className={styles.morning}
                    slot={day.morning}
                    dayIndex={day.day - 1}
                    slotKey="morning"
                    selectedCurrency={targetCurrency}
                    onUpdateSlotCurrency={handleUpdateSlotCurrency}
                    onViewPlace={onViewPlace}
                    onAddWishlist={onAddWishlist}
                  />

                  <TripSlotCard
                    label="Afternoon"
                    className={styles.afternoon}
                    slot={day.afternoon}
                    dayIndex={day.day - 1}
                    slotKey="afternoon"
                    selectedCurrency={targetCurrency}
                    onUpdateSlotCurrency={handleUpdateSlotCurrency}
                    onViewPlace={onViewPlace}
                    onAddWishlist={onAddWishlist}
                  />

                  <TripSlotCard
                    label="Evening"
                    className={styles.evening}
                    slot={day.evening}
                    dayIndex={day.day - 1}
                    slotKey="evening"
                    selectedCurrency={targetCurrency}
                    onUpdateSlotCurrency={handleUpdateSlotCurrency}
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
          <strong>Your AI itinerary will appear here</strong>
          <p>
            Fill in the planner on the left and Waynest will generate a
            day-by-day route with places, costs, hours, and tips.
          </p>
        </div>
      )}
    </div>
  );
};

export default TripPlannerResultsPanel;
