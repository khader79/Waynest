/**
 * TripPlanner - Refactored main page component
 * Uses the new feature-based architecture
 */

import { Modal } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiCompass,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
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
    cancelDeletePlan,
    cities,
    clearPlan,
    confirmDeletePlan,
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
    planToDelete,
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

  const plannerSignals = [
    {
      key: "liveDestinations",
      label: t("tripPlanner.page.signals.liveDestinationsLabel", {
        defaultValue: "Live destinations",
      }),
      value:
        countries.length > 0
          ? t("tripPlanner.page.signals.liveDestinationsValue", {
              defaultValue: "{{count}}+ countries",
              count: countries.length,
            })
          : t("tripPlanner.page.signals.catalogReady", {
              defaultValue: "Catalog ready",
            }),
    },
    {
      key: "preferenceInputs",
      label: t("tripPlanner.page.signals.preferenceInputsLabel", {
        defaultValue: "Preference inputs",
      }),
      value:
        tags.length > 0
          ? t("tripPlanner.page.signals.preferenceInputsValue", {
              defaultValue: "{{count}}+ interests",
              count: tags.length,
            })
          : t("tripPlanner.page.signals.tailoredRouting", {
              defaultValue: "Tailored routing",
            }),
    },
    {
      key: "builtForGroups",
      label: t("tripPlanner.page.signals.builtForGroupsLabel", {
        defaultValue: "Built for groups",
      }),
      value: t("tripPlanner.page.signals.builtForGroupsValue", {
        defaultValue: "Solo to 20 travelers",
      }),
    },
  ];

  const plannerSteps = [
    {
      key: "startPlanning",
      icon: FiMapPin,
      title: t("tripPlanner.page.steps.startPlanningTitle", {
        defaultValue: "Tell Waynest where you're going",
      }),
      text: t("tripPlanner.page.steps.startPlanningText", {
        defaultValue:
          "Choose the country, city, and trip length so the AI plans around a real destination.",
      }),
    },
    {
      key: "tuneTrip",
      icon: FiUsers,
      title: t("tripPlanner.page.steps.tuneTripTitle", {
        defaultValue: "Tune the trip shape",
      }),
      text: t("tripPlanner.page.steps.tuneTripText", {
        defaultValue:
          "Set your group size, budget, currency, and interests so the route matches your pace.",
      }),
    },
    {
      key: "getRoute",
      icon: FiCompass,
      title: t("tripPlanner.page.steps.getRouteTitle", {
        defaultValue: "Get an editable AI route",
      }),
      text: t("tripPlanner.page.steps.getRouteText", {
        defaultValue:
          "Waynest combines your inputs with places, prices, opening hours, and matching events.",
      }),
    },
  ];

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
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroBadge}>
            <FiCheckCircle aria-hidden="true" />
            {t("tripPlanner.page.heroBadge", {
              defaultValue: "AI-first planning",
            })}
          </span>
          <h1 className={styles.heroTitle}>
            {t("tripPlanner.page.heroTitle", {
              defaultValue: "Build a world-class trip in minutes",
            })}
          </h1>
          <p className={styles.heroSubtitle}>
            {t("tripPlanner.page.heroSubtitle", {
              defaultValue:
                "Waynest turns your destination, budget, traveler count, and interests into a day-by-day route backed by real places, opening hours, event matches, and shareable plans.",
            })}
          </p>

          <div className={styles.heroSignals}>
            {plannerSignals.map((signal) => (
              <div key={signal.key} className={styles.heroSignalCard}>
                <strong>{signal.value}</strong>
                <span>{signal.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.heroPanelIntro}>
            <div className={styles.heroPanelEyebrow}>
              <FiCalendar aria-hidden="true" />
              {t("tripPlanner.page.heroEyebrow", {
                defaultValue: "What the AI uses",
              })}
            </div>
            <ul className={styles.heroPanelList}>
              <li>
                {t("tripPlanner.page.heroBullets.destination", {
                  defaultValue:
                    "Your selected city, duration, and traveler count",
                })}
              </li>
              <li>
                {t("tripPlanner.page.heroBullets.preferences", {
                  defaultValue:
                    "Your budget, currency preference, and trip interests",
                })}
              </li>
              <li>
                {t("tripPlanner.page.heroBullets.catalog", {
                  defaultValue:
                    "Waynest place catalog, price signals, and opening hours",
                })}
              </li>
              <li>
                {t("tripPlanner.page.heroBullets.events", {
                  defaultValue:
                    "Available public events that fit the trip window",
                })}
              </li>
            </ul>
          </div>

          <div className={styles.heroSteps}>
            {plannerSteps.map((step, index) => (
              <article key={step.key} className={styles.heroStepCard}>
                <span className={styles.heroStepIndex}>{index + 1}</span>
                <div className={styles.heroStepIcon}>
                  <step.icon aria-hidden="true" />
                </div>
                <div className={styles.heroStepCopy}>
                  <h2>{step.title}</h2>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.container}>
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
            canUseCalendar={canUseCalendar}
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
            onSubmit={onSubmit}
            onCurrencyChange={updateCurrency}
            savedPlans={savedPlans}
            selectedCountryId={selectedCountryId}
            tags={tags}
            formatDate={formatDate}
          />
        </div>

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

      <Modal
        title={t("tripPlanner.page.deleteModal.title", {
          defaultValue: "Delete Plan",
        })}
        open={planToDelete !== null}
        onOk={confirmDeletePlan}
        onCancel={cancelDeletePlan}
        okText={t("tripPlanner.page.deleteModal.confirm", {
          defaultValue: "Delete",
        })}
        okButtonProps={{ danger: true }}>
        <p>
          {t("tripPlanner.page.deleteModal.message", {
            defaultValue:
              "Are you sure you want to delete this plan? This action cannot be undone.",
          })}
        </p>
      </Modal>
    </div>
  );
};

export default TripPlanner;
