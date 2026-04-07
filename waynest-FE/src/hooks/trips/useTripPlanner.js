/**
 * useTripPlanner - Main composable hook
 * Orchestrates all trip planner functionality
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";

import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "@/context/AuthContext";
import { useTripForm } from "./useTripForm";
import { useTripResults } from "./useTripResults";
import { useTripSharing } from "./useTripSharing";
import { useSavedPlans } from "./useSavedPlans";
import {
  fetchAllCities,
  fetchAllCountries,
  fetchCitiesByCountry,
  fetchCityById,
  fetchTags,
} from "@/api/catalog";
import {
  extractCities,
  extractCountries,
  extractTags,
} from "@/utils/trips/dataNormalizers";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { loadRemixDraft, clearRemixDraft } from "@/utils/trips/storage";
import { formatDate } from "@/utils/trips/formatters";

export const useTripPlanner = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const appliedCityFromUrlRef = useRef(null);

  // Initialize individual hooks
  const {
    formData,
    errors,
    isValid,
    budgetTooLow,
    minimumBudget,
    updateCity,
    updateDays,
    updateBudget,
    updatePersons,
    toggleInterest,
    setFormData,
  } = useTripForm();
  const resultsHook = useTripResults();
  const sharingHook = useTripSharing(
    resultsHook.tripPlan,
    resultsHook.setTripPlan,
    formData,
  );
  const savedPlansHook = useSavedPlans();

  // Location data state
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // City lookup for label formatting
  const cityLookup = useMemo(() => {
    const map = new Map();
    cities.forEach((city) => map.set(city.id, city));
    return map;
  }, [cities]);

  // Load initial data
  useEffect(() => {
    void loadInitialData();

    const stateRemix = location?.state?.remixDraft ?? null;
    const remixDraft = stateRemix ?? loadRemixDraft();
    if (remixDraft) {
      setFormData(remixDraft);
      clearRemixDraft();
      toast.info("Shared trip loaded into the planner");
    }
  }, [setFormData]);

  const loadInitialData = async () => {
    await Promise.all([loadCountries(), loadCities(), loadTags()]);
  };

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const data = await fetchAllCountries();
      setCountries(extractCountries(data));
    } catch {
      toast.error("Failed to load countries");
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadCities = async () => {
    try {
      setLoadingCities(true);
      const data = await fetchAllCities();
      setCities(extractCities(data));
    } catch {
      toast.error("Failed to load cities");
    } finally {
      setLoadingCities(false);
    }
  };

  const loadTags = async () => {
    try {
      const data = await fetchTags();
      setTags(extractTags(data));
    } catch {
      toast.error("Failed to load interests");
    }
  };

  const onCountryChange = useCallback(
    async (countryId) => {
      setSelectedCountryId(countryId);
      updateCity(""); // Reset city selection
      setCities([]);

      if (countryId) {
        try {
          setLoadingCities(true);
          const data = await fetchCitiesByCountry(countryId);
          setCities(extractCities(data));
        } catch {
          toast.error("Failed to load cities");
        } finally {
          setLoadingCities(false);
        }
      }
    },
    [updateCity],
  );

  useEffect(() => {
    const cityParam = searchParams.get("cityId")?.trim() ?? "";
    if (!cityParam) {
      appliedCityFromUrlRef.current = null;
      return;
    }
    if (countries.length === 0) {
      return;
    }
    if (appliedCityFromUrlRef.current === cityParam) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const city = await fetchCityById(cityParam);
        if (cancelled || !city) {
          return;
        }
        const countryId = city.countryId ?? city.country?.id;
        if (!countryId) {
          return;
        }
        setSelectedCountryId(countryId);
        setLoadingCities(true);
        try {
          const data = await fetchCitiesByCountry(countryId);
          if (cancelled) {
            return;
          }
          setCities(extractCities(data));
        } catch {
          if (!cancelled) {
            toast.error("Failed to load cities");
          }
        } finally {
          if (!cancelled) {
            setLoadingCities(false);
          }
        }
        if (cancelled) {
          return;
        }
        updateCity(cityParam);
        appliedCityFromUrlRef.current = cityParam;
      } catch {
        // ignore invalid city id
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, countries.length, updateCity]);

  const formatCityLabel = useCallback(
    (cityId) => {
      const city = cityLookup.get(cityId);
      if (!city) return cityId;
      return city.stateName ? `${city.name} (${city.stateName})` : city.name;
    },
    [cityLookup],
  );

  const onSubmit = useCallback(
    (event) => {
      event.preventDefault();
      void resultsHook.submitTrip(formData);
    },
    [formData, resultsHook],
  );

  const copyShareLinkHandler = useCallback(async () => {
    if (!isAuthenticated) {
      try {
        const redirectTo = `${location.pathname}${location.search ?? ""}`;
        // store pending generation + action so we can resume after login
        try {
          const existing = localStorage.getItem(
            STORAGE_KEYS.pendingTripGeneration,
          );
          const obj = existing ? JSON.parse(existing) : {};
          obj.formData = formData;
          obj.action = "copy_link";
          localStorage.setItem(
            STORAGE_KEYS.pendingTripGeneration,
            JSON.stringify(obj),
          );
        } catch {}
        localStorage.setItem(STORAGE_KEYS.pendingAuthAction, "copy_link");
        localStorage.setItem(STORAGE_KEYS.pendingAuthRedirect, redirectTo);
      } catch {
        /* ignore */
      }

      navigate("/login");
      return;
    }

    // Delegate to sharing hook when authenticated
    try {
      await sharingHook.copyShareLink();
    } catch (e) {
      // ignore - sharing hook already shows toasts
    }
  }, [isAuthenticated, navigate, sharingHook]);

  // Handle a stored pending trip generation after successful auth
  const pendingActionRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.pendingTripGeneration);
      if (!raw) return;
      const pending = JSON.parse(raw);
      localStorage.removeItem(STORAGE_KEYS.pendingTripGeneration);
      localStorage.removeItem(STORAGE_KEYS.pendingAuthAction);
      localStorage.removeItem(STORAGE_KEYS.pendingAuthRedirect);

      pendingActionRef.current = pending?.action ?? null;

      (async () => {
        try {
          // If we have a raw generated payload (from guest generation) persist
          if (pending?.generatedPayload) {
            const { importGeneratedTripPlan } = await import("@/api/trips");
            const payload = {
              cityId: pending.formData?.cityId,
              days: pending.formData?.days,
              budget: pending.formData?.budget,
              persons: pending.formData?.persons,
              generatedPlan: pending.generatedPayload,
              title: pending.formData?.title ?? undefined,
              description: pending.formData?.description ?? undefined,
            };
            // API call will persist the exact generatedPlan and return saved trip
            const saved = await importGeneratedTripPlan(payload);
            try {
              const { normalizeStoredPlan } =
                await import("@/utils/trips/dataNormalizers");
              const next = normalizeStoredPlan(saved);
              if (next) {
                resultsHook.setTripPlan(next);
              }
            } catch {
              // fallback: try to trigger a refresh via submit
              if (pending?.formData) {
                void resultsHook.submitTrip(pending.formData);
              }
            }
            return;
          }

          // fallback: if no raw generated payload, re-generate while authenticated
          if (pending?.formData) {
            void resultsHook.submitTrip(pending.formData);
          }
        } catch (e) {
          // ignore errors here; user can re-run generation after login
        }
      })();
    } catch (e) {
      /* ignore parse errors */
    }
  }, [isAuthenticated, resultsHook]);

  // After a persisted trip appears, perform any pending share/publish action
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!resultsHook.tripPlan) return;
    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;

    if (action === "copy_link") {
      void sharingHook.copyShareLink();
    } else if (action === "publish") {
      void sharingHook.publishPlan();
    }
  }, [isAuthenticated, resultsHook.tripPlan, sharingHook]);

  // Combine all return values
  return {
    // Form state
    formData,
    errors,
    isValid,
    budgetTooLow,
    minimumBudget,

    // Location data
    countries,
    cities,
    tags,
    selectedCountryId,
    loadingCountries,
    loadingCities,

    // Results state
    tripPlan: resultsHook.tripPlan,
    generating: resultsHook.generating,
    resultsRef: resultsHook.resultsRef,
    finishAnimation: resultsHook.finishAnimation,
    commitPendingPlan: resultsHook.commitPendingPlan,

    // Sharing state
    publishing: sharingHook.publishing,
    hasShareLink: sharingHook.hasShareLink,
    publicShareUrl: sharingHook.publicShareUrl,

    // Saved plans state
    savedPlans: savedPlansHook.savedPlans,
    loadingPlans: savedPlansHook.loadingPlans,
    planToDelete: savedPlansHook.planToDelete,

    // Auth state
    isAuthenticated,

    // Formatters
    formatCityLabel,
    formatDate,

    // Form handlers
    updateCity,
    updateDays,
    updateBudget,
    updatePersons,
    toggleInterest,
    onCountryChange,
    onSubmit,

    // Results handlers
    clearPlan: resultsHook.clearPlan,
    publishPlan: sharingHook.publishPlan,
    copyShareLink: copyShareLinkHandler,
    addToWishlist: resultsHook.addToWishlist,
    viewPlace: resultsHook.viewPlace,

    // Saved plans handlers
    loadPlan: resultsHook.loadSavedPlan,
    removePlan: savedPlansHook.removePlan,
    confirmDeletePlan: savedPlansHook.confirmDeletePlan,
    cancelDeletePlan: savedPlansHook.cancelDeletePlan,
  };
};
