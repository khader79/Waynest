/**
 * TripPlannerFormPanel - Refactored form component
 * Uses CSS Modules for styling
 */

import { type ChangeEvent, type FormEvent } from 'react';
import { Select } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import type { CreateTripPlannerDto, TripPlanSummary, TripPlannerCity, TripPlannerTag } from '../types';
import type { CatalogCountry } from '@/services/catalog/catalog.service';
import styles from '../TripPlanner.module.css';

type TripPlannerFormPanelProps = {
  budgetTooLow: boolean;
  cities: TripPlannerCity[];
  countries: CatalogCountry[];
  formData: CreateTripPlannerDto;
  generating: boolean;
  isAuthenticated: boolean;
  loadingCities: boolean;
  loadingCountries: boolean;
  loadingPlans: boolean;
  savedPlans: TripPlanSummary[];
  selectedCountryId: string | null;
  tags: TripPlannerTag[];
  onBudgetChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onDaysChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDeletePlan: (planId: string) => void;
  onInterestChange: (tagName: string) => void;
  onLoadPlan: (planId: string) => void;
  onPersonsChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  formatCityLabel: (cityId: string) => string;
  formatDate: (value: string) => string;
};

export const TripPlannerFormPanel = ({
  budgetTooLow,
  cities,
  countries,
  formData,
  generating,
  isAuthenticated,
  loadingCities,
  loadingCountries,
  loadingPlans,
  onBudgetChange,
  onCityChange,
  onCountryChange,
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
}: TripPlannerFormPanelProps) => {
  const countryOptions: DefaultOptionType[] = countries.map((country) => ({
    label: country.name,
    value: country.id,
  }));

  const cityOptions: DefaultOptionType[] = cities.map((city) => ({
    label: city.stateName ? `${city.name} (${city.stateName})` : city.name,
    value: city.id,
  }));

  const handleCitySelect = (value: string) => {
    onCityChange(value);
  };

  const handleCountrySelect = (value: string) => {
    onCountryChange(value);
  };

  return (
    <>
      {!isAuthenticated && (
        <div className={styles.guestNotice}>
          You're browsing as a guest. Log in to save your plans.
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
            placeholder={loadingCountries ? 'Loading countries...' : 'Select a country...'}
            disabled={loadingCountries || generating}
            showSearch={true}
            filterOption={(input: string, option: DefaultOptionType | undefined) =>
              option ? String(option.label ?? '').toLowerCase().includes(input.toLowerCase()) : false
            }
            style={{ width: '100%' }}
            size="large"
          />
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
                ? 'Loading cities...'
                : selectedCountryId
                  ? 'Search for a city...'
                  : 'Select country first...'
            }
            disabled={loadingCities || generating || !selectedCountryId}
            showSearch={true}
            filterOption={(input: string, option: DefaultOptionType | undefined) =>
              option ? String(option.label ?? '').toLowerCase().includes(input.toLowerCase()) : false
            }
            style={{ width: '100%' }}
            size="large"
          />
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
          <label htmlFor="budget">Total Budget (ILS)</label>
          <input
            id="budget"
            type="number"
            min={1}
            step={50}
            value={formData.budget}
            onChange={onBudgetChange}
            required
            disabled={generating}
            className="ant-input"
          />
          {budgetTooLow && (
            <span className={styles.budgetWarning}>
              Budget may be too low
            </span>
          )}
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
          {generating ? 'Generating...' : 'Generate Trip Plan'}
        </button>
      </form>

      {isAuthenticated && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>My Saved Plans</h2>
          </div>
          {loadingPlans && <div className={styles.muted}>Loading saved plans...</div>}
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
                    if (event.key === 'Enter') {
                      void onLoadPlan(plan.id);
                    }
                  }}>
                  <div className={styles.savedItemContent}>
                    <strong>{formatCityLabel(plan.cityId)}</strong>
                    <div className={styles.savedMeta}>
                      <span>{formatDate(plan.createdAt)}</span>
                      <span>{plan.days} days</span>
                      <span>{plan.budget} ILS</span>
                      <span>{(plan.totalEstimatedCost ?? 0).toFixed(0)} ILS</span>
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
