/**
 * TripPlanner - Collapsible settings refactored page component
 * Collapses the left form into a top settings bar when trip is generating/ready.
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTripPlanner } from "@/hooks/trips/useTripPlanner";
import { useAuth } from "@/context/AuthContext";
import { TripPlannerFormPanel } from "@/components/trips/TripPlannerFormPanel";
import { TripPlannerResultsPanel } from "@/components/trips/TripPlannerResultsPanel";
import styles from "./TripPlanner.module.css";

export const TripPlanner = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    budgetTooLow,
    cities,
    clearPlan,
    countries,
    currencies,
    loadingCurrencies,
    copyShareLink,
    formData,
    formatDate,
    generating,
    hasShareLink,
    isAuthenticated,
    loadingCities,
    loadingCountries,
    loadingPlans,
    loadPlan,
    openSavedPlan,
    onCountryChange,
    publicShareUrl,
    publishPlan,
    publishing,
    setShareTitle,
    setShareVisibility,
    shareTitle,
    shareVisibility,
    removePlan,
    resetForm,
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
    updateStartDate,
    viewEvent,
    viewPlace,
    addToWishlist,
    finishAnimation,
    commitPendingPlan,
    updateCurrency,
    setTripPlan,
    plannerPrefill,
  } = useTripPlanner();
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const planIdFromQuery = searchParams.get("planId");
  const canUseCalendar = isAuthenticated && user?.role !== "ADMIN";

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

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const openCalendarPage = () => {
    if (!canUseCalendar || !tripPlan) {
      return;
    }

    const nextParams = new URLSearchParams();
    if (tripPlan.tripPlanId) {
      nextParams.set("planId", tripPlan.tripPlanId);
    }

    const qs = nextParams.toString();
    navigate(`/calendar${qs ? `?${qs}` : ""}`, {
      state: {
        tripPlan,
        formData,
      },
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Wizard always visible on the left */}
        <div className={styles.formSection}>
          <TripPlannerFormPanel
            budgetTooLow={budgetTooLow}
            cities={cities}
            countries={countries}
            loadingCurrencies={loadingCurrencies}
            currencies={currencies}
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
            onStartDateChange={updateStartDate}
            onDeletePlan={removePlan}
            onInterestChange={toggleInterest}
            onResetForm={resetForm}
            onLoadPlan={openSavedPlan}
            onPersonsChange={updatePersons}
            onSubmit={handleFormSubmit}
            onCurrencyChange={updateCurrency}
            savedPlans={savedPlans}
            selectedCountryId={selectedCountryId}
            tags={tags}
            formatDate={formatDate}
          />
        </div>

        {/* Results always visible on the right */}
        <div className={styles.resultsSection}>
          <TripPlannerResultsPanel
            generating={generating}
            hasShareLink={hasShareLink}
            isAuthenticated={isAuthenticated}
            canUseCalendar={canUseCalendar}
            onAddWishlist={addToWishlist}
            onClearPlan={clearPlan}
            onCopyShareLink={copyShareLink}
            onPublishPlan={publishPlan}
            onViewPlace={viewPlace}
            onViewEvent={viewEvent}
            onOpenCalendar={openCalendarPage}
            publicShareUrl={publicShareUrl}
            publishing={publishing}
            shareTitle={shareTitle}
            shareVisibility={shareVisibility}
            setShareTitle={setShareTitle}
            setShareVisibility={setShareVisibility}
            resultsRef={resultsRef}
            finishAnimation={finishAnimation}
            onSkeletonFinish={commitPendingPlan}
            tripPlan={tripPlan}
            formData={formData}
            onUpdateTripPlan={setTripPlan}
          />
        </div>
      </div>
    </div>
  );
};

export default TripPlanner;
