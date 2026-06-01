import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "antd";
import { AVAILABLE_CURRENCIES } from "@/utils/currency";
import { formatTripPlanDisplayName } from "@/utils/trips/formatTripPlanDisplayName";
import styles from "@/pages/shared/TripPlanner.module.css";

const DAY_OPTIONS = [1, 2, 3, 5, 7, 10, 14];
const INTEREST_OPTIONS = [
  { emoji: "🍜", key: "Food" },
  { emoji: "🏛️", key: "Culture" },
  { emoji: "🌿", key: "Nature" },
  { emoji: "🎨", key: "Art" },
  { emoji: "🧗", key: "Adventure" },
  { emoji: "✨", key: "Luxury" },
  { emoji: "🌙", key: "Nightlife" },
  { emoji: "👨‍👩‍👧‍👦", key: "Family" },
];

const getBudgetAnchors = (days, persons) => {
  const d = Math.max(1, Number(days) || 3);
  const p = Math.max(1, Number(persons) || 1);
  return [
    { key: "budget",   emoji: "🎒", label: "Budget",   mult: 30 },
    { key: "moderate", emoji: "✈️", label: "Moderate",  mult: 80 },
    { key: "comfort",  emoji: "🏨", label: "Comfort",   mult: 150 },
  ].map((tier) => ({ ...tier, amount: Math.round(d * p * tier.mult) }));
};

const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

