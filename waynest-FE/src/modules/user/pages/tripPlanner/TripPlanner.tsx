import { Modal } from "antd";
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
    confirmDeletePlan,
    cancelDeletePlan,
    copyShareLink,
    countries,
    formData,
    formatCityLabel,
    formatDate,
    generating,
    hasShareLink,
    isAuthenticated,
    loadingCities,
    loadingCountries,
    loadingPlans,
    loadPlan,
    onCountryChange,
    planToDelete,
    publicShareUrl,
    publishPlan,
    publishing,
    removePlan,
    resultsRef,
    savedPlans,
    selectedCountryId,
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
      <div className="trip-planner-hero">
        <h1 className="trip-planner-title">AI Trip Planner</h1>
        <p className="trip-planner-subtitle">
          Choose your country first, then pick a city to generate a personalized plan.
        </p>
        <div className="trip-planner-hero-badges">
          <span className="trip-planner-badge">Smart itinerary</span>
          <span className="trip-planner-badge">City by country</span>
          <span className="trip-planner-badge">Shareable trip links</span>
        </div>
      </div>

      <div className="trip-planner-container">
        <TripPlannerFormPanel
          budgetTooLow={budgetTooLow}
          cities={cities}
          countries={countries}
          formData={formData}
          formatCityLabel={formatCityLabel}
          formatDate={formatDate}
          generating={generating}
          isAuthenticated={isAuthenticated}
          loadingCities={loadingCities}
          loadingCountries={loadingCountries}
          loadingPlans={loadingPlans}
          onBudgetChange={updateBudget}
          onCityChange={updateCity}
          onCountryChange={onCountryChange}
          onDaysChange={updateDays}
          onDeletePlan={removePlan}
          onInterestChange={toggleInterest}
          onLoadPlan={loadPlan}
          onPersonsChange={updatePersons}
          onSubmit={submit}
          savedPlans={savedPlans}
          selectedCountryId={selectedCountryId}
          tags={tags}
        />

        <TripPlannerResultsPanel
          generating={generating}
          hasShareLink={hasShareLink}
          isAuthenticated={isAuthenticated}
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

      <Modal
        title="Delete Plan"
        open={planToDelete !== null}
        onOk={confirmDeletePlan}
        onCancel={cancelDeletePlan}
        okText="Delete"
        okButtonProps={{ danger: true }}>
        <p>Are you sure you want to delete this plan? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default TripPlanner;
