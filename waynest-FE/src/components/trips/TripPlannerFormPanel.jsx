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
  const [showInterests, setShowInterests] = useState(false);

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
              autoFocus={!selectedCountryId}
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
                    "Duration, budget, and group size.",
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
            ) : null}
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

          </div>
        </section>

        {tags.length > 0 && (
          <section className={styles.formBlock}>
            <div
              className={styles.formBlockHeader}
              role="button"
              tabIndex={0}
              onClick={() => setShowInterests(!showInterests)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowInterests(!showInterests);
                }
              }}
              style={{ cursor: "pointer" }}>
              <span className={styles.formBlockIndex}>3</span>
              <div>
                <h3>{t("tripPlanner.form.interests")}</h3>
                <p>
                  {showInterests
                    ? t("tripPlanner.form.interestHint", {
                        defaultValue:
                          "Pick interests so the planner knows what to prioritize.",
                      })
                    : t("tripPlanner.form.interestsCollapsed", {
                        defaultValue:
                          "Tap to refine your route — optional",
                      })}
                </p>
              </div>
            </div>

            {showInterests && (
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
            )}
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
          </div>
        )}

        {onResetForm ? (
          <button
            type="button"
            className={styles.secondaryActionButton}
            onClick={onResetForm}
            disabled={generating}>
            {t("common.reset", { defaultValue: "Reset" })}
          </button>
        ) : null}
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
            <div className={styles.emptyState}>
              <strong>{t("tripPlanner.savedTrips.emptyTitle", {defaultValue: "No saved trips yet"})}</strong>
              <p>{t("tripPlanner.savedTrips.emptyHint", {defaultValue: "Generate your first trip above and it will appear here."})}</p>
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