export const TripPlannerFormPanel = ({
  budgetTooLow,
  cities,
  countries,
  currencies,
  loadingCurrencies,
  formData,
  generating,
  isAuthenticated,
  loadingCities,
  loadingCountries,
  loadingPlans,
  onResetForm,
  onBudgetChange,
  onCityChange,
  onCountryChange,
  onCurrencyChange,
  onDaysChange,
  onStartDateChange,
  onDeletePlan,
  onInterestChange,
  onLoadPlan,
  onPersonsChange,
  onSubmit,
  savedPlans,
  selectedCountryId,
  tags,
  formatDate,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [customBudget, setCustomBudget] = useState(false);

  const currencyCode   = formData?.currencyCode || "ILS";
  const days           = Number(formData?.days)    || 3;
  const persons        = Number(formData?.persons) || 1;
  const budget         = Number(formData?.budget)  || 0;
  const interestCount  = Array.isArray(formData?.interests) ? formData.interests.length : 0;

  const anchors = useMemo(() => getBudgetAnchors(days, persons), [days, persons]);

  const countryOptions = countries.map((c) => ({ label: c.name, value: c.id }));
  const cityOptions = cities.map((city) => {
    const cityLabel = city.stateName ? `${city.name} (${city.stateName})` : city.name;
    const countryName = city.country?.name ?? city.countryName ?? "";
    return {
      label: countryName ? `${cityLabel} — ${countryName}` : cityLabel,
      value: city.id,
    };
  });
  const currencyOptions =
    Array.isArray(currencies) && currencies.length > 0
      ? currencies.map((c) => ({ label: c.name ? `${c.code} — ${c.name}` : c.code, value: c.code }))
      : AVAILABLE_CURRENCIES;

  const hasSelectedCity = cityOptions.some((c) => c.value === formData?.cityId);
  const cityValue = selectedCountryId && hasSelectedCity ? formData.cityId || undefined : undefined;
  const canGenerate = !generating && !!formData?.cityId && !!formData?.days && formData?.budget != null;

  const syntheticChange = (value) => ({ target: { value: String(value) } });
  const handleDayPill = (d) => { onDaysChange(syntheticChange(d)); setCustomBudget(false); };
  const handleDecrease = () => persons > 1 && onPersonsChange(syntheticChange(persons - 1));
  const handleIncrease = () => persons < 20 && onPersonsChange(syntheticChange(persons + 1));
  const handleAnchor = (amt) => { setCustomBudget(false); onBudgetChange(syntheticChange(amt)); };
  const activeAnchor = customBudget ? null : anchors.find((a) => a.amount === budget)?.key ?? null;

  const mergedInterests = tags?.length > 0
    ? INTEREST_OPTIONS.filter((o) => tags.some((t) => t.name === o.key))
    : INTEREST_OPTIONS;

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <>
      {!isAuthenticated && (
        <div className={styles.guestNotice}>
          💡 {t("tripPlanner.form.guestNotice", { defaultValue: "Planning as a guest. Sign in to save trips permanently." })}
        </div>
      )}

      {/* Step progress indicators */}
      <div className={styles.wizardSteps}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`${styles.wizardDot} ${s === step ? styles.wizardDotActive : ""} ${s < step ? styles.wizardDotDone : ""}`}
          />
        ))}
      </div>

      <form
        className={styles.wizard}
        onSubmit={(e) => { e.preventDefault(); if (canGenerate) onSubmit(formData); }}
      >
        {/* ═══ STEP 1: WHERE TO? ═══ */}
        {step === 1 && (
          <div className={styles.wizardStep}>
            <h2 className={styles.wizardTitle}>📍 Where to?</h2>
            <p className={styles.wizardHint}>Pick a country, then choose your city</p>
            <div className={styles.wizardField}>
              <Select
                value={selectedCountryId || undefined}
                options={countryOptions}
                onChange={onCountryChange}
                allowClear
                placeholder={loadingCountries ? "Loading countries…" : "Search country…"}
                disabled={loadingCountries || generating}
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: "100%" }}
                size="large"
              />
            </div>
            {selectedCountryId && (
              <div className={styles.wizardField}>
                <Select
                  value={cityValue}
                  options={cityOptions}
                  onChange={onCityChange}
                  allowClear
                  placeholder={loadingCities ? "Loading cities…" : "Then pick a city…"}
                  disabled={loadingCities || generating}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: "100%" }}
                  size="large"
                />
              </div>
            )}
            <div className={styles.wizardNav}>
              <button
                type="button"
                className={styles.wizardNext}
                onClick={handleNext}
                disabled={!hasSelectedCity}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: HOW'S THE TRIP? ═══ */}
        {step === 2 && (
          <div className={styles.wizardStep}>
            <h2 className={styles.wizardTitle}>⏱️ How's the trip?</h2>

            <div className={styles.wizardSub}>
              <label className={styles.wizardLabel}>Days</label>
              <div className={styles.dayPills}>
                {DAY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`${styles.dayPill} ${days === d ? styles.dayPillActive : ""}`}
                    onClick={() => handleDayPill(d)}
                    disabled={generating}
                    aria-pressed={days === d}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.wizardSub}>
              <label className={styles.wizardLabel}>Start date</label>
              <input
                type="date"
                className={`ant-input ${styles.customBudgetInput}`}
                value={formData?.startDate ?? ""}
                onChange={onStartDateChange}
                disabled={generating}
                min={getTomorrow()}
              />
            </div>

            <div className={styles.wizardSub}>
              <label className={styles.wizardLabel}>Travelers</label>
              <div className={styles.stepper}>
                <button type="button" className={styles.stepperBtn} onClick={handleDecrease} disabled={generating || persons <= 1}>−</button>
                <span className={styles.stepperValue}>{persons}</span>
                <button type="button" className={styles.stepperBtn} onClick={handleIncrease} disabled={generating || persons >= 20}>+</button>
              </div>
            </div>

            <div className={styles.wizardSub}>
              <label className={styles.wizardLabel}>Budget ({currencyCode})</label>
              <div className={styles.budgetAnchors}>
                {anchors.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    className={`${styles.budgetAnchor} ${activeAnchor === a.key ? styles.budgetAnchorActive : ""}`}
                    onClick={() => handleAnchor(a.amount)}
                    disabled={generating}
                    aria-pressed={activeAnchor === a.key}
                  >
                    <span className={styles.budgetAnchorEmoji}>{a.emoji}</span>
                    <span className={styles.budgetAnchorLabel}>{a.label}</span>
                    <span className={styles.budgetAnchorAmount}>{a.amount.toLocaleString()} {currencyCode}</span>
                  </button>
                ))}
              </div>
              <button type="button" className={`${styles.zfChip} ${customBudget ? styles.zfChipActive : ""}`} onClick={() => setCustomBudget((v) => !v)} disabled={generating}>
                {customBudget ? "▾ Custom amount" : "✏️ Custom"}
              </button>
              {customBudget && (
                <div className={styles.customBudgetRow}>
                  <input
                    type="number" min={1} step={1}
                    className={`ant-input ${styles.customBudgetInput}`}
                    value={formData?.budget ?? ""}
                    onChange={onBudgetChange}
                    disabled={generating}
                    placeholder={`Amount in ${currencyCode}`}
                    autoFocus
                  />
                  {budgetTooLow && <span className={styles.budgetWarning}>Low budget</span>}
                </div>
              )}
            </div>

            <div className={styles.wizardSub}>
              <label className={styles.wizardLabel}>Currency</label>
              <Select
                value={formData?.currencyCode || "ILS"}
                options={currencyOptions}
                onChange={(val) => onCurrencyChange({ target: { value: val } })}
                disabled={generating || loadingCurrencies}
                style={{ width: "100%" }}
                size="large"
              />
            </div>

            <div className={styles.wizardNav}>
              <button type="button" className={styles.wizardBack} onClick={handleBack}>← Back</button>
              <button type="button" className={styles.wizardNext} onClick={handleNext}>Next →</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: WHAT DO YOU LOVE? ═══ */}
        {step === 3 && (
          <div className={styles.wizardStep}>
            <h2 className={styles.wizardTitle}>🎯 What do you love?</h2>
            <p className={styles.wizardHint}>Pick what matters for your trip</p>

            <div className={styles.interestBadges}>
              {mergedInterests.map((opt) => {
                const selected = formData?.interests?.includes(opt.key) ?? false;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`${styles.interestBadge} ${selected ? styles.interestBadgeActive : ""}`}
                    onClick={() => onInterestChange(opt.key)}
                    disabled={generating}
                    aria-pressed={selected}
                  >
                    {opt.emoji} {opt.key}
                  </button>
                );
              })}
            </div>

            {tags?.length > 0 && (
              <div className={styles.interestBadges}>
                {tags.filter((t) => !mergedInterests.some((m) => m.key === t.name)).map((tag) => {
                  const selected = formData?.interests?.includes(tag.name) ?? false;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`${styles.interestBadge} ${selected ? styles.interestBadgeActive : ""}`}
                      onClick={() => onInterestChange(tag.name)}
                      disabled={generating}
                      aria-pressed={selected}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}

            <div className={styles.wizardNav}>
              <button type="button" className={styles.wizardBack} onClick={handleBack}>← Back</button>
              <button
                type="submit"
                className={styles.wizardGenerate}
                disabled={!canGenerate}
              >
                {generating ? "Generating…" : "✨ Generate my trip"}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Saved trips */}
      {isAuthenticated && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}><h2>{t("tripPlanner.savedTrips.title")}</h2></div>
          {loadingPlans && <div className={styles.muted}>{t("tripPlanner.savedTrips.loading")}</div>}
          {!loadingPlans && savedPlans.length === 0 && (
            <div className={styles.emptyState}>
              <strong>{t("tripPlanner.savedTrips.emptyTitle", { defaultValue: "No saved trips yet" })}</strong>
              <p>{t("tripPlanner.savedTrips.emptyHint", { defaultValue: "Generate your first trip to see it here." })}</p>
            </div>
          )}
          {!loadingPlans && savedPlans.length > 0 && (
            <div className={styles.savedList}>
              {savedPlans.map((plan) => (
                <div key={plan.id} role="button" tabIndex={0} className={styles.savedItem} onClick={() => void onLoadPlan(plan)} onKeyDown={(e) => { if (e.key === "Enter") void onLoadPlan(plan); }}>
                  <div className={styles.savedItemContent}>
                    <strong>{formatTripPlanDisplayName(plan, t)}</strong>
                    <div className={styles.savedMeta}>
                      <span>{formatDate(plan.createdAt)}</span>
                      <span>{plan.days} {t("tripPlanner.form.days")}</span>
                      <span>{plan.budget} {formData?.currencyCode || "ILS"}</span>
                    </div>
                  </div>
                  <button type="button" className={styles.savedDeleteButton} onClick={(e) => { e.stopPropagation(); void onDeletePlan(plan.id); }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TripPlannerFormPanel;
