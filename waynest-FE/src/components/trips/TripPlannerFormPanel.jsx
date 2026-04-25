/**
 * TripPlannerFormPanel - Refactored form component
 * Uses CSS Modules for styling
 */

import "react";
import { Select } from "antd";
import { AVAILABLE_CURRENCIES } from "@/utils/currency";

import styles from "@/pages/shared/TripPlanner.module.css";

const QUICK_START_PRESETS = [
  {
    label: "Weekend reset",
    summary: "3 days, balanced budget, 2 travelers",
    values: {
      days: 3,
      budget: 1400,
      persons: 2,
    },
  },
  {
    label: "Solo deep dive",
    summary: "4 days, flexible budget, 1 traveler",
    values: {
      days: 4,
      budget: 1800,
      persons: 1,
    },
  },
  {
    label: "Group adventure",
    summary: "5 days, bigger crew, stronger budget",
    values: {
      days: 5,
      budget: 3200,
      persons: 4,
    },
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
  onDeletePlan,
  onInterestChange,
  onLoadPlan,
  onPersonsChange,
  onSubmit,
  savedPlans,
  selectedCountryId,
  tags,
  formatCityLabel,
  formatDate,
}) => {
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
    label: city.stateName ? `${city.name} (${city.stateName})` : city.name,
    value: city.id,
  }));

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
          You're browsing as a guest. Drafts won't persist after reload — log in
          to save your plans.
        </div>
      )}

      <section className={styles.formLeadCard}>
        <div className={styles.formLeadHeader}>
          <div>
            <span className={styles.formLeadEyebrow}>AI route briefing</span>
            <h2>Give the planner just enough signal</h2>
          </div>
          {onResetForm ? (
            <button
              type="button"
              className={styles.secondaryActionButton}
              onClick={onResetForm}
              disabled={generating}>
              Reset
            </button>
          ) : null}
        </div>
        <p className={styles.formLeadText}>
          Waynest combines your destination, budget, traveler count, and
          preferences with live catalog data to build an editable itinerary.
        </p>

        {onQuickStart ? (
          <div className={styles.quickStartGrid}>
            {QUICK_START_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={styles.quickStartButton}
                onClick={() => onQuickStart(preset.values)}
                disabled={generating}>
                <strong>{preset.label}</strong>
                <span>{preset.summary}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <form className={styles.form} onSubmit={onSubmit}>
        <section className={styles.formBlock}>
          <div className={styles.formBlockHeader}>
            <span className={styles.formBlockIndex}>1</span>
            <div>
              <h3>Pick the destination</h3>
              <p>Start broad, then let Waynest narrow the city list for you.</p>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="country">Select Country</label>
            <Select
              id="country"
              value={selectedCountryId || undefined}
              options={countryOptions}
              onChange={handleCountrySelect}
              placeholder={
                loadingCountries ? "Loading countries..." : "Select a country..."
              }
              disabled={loadingCountries || generating}
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
              Start with country to filter available cities.
            </small>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="city">Select City</label>
            <Select
              id="city"
              value={formData.cityId || undefined}
              options={cityOptions}
              onChange={handleCitySelect}
              placeholder={
                loadingCities
                  ? "Loading cities..."
                  : selectedCountryId
                    ? "Search for a city..."
                    : "Select country first..."
              }
              disabled={loadingCities || generating || !selectedCountryId}
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
                ? `${cities.length} city${cities.length === 1 ? "" : "ies"} available`
                : "Choose a country first"}
            </small>
          </div>
        </section>

        <section className={styles.formBlock}>
          <div className={styles.formBlockHeader}>
            <span className={styles.formBlockIndex}>2</span>
            <div>
              <h3>Shape the experience</h3>
              <p>Set the pace, budget, and group size so the route feels realistic.</p>
            </div>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.inputGroup}>
              <label htmlFor="days">Number of Days</label>
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
              <label htmlFor="persons">Number of Persons</label>
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
            <label htmlFor="budget">
              Total Budget ({formData?.currencyCode || "ILS"})
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
                Budget may be too low for the current trip shape.
              </span>
            ) : (
              <span className={styles.inputHint}>
                Keep budgets realistic to improve recommendation quality.
              </span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="currency">Currency</label>
            <Select
              id="currency"
              value={formData?.currencyCode || "ILS"}
              options={currencyOptions}
              onChange={(v) => onCurrencyChange && onCurrencyChange(v)}
              disabled={generating}
              placeholder={
                loadingCurrencies
                  ? "Loading currencies..."
                  : "Search or choose currency..."
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
              Choose the display currency for the final plan.
            </small>
          </div>
        </section>

        {tags.length > 0 && (
          <section className={styles.formBlock}>
            <div className={styles.formBlockHeader}>
              <span className={styles.formBlockIndex}>3</span>
              <div>
                <h3>Guide the AI taste</h3>
                <p>Pick interests so the planner knows what to prioritize.</p>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Interests</label>
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

        <button
          type="submit"
          className={styles.submitButton}
          disabled={generating || loadingCities || !formData.cityId}>
          {generating ? "Generating..." : "Generate My AI Route"}
        </button>
      </form>

      {isAuthenticated && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>My Saved Plans</h2>
          </div>
          {loadingPlans && (
            <div className={styles.muted}>Loading saved plans...</div>
          )}
          {!loadingPlans && savedPlans.length === 0 && (
            <div className={styles.muted}>No saved plans yet.</div>
          )}
          {!loadingPlans && savedPlans.length > 0 && (
            <div className={styles.savedList}>
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  className={styles.savedItem}
                  onClick={() => void onLoadPlan(plan.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void onLoadPlan(plan.id);
                    }
                  }}>
                  <div className={styles.savedItemContent}>
                    <strong>{formatCityLabel(plan.cityId)}</strong>
                    <div className={styles.savedMeta}>
                      <span>{formatDate(plan.createdAt)}</span>
                      <span>{plan.days} days</span>
                      <span>
                        {plan.budget} {formData?.currencyCode || "ILS"}
                      </span>
                      <span>
                        {(plan.totalEstimatedCost ?? 0).toFixed(0)}{" "}
                        {formData?.currencyCode || "ILS"}
                      </span>
                      {plan.isPublic && <span>Public</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.savedDeleteButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onDeletePlan(plan.id);
                    }}>
                    Delete
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
