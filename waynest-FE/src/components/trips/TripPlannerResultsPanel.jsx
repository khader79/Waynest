/**
 * TripPlannerResultsPanel - Refactored results component
 * Uses CSS Modules for styling
 */

import { useTranslation } from "react-i18next";
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
  onViewEvent,
  onOpenCalendar,
  publicShareUrl,
  publishing,
  shareTitle,
  shareVisibility,
  setShareTitle,
  setShareVisibility,
  resultsRef,
  tripPlan,
  formData,
  onUpdateTripPlan,
}) => {
  const { t } = useTranslation();
  const targetCurrency = formData?.currencyCode || "ILS";
  const activeInterests = Array.isArray(formData?.interests)
    ? formData.interests.filter(Boolean)
    : [];
  const tripSignals = [
    formData?.days
      ? t("tripPlanner.results.signalDayRoute", "{{days}} day route", { days: formData.days })
      : null,
    formData?.persons
      ? t("tripPlanner.results.signalTravelers", "{{count}} travelers", { count: formData.persons })
      : null,
    targetCurrency
      ? t("tripPlanner.results.signalBudgetShown", "Budget shown in {{currency}}", { currency: targetCurrency })
      : null,
    activeInterests.length > 0
      ? t("tripPlanner.results.signalInterests", "{{count}} interests selected", { count: activeInterests.length })
      : t("tripPlanner.results.balancedDiscoveryMix", "Balanced discovery mix"),
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
              <h2>{t("tripPlanner.results.tripSummary", "Trip Summary")}</h2>
              <button
                type="button"
                className={styles.newPlanButton}
                onClick={onClearPlan}>
                {t("tripPlanner.results.newPlan", "New Plan")}
              </button>
            </div>

            <div className={styles.summaryInfo}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>
                  {t("tripPlanner.results.totalEstimatedCostLabel", "Total Estimated Cost:")}
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
                <span className={styles.summaryLabel}>{t("tripPlanner.results.daysLabel", "Days:")}</span>
                <span className={styles.summaryValue}>
                  {tripPlan.days.length}
                </span>
              </div>
            </div>

            <div className={styles.explainCard}>
              <div className={styles.explainHeader}>
                <div>
                  <span className={styles.explainEyebrow}>
                    {t("tripPlanner.results.howAiBuiltEyebrow", "How the AI built this route")}
                  </span>
                  <h3>
                    {t("tripPlanner.results.howAiBuiltTitle", "Waynest used your trip inputs plus live catalog signals")}
                  </h3>
                </div>
              </div>
              <p className={styles.explainText}>
                {t("tripPlanner.results.howAiBuiltDesc", "The planner combined your destination, group size, budget, interests, place pricing, opening hours, and matching events to create a route that stays practical instead of generic.")}
              </p>
              <div className={styles.explainGrid}>
                <article className={styles.explainItem}>
                  <strong>{t("tripPlanner.results.destinationFit", "Destination fit")}</strong>
                  <span>
                    {t("tripPlanner.results.destinationFitDesc", "Places were chosen around your selected city and filtered by real availability.")}
                  </span>
                </article>
                <article className={styles.explainItem}>
                  <strong>{t("tripPlanner.results.budgetAwareness", "Budget awareness")}</strong>
                  <span>
                    {t("tripPlanner.results.budgetAwarenessDesc", "Costs are estimated per slot so you can see whether the route fits the trip shape.")}
                  </span>
                </article>
                <article className={styles.explainItem}>
                  <strong>{t("tripPlanner.results.editableOutput", "Editable output")}</strong>
                  <span>
                    {t("tripPlanner.results.editableOutputDesc", "You can review every stop, change currency display, save, publish, or remix the itinerary.")}
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
                <h3>{t("tripPlanner.results.shareTitle")}</h3>
                <p>{t("tripPlanner.results.chooseTripNameFirst")}</p>
              </div>
              <div className={styles.shareFields}>
                <div className={styles.inputGroup}>
                  <label htmlFor="shareTitle">{t("tripPlanner.results.tripNameLabel")}</label>
                  <input
                    id="shareTitle"
                    type="text"
                    className="ant-input"
                    value={shareTitle || ""}
                    onChange={(event) => setShareTitle?.(event.target.value)}
                    placeholder={t("tripPlanner.results.tripNamePlaceholder")}
                    maxLength={100}
                    disabled={publishing}
                    aria-required="true"
                  />
                  <small className={styles.inputHint}>
                    {t("tripPlanner.results.tripNameHint")}
                  </small>
                </div>

                <div className={styles.inputGroup}>
                  <label>{t("tripPlanner.results.visibilityLabel", "Visibility")}</label>
                  <div className={styles.shareVisibilityGroup}>
                    <button
                      type="button"
                      className={`${styles.shareVisibilityButton} ${shareVisibility === "FRIENDS" ? styles.shareVisibilityButtonActive : ""}`}
                      onClick={() => setShareVisibility?.("FRIENDS")}
                      disabled={publishing}>
                      {t("tripPlanner.results.friendsOnly", "Friends only")}
                    </button>
                    <button
                      type="button"
                      className={`${styles.shareVisibilityButton} ${shareVisibility === "PUBLIC" ? styles.shareVisibilityButtonActive : ""}`}
                      onClick={() => setShareVisibility?.("PUBLIC")}
                      disabled={publishing}>
                      {t("tripPlanner.results.visibilityPublic", "Public")}
                    </button>
                  </div>
                  <small className={styles.inputHint}>
                    {t("tripPlanner.results.visibilityHint", "Friends-only plans stay inside Waynest for people you are connected with. Public plans appear in browse pages.")}
                  </small>
                </div>
              </div>
              <div className={styles.shareActions}>
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={() => void onPublishPlan()}
                  disabled={publishing || !isAuthenticated || !shareTitle?.trim()}>
                  {publishing
                    ? t("tripPlanner.results.publishing", "Publishing...")
                    : !isAuthenticated
                      ? t("tripPlanner.results.loginToSaveShare", "Login to Save & Share")
                      : !shareTitle?.trim()
                        ? t("tripPlanner.results.enterTripName", "Enter a trip name")
                      : hasShareLink
                        ? t("tripPlanner.results.republishCopy", "Republish & Copy")
                        : t("tripPlanner.results.publishCopyLink", "Publish & Copy Link")}
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  style={{ minWidth: "160px" }}
                  onClick={() => void onCopyShareLink()}
                  disabled={publishing || !shareTitle?.trim()}>
                  {!isAuthenticated
                    ? t("tripPlanner.results.loginRequired", "Login Required")
                    : !shareTitle?.trim()
                      ? t("tripPlanner.results.nameRequired", "Name Required")
                    : hasShareLink
                      ? t("tripPlanner.results.copyLink", "Copy Link")
                      : t("tripPlanner.results.publishFirst", "Publish First")}
                </button>
              </div>
              {hasShareLink && (
                <div className={styles.shareLink}>
                  <span>{t("tripPlanner.results.shareLinkLabel", "Share link")}</span>
                  <a href={publicShareUrl} target="_blank" rel="noreferrer">
                    {publicShareUrl}
                  </a>
                </div>
              )}
            </div>

            {Array.isArray(tripPlan.tips) && tripPlan.tips.length > 0 && (
              <div className={styles.tipsSection}>
                <h3>{t("tripPlanner.results.tipsTitle", "Tips")}</h3>
                <ul className={styles.tipsList}>
                  {tripPlan.tips.map((tip, index) => (
                    <li key={`${tip}-${index}`}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={styles.summaryActions}>
            <button
              type="button"
              className={styles.secondaryActionButton}
              onClick={() => onOpenCalendar?.()}>
              {t("tripPlanner.results.openCalendarPage", "Open Calendar Page")}
            </button>
          </div>

          <div className={styles.daysContainer}>
            {tripPlan.days.map((day) => (
              <div key={day.day} className={styles.dayCard}>
                <h3 className={styles.dayTitle}>{t("tripPlanner.results.day", { number: day.day })}</h3>
                <div className={styles.dayCost}>
                  {t("tripPlanner.results.totalDayCost", "Total Day Cost:")}{" "}
                  {convertAmount(
                    day.totalDayCost,
                    tripPlan.currencyCode || "ILS",
                    targetCurrency,
                  ).toFixed(2)}{" "}
                  {targetCurrency}
                </div>

                <div className={styles.slotsContainer}>
                  <TripSlotCard
                    label={t("tripPlanner.results.morning")}
                    className={styles.morning}
                    slot={day.morning}
                    dayIndex={day.day - 1}
                    slotKey="morning"
                    scheduledDate={day.date}
                    selectedCurrency={targetCurrency}
                    onUpdateSlotCurrency={handleUpdateSlotCurrency}
                    onViewPlace={onViewPlace}
                    onViewEvent={onViewEvent}
                    onAddWishlist={onAddWishlist}
                  />

                  <TripSlotCard
                    label={t("tripPlanner.results.afternoon")}
                    className={styles.afternoon}
                    slot={day.afternoon}
                    dayIndex={day.day - 1}
                    slotKey="afternoon"
                    scheduledDate={day.date}
                    selectedCurrency={targetCurrency}
                    onUpdateSlotCurrency={handleUpdateSlotCurrency}
                    onViewPlace={onViewPlace}
                    onViewEvent={onViewEvent}
                    onAddWishlist={onAddWishlist}
                  />

                  <TripSlotCard
                    label={t("tripPlanner.results.evening")}
                    className={styles.evening}
                    slot={day.evening}
                    dayIndex={day.day - 1}
                    slotKey="evening"
                    scheduledDate={day.date}
                    selectedCurrency={targetCurrency}
                    onUpdateSlotCurrency={handleUpdateSlotCurrency}
                    onViewPlace={onViewPlace}
                    onViewEvent={onViewEvent}
                    onAddWishlist={onAddWishlist}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>{t("tripPlanner.results.emptyTitle", "Your AI itinerary will appear here")}</strong>
          <p>
            {t("tripPlanner.results.emptyDesc", "Fill in the planner on the left and Waynest will generate a day-by-day route with places, costs, hours, and tips.")}
          </p>
        </div>
      )}
    </div>
  );
};

export default TripPlannerResultsPanel;
