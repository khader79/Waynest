import type { ChangeEvent, FormEvent } from "react";
import type {
  CreateTripPlannerDto,
  TripPlanSummary,
  TripPlannerCity,
  TripPlannerTag,
} from "../tripPlanner.types";

type TripPlannerFormPanelProps = {
  budgetTooLow: boolean;
  cities: TripPlannerCity[];
  formData: CreateTripPlannerDto;
  formatCityLabel: (cityId: string) => string;
  formatDate: (value: string) => string;
  generating: boolean;
  isAuthenticated: boolean;
  loadingCities: boolean;
  loadingPlans: boolean;
  savedPlans: TripPlanSummary[];
  tags: TripPlannerTag[];
  onBudgetChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCityChange: (event: ChangeEvent<HTMLSelectElement>) => void;
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
  formData,
  formatCityLabel,
  formatDate,
  generating,
  isAuthenticated,
  loadingCities,
  loadingPlans,
  onBudgetChange,
  onCityChange,
  onDaysChange,
  onDeletePlan,
  onInterestChange,
  onLoadPlan,
  onPersonsChange,
  onSubmit,
  savedPlans,
  tags,
}: TripPlannerFormPanelProps) => (
  <div className="trip-planner-form-section">
    {!isAuthenticated && (
      <div className="trip-planner-guest-notice">
        You're browsing as a guest. Log in to save your plans.
      </div>
    )}

    <form className="trip-planner-form" onSubmit={onSubmit}>
      <div className="input-group">
        <label htmlFor="city">Select City</label>
        <select
          id="city"
          value={formData.cityId}
          onChange={onCityChange}
          required
          disabled={loadingCities || generating}>
          <option value="">{loadingCities ? "Loading..." : "Choose a city..."}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name} {city.stateName ? `(${city.stateName})` : ""}
            </option>
          ))}
        </select>
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
          step={50}
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
        disabled={generating || loadingCities}>
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
