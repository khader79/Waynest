import { useState, useCallback, Suspense } from "react";
import { useTranslation } from "react-i18next";
import styles from "@/pages/shared/TripPlanner.module.css";
import TripSkeleton from "./TripSkeleton";
import TripSlotCard from "./TripSlotCard";
import { convertAmount } from "@/utils/currency";
import { replanTripDay, syncTripToCalendar } from "@/api/trips";
import { toast } from "react-toastify";

import TripMapModal   from "./TripMapModal";
import TripShareModal from "./TripShareModal";

/* ── Traveler profile meta — using design-system colours ──────── */
const PROFILE_META = {
  adventure:  { emoji: "🧗", label: "Adventure",   color: "var(--color-success, #1E6B4A)" },
  luxury:     { emoji: "💎", label: "Luxury",       color: "var(--color-accent, #7c5c1e)" },
  backpacker: { emoji: "🎒", label: "Backpacker",   color: "var(--color-secondary, #2C5F8A)" },
  family:     { emoji: "👨‍👩‍👧‍👦", label: "Family",       color: "var(--color-highlight, #2C5F8A)" },
  solo:       { emoji: "🧍", label: "Solo",         color: "var(--color-primary, #0F3D2E)" },
  couple:     { emoji: "💑", label: "Couple",       color: "var(--color-accent-warm, #8B2252)" },
  student:    { emoji: "🎓", label: "Student",      color: "var(--color-accent-strong, #1E6B4A)" },
  business:   { emoji: "💼", label: "Business",     color: "var(--color-secondary, #2C5F8A)" },
};

/* ── Quality score to label — design-system colours ────────────── */
function qualityLabel(score) {
  if (score >= 85) return { label: "Excellent", color: "var(--color-success, #1E6B4A)" };
  if (score >= 70) return { label: "Great",     color: "var(--color-primary, #0F3D2E)" };
  if (score >= 55) return { label: "Good",      color: "var(--color-secondary, #2C5F8A)" };
  if (score >= 40) return { label: "Fair",      color: "var(--sand, #8B6914)" };
  return               { label: "Basic",        color: "var(--color-error, #b91c1c)" };
}

/* ── Budget utilization bar ────────────────────────────────────── */
function BudgetBar({ estimated, budget, currency }) {
  const pct = budget > 0 ? Math.min(100, (estimated / budget) * 100) : 0;
  const over = estimated > budget;
  return (
    <div className={styles.budgetBarWrap}>
      <div className={styles.budgetBarTrack}>
        <div
          className={styles.budgetBarFill}
          style={{ width: `${pct}%`, background: over ? "#dc2626" : "#16a34a" }}
        />
      </div>
      <span className={styles.budgetBarPct} style={{ color: over ? "#dc2626" : "#16a34a" }}>
        {pct.toFixed(0)}% of budget {over ? "⚠ exceeded" : "used"}
      </span>
    </div>
  );
}

