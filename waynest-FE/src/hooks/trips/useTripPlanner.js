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
import { useCurrency } from "@/context/CurrencyContext";
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
  const countryCitiesRequestIdRef = useRef(0);
  const hasPlannerCityPrefill = Boolean(searchParams.get("cityId")?.trim());
  const hasPlannerDestinationPrefill =
    hasPlannerCityPrefill ||
    Boolean(searchParams.get("destination")?.trim()) ||
    Boolean(searchParams.get("country")?.trim()) ||
    Boolean(searchParams.get("countryId")?.trim());
  const hasPlannerDestinationNamePrefill =
    Boolean(searchParams.get("destination")?.trim()) && !hasPlannerCityPrefill;

  const {
    formData,
    errors,
    isValid,
    budgetTooLow,
    minimumBudget,
    resetForm,
    setFormData,
    updateCity,
    updateDays,
    updateBudget,
    updateCurrency,
    updateStartDate,
    updatePersons,
    toggleInterest,
  } = useTripForm();
  const { selectedCurrency } = useCurrency();
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

  const normalizeText = useCallback(
    (value) =>
      String(value ?? "")
        .trim()
        .toLowerCase(),
    [],
  );

  const resolveCountryId = useCallback(
    (value) => {
      const normalizedValue = normalizeText(value);
      if (!normalizedValue) {
        return "";
      }

      const matchedCountry = countries.find((country) => {
        const normalizedId = normalizeText(country?.id);
        const normalizedName = normalizeText(country?.name);
        const normalizedCode = normalizeText(
          country?.alpha2Code ?? country?.code ?? country?.iso2,
        );

        return (
          normalizedId === normalizedValue ||
          normalizedName === normalizedValue ||
          normalizedCode === normalizedValue
        );
      });

      return matchedCountry?.id ?? "";
    },
    [countries, normalizeText],
  );

  const resolveCountryName = useCallback(
    (value) => {
      const normalizedValue = normalizeText(value);
      if (!normalizedValue) {
        return "";
      }

      const matchedCountry = countries.find((country) => {
        const normalizedId = normalizeText(country?.id);
        const normalizedName = normalizeText(country?.name);
        const normalizedCode = normalizeText(
          country?.alpha2Code ?? country?.code ?? country?.iso2,
        );

        return (
          normalizedId === normalizedValue ||
          normalizedName === normalizedValue ||
          normalizedCode === normalizedValue
        );
      });

      return matchedCountry?.name ?? "";
    },
    [countries, normalizeText],
  );

  const getCityCountryId = useCallback(
    (city) => {
      if (!city || typeof city !== "object") {
        return "";
      }

      return (
        city.countryId ??
        city.country?.id ??
        resolveCountryId(city.country?.name ?? city.countryName ?? "")
      );
    },
    [resolveCountryId],
  );

  const loadCitiesForCountry = useCallback(
    async (countryId) => {
      const normalizedCountryId = String(countryId ?? "").trim();
      if (!normalizedCountryId) {
        countryCitiesRequestIdRef.current += 1;
        setCities([]);
        setLoadingCities(false);
        return [];
      }

      const countryExists = countries.some(
        (country) => String(country?.id ?? "").trim() === normalizedCountryId,
      );
      if (!countryExists) {
        countryCitiesRequestIdRef.current += 1;
        setCities([]);
        setLoadingCities(false);
        return [];
      }

      const requestId = ++countryCitiesRequestIdRef.current;

      try {
        setLoadingCities(true);
        const data = await fetchCitiesByCountry(normalizedCountryId);
        if (requestId !== countryCitiesRequestIdRef.current) {
          return [];
        }
        const nextCities = extractCities(data);
        setCities(nextCities);
        return nextCities;
      } catch {
        if (requestId !== countryCitiesRequestIdRef.current) {
          return [];
        }
        toast.error("Failed to load cities");
        return [];
      } finally {
        if (requestId === countryCitiesRequestIdRef.current) {
          setLoadingCities(false);
        }
      }
    },
    [countries],
  );

  const resolveCityByDestination = useCallback(
    (destination, countryValue = "") => {
      const normalizedDestination = normalizeText(destination);
      const normalizedCountryValue = normalizeText(countryValue);
      if (!normalizedDestination) {
        return null;
      }

      const matchesCountry = (city) => {
        if (!normalizedCountryValue) {
          return true;
        }

        return (
          normalizeText(city?.countryId) === normalizedCountryValue ||
          normalizeText(city?.country?.id) === normalizedCountryValue ||
          normalizeText(city?.country?.name) === normalizedCountryValue ||
          normalizeText(city?.countryName) === normalizedCountryValue ||
          normalizeText(city?.country?.alpha2Code) === normalizedCountryValue ||
          normalizeText(city?.countryCode) === normalizedCountryValue
        );
      };

      const matches = (city) => {
        const name = normalizeText(city?.name);
        const stateName = normalizeText(city?.stateName);
        const slug = normalizeText(city?.slug);
        const isDestinationMatch =
          name === normalizedDestination ||
          stateName === normalizedDestination ||
          slug === normalizedDestination ||
          name.includes(normalizedDestination) ||
          stateName.includes(normalizedDestination) ||
          slug.includes(normalizedDestination);

        return matchesCountry(city) && isDestinationMatch;
      };

      return cities.find(matches) ?? null;
    },
    [cities, normalizeText],
  );

  useEffect(() => {
    const bootstrap = async () => {
      const tasks = [loadCountries(), loadTags(), loadCurrencies()];

      if (hasPlannerDestinationNamePrefill) {
        tasks.push(loadCities());
      }

      await Promise.all(tasks);
    };

    void bootstrap();
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
      return;
    }

    if (!hasPlannerDestinationPrefill) {
      countryCitiesRequestIdRef.current += 1;
      setSelectedCountryId(null);
      setCities([]);
      updateCity("");
    }
  }, [
    hasPlannerDestinationNamePrefill,
    hasPlannerDestinationPrefill,
    location,
    setFormData,
    updateCity,
  ]);

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

  // Apply global selected currency only if the form has no currency set yet.
  // Do NOT override when the user has already chosen a currency.
  useEffect(() => {
    if (!selectedCurrency) return;
    if (formData?.currencyCode) return; // don't override an explicit choice
    try {
      updateCurrency(selectedCurrency);
    } catch {}
  }, [selectedCurrency, formData?.currencyCode, updateCurrency]);

  const onCountryChange = useCallback(
    async (countryId) => {
      const normalizedCountryId = String(countryId ?? "").trim();

      setSelectedCountryId(normalizedCountryId || null);
      updateCity("");
      if (normalizedCountryId) {
        await loadCitiesForCountry(normalizedCountryId);
      } else {
        countryCitiesRequestIdRef.current += 1;
        setCities([]);
        setLoadingCities(false);
      }
    },
    [loadCitiesForCountry, updateCity],
  );

  useEffect(() => {
    const cityParam = searchParams.get("cityId")?.trim() ?? "";
    const destinationParam = searchParams.get("destination")?.trim() ?? "";
    const countryParam = searchParams.get("country")?.trim() ?? "";
    const countryIdParam = searchParams.get("countryId")?.trim() ?? "";

    if (!cityParam && !destinationParam && !countryParam && !countryIdParam) {
      appliedCityFromUrlRef.current = null;
      return;
    }
    if (!cityParam) {
      return;
    }
    if (cities.length === 0 && countries.length === 0) return;
    const countryKey = countryIdParam || normalizeText(countryParam);
    const appliedKey = `cityId:${cityParam}:${countryKey}`;
    if (appliedCityFromUrlRef.current === appliedKey) return;

    let cancelled = false;
    void (async () => {
      let city = cities.find((entry) => entry.id === cityParam) ?? null;

      try {
        if (!city) {
          city = await fetchCityById(cityParam);
        }
        if (cancelled || !city) return;

        const fallbackCountryId =
          countryIdParam || resolveCountryId(countryParam);
        const countryId = getCityCountryId(city) || fallbackCountryId;

        if (countryId) {
          setSelectedCountryId(countryId);
          const countryCities = await loadCitiesForCountry(countryId);
          if (cancelled) return;

          const matchedCity =
            countryCities.find((entry) => entry.id === cityParam) ?? city;
          updateCity(matchedCity.id ?? cityParam);
          appliedCityFromUrlRef.current = appliedKey;
          return;
        }

        setCities((current) => {
          if (current.some((entry) => entry.id === city.id)) {
            return current;
          }
          return [...current, city];
        });
        updateCity(city.id ?? cityParam);
        appliedCityFromUrlRef.current = appliedKey;
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    cities,
    countries.length,
    getCityCountryId,
    loadCitiesForCountry,
    normalizeText,
    resolveCountryId,
    updateCity,
  ]);

  useEffect(() => {
    const destinationParam = searchParams.get("destination")?.trim() ?? "";
    const cityParam = searchParams.get("cityId")?.trim() ?? "";
    const countryParam = searchParams.get("country")?.trim() ?? "";
    const countryIdParam = searchParams.get("countryId")?.trim() ?? "";

    if (!destinationParam || cityParam) {
      return;
    }

    if (cities.length === 0) {
      return;
    }

    const countryKey = countryIdParam || normalizeText(countryParam);
    const appliedKey = `destination:${normalizeText(destinationParam)}:${countryKey}`;
    if (appliedCityFromUrlRef.current === appliedKey) {
      return;
    }

    const matchedCity = resolveCityByDestination(
      destinationParam,
      countryIdParam || countryParam,
    );
    if (!matchedCity) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const countryId =
        getCityCountryId(matchedCity) ||
        countryIdParam ||
        resolveCountryId(countryParam);

      if (countryId) {
        setSelectedCountryId(countryId);
        const countryCities = await loadCitiesForCountry(countryId);
        if (cancelled) return;
        const nextCity =
          countryCities.find((entry) => entry.id === matchedCity.id) ??
          matchedCity;
        updateCity(nextCity.id);
        appliedCityFromUrlRef.current = appliedKey;
        return;
      }

      updateCity(matchedCity.id);
      appliedCityFromUrlRef.current = appliedKey;
    })();

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    cities,
    getCityCountryId,
    loadCitiesForCountry,
    normalizeText,
    resolveCityByDestination,
    resolveCountryId,
    updateCity,
  ]);

  const formatCityLabel = useCallback(
    (cityId) => {
      const city = cityLookup.get(cityId);
      if (!city) return cityId;
      return city.stateName ? `${city.name} (${city.stateName})` : city.name;
    },
    [cityLookup],
  );

  const plannerPrefill = useMemo(() => {
    const placeName = searchParams.get("placeName")?.trim() ?? "";
    const destinationParam = searchParams.get("destination")?.trim() ?? "";
    const countryParam = searchParams.get("country")?.trim() ?? "";
    const selectedCity = cityLookup.get(formData.cityId) ?? null;

    const cityName = selectedCity?.name ?? destinationParam;
    const stateName = selectedCity?.stateName ?? "";
    const resolvedCountryName =
      selectedCity?.country?.name ??
      selectedCity?.countryName ??
      resolveCountryName(selectedCountryId);
    const countryName = resolvedCountryName || countryParam;

    if (!placeName && !cityName && !countryName) {
      return null;
    }

    return {
      placeName,
      cityName,
      stateName,
      countryName,
    };
  }, [
    cityLookup,
    formData.cityId,
    resolveCountryName,
    searchParams,
    selectedCountryId,
  ]);

  // If the form has a saved cityId but the cities list doesn't include it yet,
  // fetch the single city so the Select can render a friendly label instead
  // of showing a raw id. Also set the country when available.
  useEffect(() => {
    const cityId = formData?.cityId;
    if (!cityId) return;
    const existingCity = cities.find((c) => c.id === cityId) ?? null;

    if (existingCity) {
      const countryId = getCityCountryId(existingCity);
      if (countryId && selectedCountryId !== countryId) {
        setSelectedCountryId(countryId);
        void loadCitiesForCountry(countryId);
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const city = await fetchCityById(cityId);
        if (cancelled || !city) return;
        // ensure the cities list contains this city so Select shows label
        setCities((prev) => {
          if (prev.some((c) => c.id === city.id)) return prev;
          return [...prev, city];
        });
        const countryId = getCityCountryId(city);
        if (countryId) setSelectedCountryId(countryId);
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [
    formData?.cityId,
    cities,
    getCityCountryId,
    loadCitiesForCountry,
    selectedCountryId,
  ]);

  const onSubmit = useCallback(
    (data) => {
      // data may contain addToCalendar from the form; merge into formData
      const merged = { ...formData, ...(typeof data === 'object' ? data : {}) };
      void resultsHook.submitTrip(merged);
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
              startDate: pending.formData?.startDate,
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

  const openSavedPlan = useCallback(
    (plan) => {
      const planId =
        typeof plan === "string"
          ? plan
          : typeof plan?.id === "string"
            ? plan.id
            : "";
      const shareSlug =
        typeof plan === "object" && typeof plan?.shareSlug === "string"
          ? plan.shareSlug.trim()
          : "";

      if (shareSlug) {
        navigate(`/trip/${encodeURIComponent(shareSlug)}`);
        return;
      }

      if (planId) {
        navigate(`/saved-plans/${encodeURIComponent(planId)}`);
      }
    },
    [navigate],
  );

  return {
    formData,
    errors,
    isValid,
    budgetTooLow,
    minimumBudget,
    resetForm,
    setFormData,
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
    plannerPrefill,
    formatCityLabel,
    formatDate,
    updateCity,
    updateDays,
    updateBudget,
    updateCurrency,
    updateStartDate,
    updatePersons,
    toggleInterest,
    onCountryChange,
    onSubmit,
    clearPlan: resultsHook.clearPlan,
    publishPlan: sharingHook.publishPlan,
    copyShareLink: copyShareLinkHandler,
    shareTitle: sharingHook.shareTitle,
    setShareTitle: sharingHook.setShareTitle,
    shareVisibility: sharingHook.shareVisibility,
    setShareVisibility: sharingHook.setShareVisibility,
    addToWishlist: resultsHook.addToWishlist,
    viewEvent: resultsHook.viewEvent,
    viewPlace: resultsHook.viewPlace,
    loadPlan: resultsHook.loadSavedPlan,
    openSavedPlan,
    removePlan: savedPlansHook.removePlan,
    confirmDeletePlan: savedPlansHook.confirmDeletePlan,
    cancelDeletePlan: savedPlansHook.cancelDeletePlan,
    setTripPlan: resultsHook.setTripPlan,
  };
};
