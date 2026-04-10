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
  fetchAllCurrencies,
} from "@/api/catalog";
import {
  extractCities,
  extractCountries,
  extractTags,
} from "@/utils/trips/dataNormalizers";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { getRemixDraft, clearRemixDraft } from "@/utils/trips/inMemoryDraft";
import {
  loadRemixDraft,
  clearRemixDraft as clearStoredRemixDraft,
} from "@/utils/trips/storage";
import { formatDate } from "@/utils/trips/formatters";
import { loadRemoteRates } from "@/utils/currency";

export const useTripPlanner = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const appliedCityFromUrlRef = useRef(null);

  const {
    formData,
    errors,
    isValid,
    budgetTooLow,
    minimumBudget,
    updateCity,
    updateDays,
    updateBudget,
    updateCurrency,
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

  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  const cityLookup = useMemo(() => {
    const map = new Map();
    cities.forEach((city) => map.set(city.id, city));
    return map;
  }, [cities]);

  useEffect(() => {
    void loadInitialData();
    const stateRemix = location?.state?.remixDraft ?? null;
    const remixDraft = stateRemix ?? getRemixDraft() ?? loadRemixDraft();
    if (remixDraft) {
      setFormData(remixDraft);
      try {
        clearRemixDraft();
      } catch {}
      try {
        clearStoredRemixDraft();
      } catch {}
      toast.info("Shared trip loaded into the planner");
    }
  }, [setFormData, location]);

  const loadInitialData = async () => {
    await Promise.all([
      loadCountries(),
      loadCities(),
      loadTags(),
      loadCurrencies(),
    ]);
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

  const loadCurrencies = async () => {
    try {
      setLoadingCurrencies(true);
      const data = await fetchAllCurrencies();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setCurrencies(list);
      try {
        void loadRemoteRates("ILS");
      } catch {}
    } catch {
      toast.error("Failed to load currencies");
    } finally {
      setLoadingCurrencies(false);
    }
  };

  const onCountryChange = useCallback(
    async (countryId) => {
      setSelectedCountryId(countryId);
      updateCity("");
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
    if (countries.length === 0) return;
    if (appliedCityFromUrlRef.current === cityParam) return;

    let cancelled = false;
    void (async () => {
      try {
        const city = await fetchCityById(cityParam);
        if (cancelled || !city) return;
        const countryId = city.countryId ?? city.country?.id;
        if (!countryId) return;
        setSelectedCountryId(countryId);
        setLoadingCities(true);
        try {
          const data = await fetchCitiesByCountry(countryId);
          if (cancelled) return;
          setCities(extractCities(data));
        } catch {
          if (!cancelled) toast.error("Failed to load cities");
        } finally {
          if (!cancelled) setLoadingCities(false);
        }
        if (cancelled) return;
        updateCity(cityParam);
        appliedCityFromUrlRef.current = cityParam;
      } catch {}
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
      } catch {}
      navigate("/login");
      return;
    }
    try {
      await sharingHook.copyShareLink();
    } catch {}
  }, [isAuthenticated, navigate, sharingHook, formData, location]);

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
            const saved = await importGeneratedTripPlan(payload);
            try {
              const { normalizeStoredPlan } =
                await import("@/utils/trips/dataNormalizers");
              const next = normalizeStoredPlan(saved);
              if (next) resultsHook.setTripPlan(next);
            } catch {
              if (pending?.formData)
                void resultsHook.submitTrip(pending.formData);
            }
            return;
          }
          if (pending?.formData) void resultsHook.submitTrip(pending.formData);
        } catch {}
      })();
    } catch {}
  }, [isAuthenticated, resultsHook]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!resultsHook.tripPlan) return;
    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;
    if (action === "copy_link") void sharingHook.copyShareLink();
    else if (action === "publish") void sharingHook.publishPlan();
  }, [isAuthenticated, resultsHook.tripPlan, sharingHook]);

  return {
    formData,
    errors,
    isValid,
    budgetTooLow,
    minimumBudget,
    countries,
    cities,
    currencies,
    tags,
    selectedCountryId,
    loadingCountries,
    loadingCurrencies,
    loadingCities,
    tripPlan: resultsHook.tripPlan,
    generating: resultsHook.generating,
    resultsRef: resultsHook.resultsRef,
    finishAnimation: resultsHook.finishAnimation,
    commitPendingPlan: resultsHook.commitPendingPlan,
    publishing: sharingHook.publishing,
    hasShareLink: sharingHook.hasShareLink,
    publicShareUrl: sharingHook.publicShareUrl,
    savedPlans: savedPlansHook.savedPlans,
    loadingPlans: savedPlansHook.loadingPlans,
    planToDelete: savedPlansHook.planToDelete,
    isAuthenticated,
    formatCityLabel,
    formatDate,
    updateCity,
    updateDays,
    updateBudget,
    updateCurrency,
    updatePersons,
    toggleInterest,
    onCountryChange,
    onSubmit,
    clearPlan: resultsHook.clearPlan,
    publishPlan: sharingHook.publishPlan,
    copyShareLink: copyShareLinkHandler,
    addToWishlist: resultsHook.addToWishlist,
    viewPlace: resultsHook.viewPlace,
    loadPlan: resultsHook.loadSavedPlan,
    removePlan: savedPlansHook.removePlan,
    confirmDeletePlan: savedPlansHook.confirmDeletePlan,
    cancelDeletePlan: savedPlansHook.cancelDeletePlan,
    setTripPlan: resultsHook.setTripPlan,
  };
};
