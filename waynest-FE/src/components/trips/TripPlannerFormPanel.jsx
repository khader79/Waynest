/**
 * TripPlannerFormPanel - Refactored form component
 * Uses CSS Modules for styling
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "antd";
// unused icon imports removed
import { AVAILABLE_CURRENCIES } from "@/utils/currency";
import { formatTripPlanDisplayName } from "@/utils/trips/formatTripPlanDisplayName";

import styles from "@/pages/shared/TripPlanner.module.css";

const QUICK_START_PRESETS = [
  {
    id: "weekend",
    labelKey: "tripPlanner.quickStart.weekend.label",
    summaryKey: "tripPlanner.quickStart.weekend.summary",
    icon: "🏖️",
    values: {
      days: 3,
      budget: 1400,
      persons: 2,
    },
    color: "#FF6B6B",
  },
  {
    id: "solo",
    labelKey: "tripPlanner.quickStart.solo.label",
    summaryKey: "tripPlanner.quickStart.solo.summary",
    icon: "🎒",
    values: {
      days: 4,
      budget: 1800,
      persons: 1,
    },
    color: "#4ECDC4",
  },
  {
    id: "group",
    labelKey: "tripPlanner.quickStart.group.label",
    summaryKey: "tripPlanner.quickStart.group.summary",
    icon: "🚀",
    values: {
      days: 5,
      budget: 3200,
      persons: 4,
    },
    color: "#95E1D3",
  },
  {
    id: "luxury",
    labelKey: "tripPlanner.quickStart.luxury.label",
    summaryKey: "tripPlanner.quickStart.luxury.summary",
    icon: "✨",
    values: {
      days: 5,
      budget: 5000,
      persons: 2,
    },
    color: "#FFD93D",
  },
  {
    id: "budget",
    labelKey: "tripPlanner.quickStart.budget.label",
    summaryKey: "tripPlanner.quickStart.budget.summary",
    icon: "💰",
    values: {
      days: 6,
      budget: 800,
      persons: 1,
    },
    color: "#A8E6CF",
  },
  {
    id: "family",
    labelKey: "tripPlanner.quickStart.family.label",
    summaryKey: "tripPlanner.quickStart.family.summary",
    icon: "👨‍👩‍👧‍👦",
    values: {
      days: 5,
      budget: 2500,
      persons: 4,
    },
    color: "#FF8B94",
  },
];

export const TripPlannerFormPanel = ({
  budgetTooLow,
  cities,
  countries,
  currencies,
  loadingCurrencies,
  formData,
  generating,
  isAuthenticated,
  canUseCalendar,
  loadingCities,
  loadingCountries,
  loadingPlans,
  onQuickStart,
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
  const calendarAllowed =
    typeof canUseCalendar === "boolean" ? canUseCalendar : isAuthenticated;
  const [addToCalendar, setAddToCalendar] = useState(Boolean(calendarAllowed));

  useEffect(() => {
    if (!calendarAllowed) {
      setAddToCalendar(false);
    }
  }, [calendarAllowed]);

  const formatCityOptionLabel = (city) => {
    const cityName = city.stateName
      ? `${city.name} (${city.stateName})`
      : city.name;
    const countryName = city.country?.name ?? city.countryName ?? "";
    return countryName ? `${cityName} - ${countryName}` : cityName;
  };

  const countryOptions = countries.map((country) => ({
    label: country.name,
    value: country.id,
  }));

  const currencyOptions =
    Array.isArray(currencies) && currencies.length > 0
      ? currencies.map((c) => ({
          label: c.name ? `${c.code} — ${c.name}` : c.code,
          value: c.code,
        }))
      : AVAILABLE_CURRENCIES;

  const cityOptions = cities.map((city) => ({
    label: formatCityOptionLabel(city),
    value: city.id,
  }));
  const hasSelectedCityOption = cityOptions.some(
    (city) => city.value === formData.cityId,
  );
  const cityValue =
    selectedCountryId && hasSelectedCityOption
      ? formData.cityId || undefined
      : undefined;

  const handleCitySelect = (value) => {
    onCityChange(value);
  };

  const handleCountrySelect = (value) => {
    onCountryChange(value);
  };

  return (
    <>
      {!isAuthenticated && (
        <div className={styles.guestNotice}>
          {t("tripPlanner.form.guestNotice")}
        </div>
      )}

      <section className={styles.formLeadCard}>
        <div className={styles.formLeadHeader}>
          <div>
            <span className={styles.formLeadEyebrow}>
              {t("tripPlanner.form.briefingEyebrow", {
                defaultValue: "AI route briefing",
              })}
            </span>
            <h2>
              {t("tripPlanner.form.briefingTitle", {
                defaultValue: "Give the planner just enough signal",
              })}
            </h2>
          </div>
          {onResetForm ? (
            <button
              type="button"
              className={styles.secondaryActionButton}
              onClick={onResetForm}
              disabled={generating}>
              {t("common.reset", { defaultValue: "Reset" })}
            </button>
          ) : null}
        </div>
        <p className={styles.formLeadText}>
          {t("tripPlanner.form.briefingText", {
            defaultValue:
              "Waynest combines your destination, budget, traveler count, and preferences with live catalog data to build an editable itinerary.",
          })}
        </p>

        {onQuickStart ? (
          <div className={styles.quickStartGrid}>
            {QUICK_START_PRESETS.map((preset) => (
              <button
                key={preset.labelKey}
                type="button"
                className={styles.quickStartButton}
                onClick={() => onQuickStart(preset.values)}
                disabled={generating}>
                <strong>{t(preset.labelKey)}</strong>
                <span>{t(preset.summaryKey)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ ...formData, addToCalendar });
        }}>
        <section className={styles.formBlock}>
          <div className={styles.formBlockHeader}>
            <span className={styles.formBlockIndex}>1</span>
            <div>
              <h3>{t("tripPlanner.form.destination")}</h3>
              <p>{t("tripPlanner.form.countryHint")}</p>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="country">
              {t("tripPlanner.form.selectCountry")}
            </label>
            <Select
              className="custom-placeholder"
              id="country"
              value={selectedCountryId || undefined}
              options={countryOptions}
              onChange={handleCountrySelect}
              allowClear={true}
              placeholder={
                loadingCountries
                  ? t("tripPlanner.form.loadingCountries")
                  : t("tripPlanner.form.selectCountryPlaceholder")
              }
              disabled={loadingCountries || generating}
              notFoundContent={
                loadingCountries
                  ? t("tripPlanner.form.loadingCountries")
                  : t("tripPlanner.form.noCountriesFound", {
                      defaultValue: "No countries found",
                    })
              }
              showSearch={true}
              filterOption={(input, option) =>
                option
                  ? String(option.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  : false
              }
              style={{ width: "100%" }}
              size="large"
            />

            <small className={styles.inputHint}>
              {t("tripPlanner.form.countryHint")}
            </small>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="city">{t("tripPlanner.form.selectCity")}</label>
            <Select
              id="city"
              value={cityValue}
              options={cityOptions}
              onChange={handleCitySelect}
              allowClear={true}
              placeholder={
                loadingCities
                  ? t("tripPlanner.form.loadingCities")
                  : selectedCountryId
                    ? t("tripPlanner.form.searchCity")
                    : t("tripPlanner.form.selectCountryFirst")
              }
              disabled={loadingCities || generating || !selectedCountryId}
              notFoundContent={
                loadingCities
                  ? t("tripPlanner.form.loadingCities")
                  : selectedCountryId
                    ? t("tripPlanner.form.noCitiesFoundForCountry", {
                        defaultValue: "No cities found for this country",
                      })
                    : t("tripPlanner.form.selectCountryFirst", {
                        defaultValue: "Select country first",
                      })
              }
              showSearch={true}
              optionLabelProp="label"
              filterOption={(input, option) =>
                option
                  ? String(option.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  : false
              }
              style={{ width: "100%" }}
              size="large"
            />

            <small className={styles.inputHint}>
              {selectedCountryId
                ? t("tripPlanner.form.citiesAvailable", {
                    count: cities.length,
                  })
                : t("tripPlanner.form.chooseCountryFirst")}
            </small>
          </div>
        </section>

        <section className={styles.formBlock}>
          <div className={styles.formBlockHeader}>
            <span className={styles.formBlockIndex}>2</span>
            <div>
              <h3>{t("tripPlanner.form.dates")}</h3>
              <p>
                {t("tripPlanner.form.experienceHint", {
                  defaultValue:
                    "Set the pace, budget, and group size so the route feels realistic.",
                })}
              </p>
            </div>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.inputGroup}>
              <label htmlFor="days">{t("tripPlanner.form.days")}</label>
              <input
                id="days"
                type="number"
                min={1}
                max={14}
                value={formData.days}
                onChange={onDaysChange}
                required
                disabled={generating}
                className="ant-input"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="persons">{t("tripPlanner.form.travelers")}</label>
              <input
                id="persons"
                type="number"
                min={1}
                max={20}
                value={formData.persons}
                onChange={onPersonsChange}
                required
                disabled={generating}
                className="ant-input"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="startDate">{t("tripPlanner.form.startDate")}</label>
            <input
              id="startDate"
              type="date"
              value={formData.startDate || ""}
              onChange={onStartDateChange}
              required
              disabled={generating}
              className="ant-input"
            />

            <small className={styles.inputHint}>
              {t("tripPlanner.form.tripWindowHint", {
                defaultValue:
                  "Events will be matched against this trip window.",
              })}
            </small>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="budget">
              {t("tripPlanner.form.totalBudget")} (
              {formData?.currencyCode || "ILS"})
            </label>
            <input
              id="budget"
              type="number"
              min={1}
              step={1}
              value={formData.budget}
              onChange={onBudgetChange}
              required
              disabled={generating}
              className="ant-input"
            />

            {budgetTooLow ? (
              <span className={styles.budgetWarning}>
                {t("tripPlanner.form.budgetTooLow")}
              </span>
            ) : (
              <span className={styles.inputHint}>
                {t("tripPlanner.form.budgetAdvice", {
                  defaultValue:
                    "Keep budgets realistic to improve recommendation quality.",
                })}
              </span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="currency">
              {t("tripPlanner.form.currency", { defaultValue: "Currency" })}
            </label>
            <Select
              id="currency"
              value={formData?.currencyCode || "ILS"}
              options={currencyOptions}
              onChange={(v) => onCurrencyChange && onCurrencyChange(v)}
              disabled={generating}
              placeholder={
                loadingCurrencies
                  ? t("tripPlanner.form.loadingCurrencies", {
                      defaultValue: "Loading currencies...",
                    })
                  : t("tripPlanner.form.searchOrChooseCurrency", {
                      defaultValue: "Search or choose currency...",
                    })
              }
              showSearch={true}
              optionLabelProp="label"
              filterOption={(input, option) => {
                try {
                  const label = String(option?.label ?? option?.value ?? "");
                  return label
                    .toLowerCase()
                    .includes(String(input).toLowerCase());
                } catch {
                  return false;
                }
              }}
              style={{ width: "100%" }}
              size="large"
            />

            <small className={styles.inputHint}>
              {t("tripPlanner.form.currencyHint", {
                defaultValue: "Choose the display currency for the final plan.",
              })}
            </small>
          </div>
        </section>

        {tags.length > 0 && (
          <section className={styles.formBlock}>
            <div className={styles.formBlockHeader}>
              <span className={styles.formBlockIndex}>3</span>
              <div>
                <h3>{t("tripPlanner.form.interests")}</h3>
                <p>
                  {t("tripPlanner.form.interestHint", {
                    defaultValue:
                      "Pick interests so the planner knows what to prioritize.",
                  })}
                </p>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>{t("tripPlanner.form.selectInterests")}</label>
              <div className={styles.interestsCheckboxes}>
                {tags.map((tag) => (
                  <label key={tag.id} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.interests?.includes(tag.name) || false}
                      onChange={() => onInterestChange(tag.name)}
                      disabled={generating}
                    />

                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {calendarAllowed && (
          <div className={styles.calendarToggle}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={addToCalendar}
                onChange={(e) => setAddToCalendar(e.target.checked)}
                disabled={generating}
              />
              <span>{t("tripPlanner.calendar.addToCalendar")}</span>
            </label>
            <small className={styles.inputHint}>
              {t("tripPlanner.form.calendarHint", {
                defaultValue:
                  "Automatically add each day's itinerary to your personal calendar.",
              })}
            </small>
          </div>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={
            generating ||
            loadingCities ||
            !selectedCountryId ||
            !hasSelectedCityOption
          }>
          {generating
            ? t("tripPlanner.form.generating")
            : t("tripPlanner.form.generate", {
                defaultValue: "Generate My Trip",
              })}
        </button>
      </form>

      {isAuthenticated && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t("tripPlanner.savedTrips.title")}</h2>
          </div>
          {loadingPlans && (
            <div className={styles.muted}>
              {t("tripPlanner.savedTrips.loading")}
            </div>
          )}
          {!loadingPlans && savedPlans.length === 0 && (
            <div className={styles.muted}>
              {t("tripPlanner.savedTrips.empty")}
            </div>
          )}
          {!loadingPlans && savedPlans.length > 0 && (
            <div className={styles.savedList}>
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  className={styles.savedItem}
                  onClick={() => void onLoadPlan(plan)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void onLoadPlan(plan);
                    }
                  }}>
                  <div className={styles.savedItemContent}>
                    <strong>{formatTripPlanDisplayName(plan, t)}</strong>
                    <div className={styles.savedMeta}>
                      <span>{formatDate(plan.createdAt)}</span>
                      <span>
                        {plan.days} {t("tripPlanner.form.days")}
                      </span>
                      <span>
                        {plan.budget} {formData?.currencyCode || "ILS"}
                      </span>
                      <span>
                        {(plan.totalEstimatedCost ?? 0).toFixed(0)}{" "}
                        {formData?.currencyCode || "ILS"}
                      </span>
                      {plan.shareSlug && (
                        <span>
                          {plan.shareVisibility === "FRIENDS"
                            ? t("tripPlanner.sharing.friends", {
                                defaultValue: "Friends",
                              })
                            : t("tripPlanner.sharing.public")}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.savedDeleteButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onDeletePlan(plan.id);
                    }}>
                    {t("tripPlanner.savedTrips.delete")}
                  </button>
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
