/**
 * TripPlannerFormPanel - Refactored form component
 * Uses CSS Modules for styling
 */

import "react";
import { Select } from "antd";
import { AVAILABLE_CURRENCIES } from "@/utils/currency";

import styles from "@/pages/shared/TripPlanner.module.css";

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

      <form className={styles.form} onSubmit={onSubmit}>
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

          <small className="input-hint">
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

          <small className="input-hint">
            {selectedCountryId
              ? `${cities.length} city${cities.length === 1 ? "" : "ies"} available`
              : "Choose a country first"}
          </small>
        </div>

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

          {budgetTooLow && (
            <span className={styles.budgetWarning}>Budget may be too low</span>
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

          <small className="input-hint">
            Choose display currency for the plan.
          </small>
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

        {tags.length > 0 && (
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
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={generating || loadingCities || !formData.cityId}>
          {generating ? "Generating..." : "Generate Trip Plan"}
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
