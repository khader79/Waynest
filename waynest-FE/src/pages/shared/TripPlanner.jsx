/**
 * TripPlanner - Refactored main page component
 * Uses the new feature-based architecture
 */

import { Modal } from "antd";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTripPlanner } from "@/hooks/trips/useTripPlanner";
import { TripPlannerFormPanel } from "@/components/trips/TripPlannerFormPanel";
import { TripPlannerResultsPanel } from "@/components/trips/TripPlannerResultsPanel";
import styles from "./TripPlanner.module.css";

export const TripPlanner = () => {
  const {
    budgetTooLow,
    cancelDeletePlan,
    cities,
    clearPlan,
    confirmDeletePlan,
    confirmDeletePlan: _confirmDelete,
    countries,
    copyShareLink,
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
    onSubmit,
    tags,
    toggleInterest,
    tripPlan,
    updateBudget,
    updateCity,
    updateDays,
    updatePersons,
    viewPlace,
    addToWishlist,
    finishAnimation,
    commitPendingPlan,
  } = useTripPlanner();
  const [searchParams, setSearchParams] = useSearchParams();
  const planIdFromQuery = searchParams.get("planId");

  useEffect(() => {
    if (!planIdFromQuery) {
      return;
    }

    let isActive = true;
    const openPlanFromQuery = async () => {
      await loadPlan(planIdFromQuery);
      if (!isActive) {
        return;
      }
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("planId");
      setSearchParams(nextParams, { replace: true });
    };

    void openPlanFromQuery();
    return () => {
      isActive = false;
    };
  }, [planIdFromQuery, loadPlan, searchParams, setSearchParams]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>AI Trip Planner</h1>

      <div className={styles.container}>
        <div className={styles.formSection}>
          <TripPlannerFormPanel
            budgetTooLow={budgetTooLow}
            cities={cities}
            countries={countries}
            formData={formData}
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
            onSubmit={onSubmit}
            savedPlans={savedPlans}
            selectedCountryId={selectedCountryId}
            tags={tags}
            formatCityLabel={formatCityLabel}
            formatDate={formatDate}
          />
        </div>

        <div className={styles.resultsSection}>
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
            finishAnimation={finishAnimation}
            onSkeletonFinish={commitPendingPlan}
            tripPlan={tripPlan}
            formData={{
              days: formData.days,
              budget: formData.budget,
              persons: formData.persons,
            }}
          />
        </div>
      </div>

      <Modal
        title="Delete Plan"
        open={planToDelete !== null}
        onOk={confirmDeletePlan}
        onCancel={cancelDeletePlan}
        okText="Delete"
        okButtonProps={{ danger: true }}>
        <p>
          Are you sure you want to delete this plan? This action cannot be
          undone.
        </p>
      </Modal>
    </div>
  );
};

export default TripPlanner;