/* ── Budget breakdown mini-table ───────────────────────────────── */
function BudgetBreakdownPanel({ breakdown, currency }) {
  if (!breakdown) return null;
  const rows = [
    { label: "Food & Dining",    icon: "🍽️", value: breakdown.food },
    { label: "Attractions",      icon: "🏛️", value: breakdown.attractions },
    { label: "Local Transport",  icon: "🚌", value: breakdown.transport },
    { label: "Shopping",         icon: "🛍️", value: breakdown.shopping },
    { label: "Emergency Reserve",icon: "🛡️", value: breakdown.emergency },
  ];
  return (
    <div className={styles.budgetBreakdown}>
      <h4 className={styles.budgetBreakdownTitle}>Budget Allocation</h4>
      <div className={styles.budgetBreakdownRows}>
        {rows.map((r) => (
          <div key={r.label} className={styles.budgetBreakdownRow}>
            <span>{r.icon} {r.label}</span>
            <strong>{r.value?.toLocaleString()} {currency}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Weather pill for a day ────────────────────────────────────── */
function WeatherPill({ weather }) {
  if (!weather) return null;
  const isRainy = weather.toLowerCase().includes("rain") || weather.toLowerCase().includes("shower") || weather.toLowerCase().includes("drizzle");
  const isHot   = (() => {
    const m = weather.match(/(\d+)°C/);
    return m ? Number(m[1]) > 30 : false;
  })();
  const isCold  = (() => {
    const m = weather.match(/(\d+)°C/);
    return m ? Number(m[1]) < 10 : false;
  })();

  const icon = isRainy ? "🌧️" : isHot ? "☀️🔥" : isCold ? "🧥" : "☀️";
  const bg   = isRainy ? "#1e40af22" : isHot ? "#fef08a44" : isCold ? "#bfdbfe44" : "#dcfce744";

  return (
    <span className={styles.weatherPill} style={{ background: bg }}>
      {icon} {weather}
    </span>
  );
}

export const TripPlannerResultsPanel = ({
  generating,
  finishAnimation,
  onSkeletonFinish,
  hasShareLink,
  isAuthenticated,
  canUseCalendar,
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
  const [showShare,         setShowShare]         = useState(false);
  const [showExplain,       setShowExplain]       = useState(false);
  const [showBudget,        setShowBudget]        = useState(false);
  const [replanningDay,     setReplanningDay]     = useState(null);
  const [showMap,           setShowMap]           = useState(false);
  const [syncingCalendar,   setSyncingCalendar]   = useState(false);

  const calendarAllowed = typeof canUseCalendar === "boolean" ? canUseCalendar : isAuthenticated;
  const targetCurrency  = formData?.currencyCode || "ILS";

  /* ── Replan a single day ─────────────────────────────────────── */
  const handleReplanDay = useCallback(async (dayNumber) => {
    if (!tripPlan?.tripPlanId || !isAuthenticated) {
      toast.info("Save your trip first to use replanning.");
      return;
    }
    setReplanningDay(dayNumber);
    try {
      const updated = await replanTripDay(tripPlan.tripPlanId, { dayNumber, reason: "manual" });
      if (updated?.generatedPlan) {
        onUpdateTripPlan?.(updated.generatedPlan);
        toast.success(`Day ${dayNumber} replanned successfully!`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not replan this day.");
    } finally {
      setReplanningDay(null);
    }
  }, [tripPlan, isAuthenticated, onUpdateTripPlan]);

  /* ── Per-slot currency override ─────────────────────────────── */
  const handleUpdateSlotCurrency = (dayIndex, slotKey, newCurrency) => {
    if (!tripPlan || !onUpdateTripPlan) return;
    const next = {
      ...tripPlan,
      days: tripPlan.days.map((day, di) => {
        if (di !== dayIndex) return day;
        const updated = { ...day };
        if (updated[slotKey]) updated[slotKey] = { ...updated[slotKey], displayCurrency: newCurrency };
        return updated;
      }),
    };
    onUpdateTripPlan(next);
  };

  /* ── Skeleton while generating ───────────────────────────────── */
  if (generating) {
    return (
      <div className={styles.resultsContainer} ref={resultsRef}>
        <TripSkeleton days={formData?.days || 3} finish={finishAnimation} onFinish={onSkeletonFinish} />
      </div>
    );
  }

  /* ── Empty state ─────────────────────────────────────────────── */
  if (!tripPlan) {
    return (
      <div className={styles.resultsContainer} ref={resultsRef}>
        <div className={styles.emptyState}>
          <strong>{t("tripPlanner.results.emptyTitle", "Your AI itinerary will appear here")}</strong>
          <p>{t("tripPlanner.results.emptyDesc", "Fill in the planner on the left and Waynest will generate a day-by-day route with places, costs, hours, and tips.")}</p>
        </div>
      </div>
    );
  }

  /* ── Derived values ──────────────────────────────────────────── */
  const profile    = PROFILE_META[tripPlan.travelerProfile] ?? null;
  const quality    = typeof tripPlan.confidenceScore === "number" ? qualityLabel(tripPlan.confidenceScore) : null;
  const breakdown  = tripPlan.budgetBreakdown ?? null;
  const budget     = Number(formData?.budget ?? 0);
  const estimated  = Number(tripPlan.totalEstimatedCost ?? 0);

  const signalPills = [
    formData?.days     ? `${formData.days} day route` : null,
    formData?.persons  ? `${formData.persons} traveler${formData.persons > 1 ? "s" : ""}` : null,
    targetCurrency     ? `${targetCurrency}` : null,
    profile            ? `${profile.emoji} ${profile.label}` : null,
  ].filter(Boolean);

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className={styles.resultsContainer} ref={resultsRef}>

      {/* ══════════════ SUMMARY CARD ══════════════ */}
      <div className={styles.summaryCard}>

        {/* Header */}
        <div className={styles.summaryHeader}>
          <h2>{t("tripPlanner.results.tripSummary", "Trip Summary")}</h2>
          <button type="button" className={styles.newPlanButton} onClick={onClearPlan}>
            {t("tripPlanner.results.newPlan", "New Plan")}
          </button>
        </div>

        {/* Intelligence badges row */}
        <div className={styles.intelligenceBadges}>
          {profile && (
            <span className={styles.profileBadge} style={{ borderColor: profile.color, color: profile.color }}>
              {profile.emoji} {profile.label} Traveler
            </span>
          )}
          {quality && (
            <span className={styles.qualityBadge} style={{ background: quality.color + "22", color: quality.color }}>
              ⭐ {quality.label} Plan · {tripPlan.confidenceScore}/100
            </span>
          )}
          {tripPlan.weatherSummary && (
            <span className={styles.weatherBadge}>
              🌤 Weather-aware
            </span>
          )}
        </div>

        {/* Cost + budget bar */}
        <div className={styles.summaryInfo}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Estimated Cost:</span>
            <span className={styles.summaryValue}>
              {convertAmount(estimated, tripPlan.currencyCode || "ILS", targetCurrency).toFixed(2)} {targetCurrency}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Your Budget:</span>
            <span className={styles.summaryValue}>{budget.toLocaleString()} {targetCurrency}</span>
          </div>
        </div>

        {budget > 0 && (
          <BudgetBar estimated={estimated} budget={budget} currency={targetCurrency} />
        )}

        {/* Signal pills */}
        <div className={styles.signalPills}>
          {signalPills.map((s) => (
            <span key={s} className={styles.signalPill}>{s}</span>
          ))}
        </div>

        {/* Budget breakdown toggle */}
        {breakdown && (
          <div style={{ marginTop: 12 }}>
            <button type="button" className={styles.explainToggleBtn}
              onClick={() => setShowBudget((v) => !v)}>
              <span>{showBudget ? "▾" : "▸"}</span> Budget breakdown
            </button>
            {showBudget && <BudgetBreakdownPanel breakdown={breakdown} currency={targetCurrency} />}
          </div>
        )}

        {/* How AI built this */}
        <div style={{ marginTop: 12 }}>
          <button type="button" className={styles.explainToggleBtn}
            onClick={() => setShowExplain((v) => !v)}>
            <span>{showExplain ? "▾" : "▸"}</span>
            {t("tripPlanner.results.howAiBuiltEyebrow", "How Waynest built this route")}
          </button>
          {showExplain && (
            <div className={styles.explainCard} style={{ marginTop: 10 }}>
              <p className={styles.explainText}>
                This itinerary was built using a multi-layer intelligence pipeline:
                destination scoring (rating + interest match + weather compatibility + budget fit),
                day-of-week opening hours validation, 5-day weather forecast adaptation,
                traveler profile behavioral rules, and geographic route optimization.
              </p>
              <div className={styles.explainGrid}>
                <article className={styles.explainItem}>
                  <strong>Scoring Engine</strong>
                  <span>Each place scored 0–100 by rating, interest match, weather compat, and budget fit.</span>
                </article>
                <article className={styles.explainItem}>
                  <strong>Weather Intelligence</strong>
                  <span>5-day forecast per trip day — rainy days prefer indoor venues automatically.</span>
                </article>
                <article className={styles.explainItem}>
                  <strong>Opening Hours Guard</strong>
                  <span>Places are never scheduled on days they're closed.</span>
                </article>
                <article className={styles.explainItem}>
                  <strong>Profile Personalization</strong>
                  <span>{profile ? `${profile.label} profile: specific venue types and pacing rules applied.` : "Balanced discovery itinerary."}</span>
                </article>
              </div>
            </div>
          )}
        </div>

        {/* Tips */}
        {Array.isArray(tripPlan.tips) && tripPlan.tips.length > 0 && (
          <div className={styles.tipsSection}>
            <h3>{t("tripPlanner.results.tipsTitle", "Tips")}</h3>
            <ul className={styles.tipsList}>
              {tripPlan.tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        )}

        {/* ── ACTION BAR ── */}
        <div className={styles.actionBar}>
          <button type="button" className={`${styles.actionBarBtn} ${styles.actionBarBtnMap}`}
            onClick={() => setShowMap(true)}>
            🗺 Map
          </button>
          {calendarAllowed && (
            <button type="button" className={styles.actionBarBtn}
              onClick={() => onOpenCalendar?.()}>
              📅 View Calendar
            </button>
          )}
          {calendarAllowed && isAuthenticated && tripPlan.tripPlanId && (
            <button type="button"
              className={styles.actionBarBtn}
              disabled={syncingCalendar}
              onClick={async () => {
                setSyncingCalendar(true);
                try {
                  const r = await syncTripToCalendar(tripPlan.tripPlanId);
                  toast.success(`✅ ${r.days} days synced to your calendar!`);
                } catch { toast.error("Could not sync to calendar"); }
                finally { setSyncingCalendar(false); }
              }}>
              {syncingCalendar ? "⟳ Syncing…" : "🗓 Add to Calendar"}
            </button>
          )}
          {isAuthenticated && (
            <button type="button"
              className={`${styles.actionBarBtn} ${showShare ? styles.actionBarBtnActive : ""}`}
              onClick={() => setShowShare(true)}>
              🔗 Share
            </button>
          )}
        </div>

        {/* ── SHARE MODAL ── */}
        {showShare && (
          <TripShareModal
              tripPlan={tripPlan}
              shareTitle={shareTitle}
              setShareTitle={setShareTitle}
              publicShareUrl={publicShareUrl}
              hasShareLink={hasShareLink}
              onPublishPlan={onPublishPlan}
              publishing={publishing}
              onClose={() => setShowShare(false)}
            />
        )}
      </div>

      {/* ══════════════ MAP MODAL ══════════════ */}
      {showMap && (
        <TripMapModal
          tripPlanId={tripPlan.tripPlanId ?? null}
          tripPlan={tripPlan}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* ══════════════ DAY CARDS ══════════════ */}
      <div className={styles.daysContainer}>
        {tripPlan.days.map((day) => {
          const isReplanning = replanningDay === day.day;
          return (
            <div key={day.day} className={styles.dayCard}>

              {/* Day header */}
              <div className={styles.dayHeader}>
                <div className={styles.dayHeaderLeft}>
                  <h3 className={styles.dayTitle}>
                    {t("tripPlanner.results.day", { number: day.day })}
                    {day.date && (
                      <span className={styles.dayDate}>
                        {new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    )}
                  </h3>
                  {day.weather && <WeatherPill weather={day.weather} />}
                </div>
                <div className={styles.dayHeaderRight}>
                  <span className={styles.dayCost}>
                    {convertAmount(day.totalDayCost, tripPlan.currencyCode || "ILS", targetCurrency).toFixed(2)} {targetCurrency}
                  </span>
                  {isAuthenticated && tripPlan.tripPlanId && (
                    <button
                      type="button"
                      className={styles.replanButton}
                      onClick={() => void handleReplanDay(day.day)}
                      disabled={isReplanning}
                      title="Replace this day with fresh alternatives"
                    >
                      {isReplanning ? "⟳" : "🔄"} {isReplanning ? "Replanning…" : "Replan"}
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.slotsContainer}>
                {["morning", "afternoon", "evening"].map((slotKey) => (
                  <TripSlotCard
                    key={slotKey}
                    label={t(`tripPlanner.results.${slotKey}`)}
                    className={styles[slotKey]}
                    slot={day[slotKey]}
                    dayIndex={day.day - 1}
                    slotKey={slotKey}
                    scheduledDate={day.date}
                    selectedCurrency={targetCurrency}
                    onUpdateSlotCurrency={handleUpdateSlotCurrency}
                    onViewPlace={onViewPlace}
                    onViewEvent={onViewEvent}
                    onAddWishlist={onAddWishlist}
                    canUseCalendar={calendarAllowed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TripPlannerResultsPanel;
