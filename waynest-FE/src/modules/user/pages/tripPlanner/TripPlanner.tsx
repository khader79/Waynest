import { TripPlannerFormPanel } from "./components/TripPlannerFormPanel";
import { TripPlannerResultsPanel } from "./components/TripPlannerResultsPanel";
import { useTripPlannerPage } from "../../hooks/useTripPlannerPage";
import "./TripPlanner.css";

const TripPlanner = () => {
  const {
    addToWishlist,
    budgetTooLow,
    cities,
    clearPlan,
    copyShareLink,
    formData,
    formatCityLabel,
    formatDate,
    generating,
    hasShareLink,
    isAuthenticated,
    loadingCities,
    loadingPlans,
    loadPlan,
    publicShareUrl,
    publishPlan,
    publishing,
    removePlan,
    resultsRef,
    savedPlans,
    submit,
    tags,
    toggleInterest,
    tripPlan,
    updateBudget,
    updateCity,
    updateDays,
    updatePersons,
    viewPlace,
  } = useTripPlannerPage();

  return (
    <div className="trip-planner-page">
      <h1 className="trip-planner-title">AI Trip Planner</h1>

      <div className="trip-planner-container">
        <TripPlannerFormPanel
          budgetTooLow={budgetTooLow}
          cities={cities}
          formData={formData}
          formatCityLabel={formatCityLabel}
          formatDate={formatDate}
          generating={generating}
          isAuthenticated={isAuthenticated}
          loadingCities={loadingCities}
          loadingPlans={loadingPlans}
          onBudgetChange={updateBudget}
          onCityChange={updateCity}
          onDaysChange={updateDays}
          onDeletePlan={removePlan}
          onInterestChange={toggleInterest}
          onLoadPlan={loadPlan}
          onPersonsChange={updatePersons}
          onSubmit={submit}
          savedPlans={savedPlans}
          tags={tags}
        />

        <TripPlannerResultsPanel
          generating={generating}
          hasShareLink={hasShareLink}
          onAddWishlist={addToWishlist}
          onClearPlan={clearPlan}
          onCopyShareLink={copyShareLink}
          onPublishPlan={publishPlan}
          onViewPlace={viewPlace}
          publicShareUrl={publicShareUrl}
          publishing={publishing}
          resultsRef={resultsRef}
          tripPlan={tripPlan}
          formData={{
            days: formData.days,
            budget: formData.budget,
            persons: formData.persons,
          }}
        />
      </div>
    </div>
  );
};

export default TripPlanner;
