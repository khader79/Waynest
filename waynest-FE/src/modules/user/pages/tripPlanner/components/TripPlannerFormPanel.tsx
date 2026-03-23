import type { ChangeEvent, FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Select } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import type {
  CreateTripPlannerDto,
  TripPlanSummary,
  TripPlannerCity,
  TripPlannerTag,
} from "../tripPlanner.types";
import type { CatalogCountry } from "@/services/catalog/catalog.service";

type TripPlannerFormPanelProps = {
  budgetTooLow: boolean;
  cities: TripPlannerCity[];
  countries: CatalogCountry[];
  formData: CreateTripPlannerDto;
  formatCityLabel: (cityId: string) => string;
  formatDate: (value: string) => string;
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
};

export const TripPlannerFormPanel = ({
  budgetTooLow,
  cities,
  countries,
  formData,
  formatCityLabel,
  formatDate,
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
}: TripPlannerFormPanelProps) => {
  const location = useLocation();
  const redirectState = { from: location };
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
    <div className="trip-planner-form-section">
      {!isAuthenticated && (
        <div className="trip-planner-guest-notice">
          <span>You're browsing as a guest. Log in to save your plans.</span>
          <div className="trip-planner-guest-actions">
            <Link className="trip-planner-guest-link" to="/login" state={redirectState}>
              Login
            </Link>
            <Link className="trip-planner-guest-link secondary" to="/register" state={redirectState}>
              Register
            </Link>
          </div>
        </div>
      )}

      <form className="trip-planner-form" onSubmit={onSubmit}>
        <div className="trip-planner-form-head">
          <h2>Plan Details</h2>
          <p>Set your destination and trip preferences.</p>
        </div>

        <div className="input-group">
          <label htmlFor="country">Select Country</label>
          <Select
            id="country"
            value={selectedCountryId || undefined}
            options={countryOptions}
            onChange={handleCountrySelect}
            placeholder={loadingCountries ? "Loading countries..." : "Select a country..."}
            disabled={loadingCountries || generating}
            showSearch={true}
            filterOption={(input: string, option: DefaultOptionType | undefined) =>
              option ? String(option.label ?? "").toLowerCase().includes(input.toLowerCase()) : false
            }
            style={{ width: "100%" }}
            size="large"
          />
          <small className="input-hint">Start with country to filter available cities.</small>
        </div>

        <div className="input-group">
          <label htmlFor="city">Select City</label>
          <Select
            id="city"
            value={formData.cityId || undefined}
            options={cityOptions}
            onChange={handleCitySelect}
            placeholder={loadingCities ? "Loading cities..." : selectedCountryId ? "Search for a city..." : "Select country first..."}
            disabled={loadingCities || generating || !selectedCountryId}
            showSearch={true}
            filterOption={(input: string, option: DefaultOptionType | undefined) =>
              option ? String(option.label ?? "").toLowerCase().includes(input.toLowerCase()) : false
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

        <div className="input-group">
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
          />
        </div>

        <div className="input-group">
          <label htmlFor="budget">Total Budget (ILS)</label>
          <input
            id="budget"
            type="number"
            min={1}
            step={1}
            value={formData.budget}
            onChange={onBudgetChange}
            required
            disabled={generating}
          />
          {budgetTooLow && (
            <span className="trip-planner-budget-warning">Budget may be too low</span>
          )}
        </div>

        <div className="input-group">
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
          />
        </div>

        {tags.length > 0 && (
          <div className="input-group">
            <label>Interests</label>
            <div className="interests-checkboxes">
              {tags.map((tag) => (
                <label key={tag.id} className="checkbox-label">
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
          className="generate-button"
          disabled={generating || loadingCities || !formData.cityId}>
          {generating ? "Generating..." : "Generate Trip Plan"}
        </button>
      </form>

      {isAuthenticated && (
        <div className="trip-planner-section">
          <div className="trip-planner-section-header">
            <h2>My Saved Plans</h2>
          </div>
          {loadingPlans && <div className="trip-planner-muted">Loading saved plans...</div>}
          {!loadingPlans && savedPlans.length === 0 && (
            <div className="trip-planner-muted">No saved plans yet.</div>
          )}
          {!loadingPlans && savedPlans.length > 0 && (
            <div className="trip-planner-saved-list">
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  className="trip-planner-saved-item"
                  onClick={() => void onLoadPlan(plan.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void onLoadPlan(plan.id);
                    }
                  }}>
                  <div className="trip-planner-saved-copy">
                    <strong>{formatCityLabel(plan.cityId)}</strong>
                    <div className="trip-planner-saved-meta">
                      <span>{formatDate(plan.createdAt)}</span>
                      <span>{plan.days} days</span>
                      <span>{plan.budget} ILS</span>
                      <span>{(plan.totalEstimatedCost ?? 0).toFixed(0)} ILS</span>
                      {plan.isPublic && <span>Public</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="trip-planner-saved-delete"
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
    </div>
  );
};
