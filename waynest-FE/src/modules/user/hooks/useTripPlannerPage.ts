import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { STORAGE_KEYS } from "@/core/constants/storageKeys";
import { copyTextToClipboard } from "@/core/utils/clipboard";
import {
  getApiErrorMessage,
  getApiErrorStatus,
  isApiTimeoutError,
} from "@/core/utils/errors";
import { useAuth } from "@/core/providers/AuthContext";
import {
  fetchAllCountries,
  fetchCitiesByCountry,
  fetchCityById,
  fetchTags,
} from "@/services/catalog/catalog.service";
import type { CatalogCountry } from "@/services/catalog/catalog.service";
import { addWishlistItem } from "@/services/wishlist/wishlist.service";
import {
  deleteTripPlan,
  fetchSavedTripPlans,
  fetchTripPlanById,
  generateTripPlan,
  publishTripPlan,
} from "@/services/tripPlanner/tripPlanner.service";
import type {
  CreateTripPlannerDto,
  ShareTripResponse,
  TripDayView,
  TripPlanResponse,
  TripPlanSummary,
  TripPlanView,
  TripPlannerCity,
  TripPlannerTag,
  TripRemixDraft,
  TripSlot,
} from "../pages/tripPlanner/tripPlanner.types";

type TripPlanRecord = {
  id: string;
  cityId: string;
  days: number;
  budget: number | string;
  persons: number;
  createdAt: string;
  generatedPlan?: unknown;
  totalEstimatedCost?: number;
  shareSlug?: string | null;
  isPublic?: boolean;
  title?: string | null;
  description?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractCities = (payload: unknown): TripPlannerCity[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (city): city is TripPlannerCity =>
        isRecord(city) &&
        typeof city.id === "string" &&
        typeof city.name === "string",
    );
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.filter(
      (city): city is TripPlannerCity =>
        isRecord(city) &&
        typeof city.id === "string" &&
        typeof city.name === "string",
    );
  }

  return [];
};

const extractTags = (payload: unknown): TripPlannerTag[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (tag): tag is TripPlannerTag =>
        isRecord(tag) &&
        typeof tag.id === "string" &&
        typeof tag.name === "string",
    );
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.filter(
      (tag): tag is TripPlannerTag =>
        isRecord(tag) &&
        typeof tag.id === "string" &&
        typeof tag.name === "string",
    );
  }

  return [];
};

const normalizeNumber = (value: unknown, fallback = 0) => {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : fallback;
};

const toLocalTripUrl = (rawUrl?: string | null, shareSlug?: string | null) => {
  if (typeof window === "undefined") {
    return null;
  }
  if (shareSlug) {
    return `${window.location.origin}/trip/${shareSlug}`;
  }
  if (!rawUrl) {
    return null;
  }
  try {
    const parsed = new URL(rawUrl);
    return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

const normalizeSlot = (value: unknown): TripSlot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const name = typeof value.name === "string" ? value.name : "";
  const duration = typeof value.duration === "string" ? value.duration : "";
  if (!name || !duration) {
    return null;
  }

  return {
    closeTime:
      typeof value.closeTime === "string" ? value.closeTime : undefined,
    duration,
    estimatedCost: normalizeNumber(value.estimatedCost, 0),
    name,
    openTime: typeof value.openTime === "string" ? value.openTime : undefined,
    placeId: typeof value.placeId === "string" ? value.placeId : undefined,
    type: typeof value.type === "string" ? value.type : undefined,
  };
};

const normalizeDay = (value: unknown, index: number): TripDayView | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    afternoon: normalizeSlot(value.afternoon),
    day: typeof value.day === "number" ? value.day : index + 1,
    evening: normalizeSlot(value.evening),
    morning: normalizeSlot(value.morning),
    totalDayCost: normalizeNumber(value.totalDayCost, 0),
  };
};

const normalizeGeneratedPlan = (value: unknown): TripPlanView | null => {
  if (!isRecord(value)) {
    return null;
  }
  const resolvedTripPlanId =
    typeof value.tripPlanId === "string" && value.tripPlanId.trim().length > 0
      ? value.tripPlanId
      : `guest-${Date.now()}`;

  const days = Array.isArray(value.days)
    ? value.days
        .map((day, index) => normalizeDay(day, index))
        .filter((day): day is TripDayView => day !== null)
    : [];

  return {
    days,
    description: typeof value.description === "string" ? value.description : null,
    isPublic: typeof value.isPublic === "boolean" ? value.isPublic : false,
    shareSlug: typeof value.shareSlug === "string" ? value.shareSlug : null,
    shareUrl: typeof value.shareUrl === "string" ? value.shareUrl : null,
    tips: Array.isArray(value.tips)
      ? value.tips.filter((tip): tip is string => typeof tip === "string")
      : [],
    title: typeof value.title === "string" ? value.title : null,
    totalEstimatedCost: normalizeNumber(value.totalEstimatedCost, 0),
    tripPlanId: resolvedTripPlanId,
  };
};

const normalizeStoredPlan = (value: unknown): TripPlanView | null => {
  if (!isRecord(value) || typeof value.id !== "string" || !isRecord(value.generatedPlan)) {
    return null;
  }

  const generatedPlan = value.generatedPlan as Record<string, unknown>;
  const days = Array.isArray(generatedPlan.days)
    ? generatedPlan.days
        .map((day, index) => normalizeDay(day, index))
        .filter((day): day is TripDayView => day !== null)
    : [];

  return {
    days,
    description: typeof value.description === "string" ? value.description : null,
    isPublic: typeof value.isPublic === "boolean" ? value.isPublic : false,
    shareSlug: typeof value.shareSlug === "string" ? value.shareSlug : null,
    shareUrl: typeof value.shareUrl === "string" ? value.shareUrl : null,
    tips: Array.isArray(generatedPlan.tips)
      ? generatedPlan.tips.filter((tip): tip is string => typeof tip === "string")
      : [],
    title: typeof value.title === "string" ? value.title : null,
    totalEstimatedCost: normalizeNumber(generatedPlan.totalEstimatedCost, 0),
    tripPlanId: value.id,
  };
};

const extractTripPlans = (payload: unknown): TripPlanSummary[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter(
      (plan): plan is TripPlanRecord =>
        isRecord(plan) &&
        typeof plan.id === "string" &&
        typeof plan.cityId === "string",
    )
    .map((plan) => ({
      budget: Number(plan.budget ?? 0),
      cityId: plan.cityId,
      createdAt: plan.createdAt,
      days: Number(plan.days ?? 0),
      description: typeof plan.description === "string" ? plan.description : null,
      id: plan.id,
      isPublic: Boolean(plan.isPublic),
      persons: Number(plan.persons ?? 0),
      shareSlug: plan.shareSlug ?? null,
      title: typeof plan.title === "string" ? plan.title : null,
      totalEstimatedCost: normalizeNumber(plan.totalEstimatedCost, 0),
    }));
};

export const useTripPlannerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [formData, setFormData] = useState<CreateTripPlannerDto>({
    budget: 1000,
    cityId: "",
    days: 3,
    interests: [],
    persons: 2,
  });
  const [cities, setCities] = useState<TripPlannerCity[]>([]);
  const [tags, setTags] = useState<TripPlannerTag[]>([]);
  const [tripPlan, setTripPlan] = useState<TripPlanView | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [countries, setCountries] = useState<CatalogCountry[]>([]);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedPlans, setSavedPlans] = useState<TripPlanSummary[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const tripResultStorageKey = user?.userId
    ? `${STORAGE_KEYS.tripPlannerResult}:${user.userId}`
    : null;
  const loginRedirectState = { from: location };

  const cityLookup = useMemo(() => {
    const map = new Map<string, TripPlannerCity>();
    cities.forEach((city) => {
      map.set(city.id, city);
    });
    return map;
  }, [cities]);

  useEffect(() => {
    let isMounted = true;
    localStorage.removeItem(STORAGE_KEYS.tripPlannerResult);
    const storedForm = localStorage.getItem(STORAGE_KEYS.tripPlannerForm);
    let restoredCityId = "";
    if (storedForm) {
      try {
        const parsed = JSON.parse(storedForm) as Partial<CreateTripPlannerDto>;
        restoredCityId = typeof parsed.cityId === "string" ? parsed.cityId : "";
        setFormData((current) => ({
          ...current,
          ...parsed,
          interests: parsed.interests ?? current.interests ?? [],
        }));
      } catch {
        localStorage.removeItem(STORAGE_KEYS.tripPlannerForm);
      }
    }

    const storedRemix = localStorage.getItem(STORAGE_KEYS.tripPlannerRemixDraft);
    if (storedRemix) {
      try {
        const parsed = JSON.parse(storedRemix) as Partial<TripRemixDraft>;
        setFormData((current) => ({
          ...current,
          budget: parsed.budget ?? current.budget,
          cityId: parsed.cityId ?? current.cityId,
          days: parsed.days ?? current.days,
          persons: parsed.persons ?? current.persons,
        }));
        localStorage.removeItem(STORAGE_KEYS.tripPlannerRemixDraft);
        if (tripResultStorageKey) {
          localStorage.removeItem(tripResultStorageKey);
        }
        setTripPlan(null);
        toast.info("Shared trip loaded into the planner");
      } catch {
        localStorage.removeItem(STORAGE_KEYS.tripPlannerRemixDraft);
      }
    }

    if (tripResultStorageKey) {
      const storedResult = localStorage.getItem(tripResultStorageKey);
      if (storedResult) {
        try {
          const parsed = JSON.parse(storedResult) as unknown;
          const nextTripPlan =
            normalizeGeneratedPlan(parsed) ?? normalizeStoredPlan(parsed);
          if (nextTripPlan) {
            setTripPlan(nextTripPlan);
          }
        } catch {
          localStorage.removeItem(tripResultStorageKey);
        }
      }
    }

    const bootstrapData = async () => {
      await Promise.all([loadCountries(), loadTags()]);

      if (!isMounted) {
        return;
      }

      if (!restoredCityId) {
        setSelectedCountryId(null);
        setCities([]);
        return;
      }

      try {
        const city = await fetchCityById(restoredCityId);
        const countryId =
          city?.countryId ??
          (city?.country && typeof city.country.id === "string"
            ? city.country.id
            : null);

        if (!countryId) {
          setSelectedCountryId(null);
          setFormData((current) => ({ ...current, cityId: "" }));
          setCities([]);
          return;
        }

        setSelectedCountryId(countryId);
        await loadCities(countryId);
      } catch {
        setSelectedCountryId(null);
        setFormData((current) => ({ ...current, cityId: "" }));
        setCities([]);
        toast.error("Failed to restore selected city");
      }
    };

    void bootstrapData();

    return () => {
      isMounted = false;
    };
  }, [tripResultStorageKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tripPlannerForm, JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (!tripResultStorageKey) {
      return;
    }

    if (tripPlan) {
      localStorage.setItem(tripResultStorageKey, JSON.stringify(tripPlan));
    } else {
      localStorage.removeItem(tripResultStorageKey);
    }
  }, [tripPlan, tripResultStorageKey]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadSavedPlans();
    } else {
      setSavedPlans([]);
    }
  }, [isAuthenticated]);

  const loadCities = async (countryId: string) => {
    try {
      setLoadingCities(true);
      const nextCities = extractCities(await fetchCitiesByCountry(countryId));
      setCities(nextCities);
    } catch {
      toast.error("Failed to load cities");
    } finally {
      setLoadingCities(false);
    }
  };

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const nextCountries = await fetchAllCountries();
      setCountries(nextCountries);
    } catch {
      toast.error("Failed to load countries");
    } finally {
      setLoadingCountries(false);
    }
  };

  const onCountryChange = async (countryId: string) => {
    setSelectedCountryId(countryId);
    setFormData((current) => ({ ...current, cityId: "" }));
    setCities([]);
    
    if (countryId) {
      await loadCities(countryId);
    }
  };

  const loadTags = async () => {
    try {
      const payload = await fetchTags();
      setTags(extractTags(payload));
    } catch {
      toast.error("Failed to load interests");
    }
  };

  const loadSavedPlans = async () => {
    try {
      setLoadingPlans(true);
      const payload = await fetchSavedTripPlans();
      setSavedPlans(extractTripPlans(payload));
    } catch (error) {
      if (getApiErrorStatus(error) !== 401) {
        toast.error("Failed to load saved plans");
      }
    } finally {
      setLoadingPlans(false);
    }
  };

  const updateCity = (value: string) => {
    setFormData((current) => ({
      ...current,
      cityId: value,
    }));
  };

  const updateDays = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({
      ...current,
      days: Math.max(1, Number(event.target.value || 1)),
    }));
  };

  const updateBudget = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({
      ...current,
      budget: Math.max(0, Number(event.target.value || 0)),
    }));
  };

  const updatePersons = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({
      ...current,
      persons: Math.max(1, Number(event.target.value || 1)),
    }));
  };

  const toggleInterest = (tagName: string) => {
    setFormData((current) => {
      const interests = current.interests ?? [];
      return {
        ...current,
        interests: interests.includes(tagName)
          ? interests.filter((interest) => interest !== tagName)
          : [...interests, tagName],
      };
    });
  };

  const addToWishlist = async (placeId: string) => {
    try {
      await addWishlistItem(placeId);
      toast.success("Added to wishlist");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to add to wishlist"));
    }
  };

  const viewPlace = (placeId: string) => {
    navigate(`/places/${placeId}`);
  };

  const loadPlan = async (planId: string) => {
    try {
      setLoadingPlans(true);
      const payload = await fetchTripPlanById(planId);
      const nextTripPlan = normalizeStoredPlan(payload);
      if (!nextTripPlan) {
        toast.error("Failed to load selected plan");
        return;
      }

      setTripPlan(nextTripPlan);
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      if (getApiErrorStatus(error) === 401) {
        navigate("/login", { state: loginRedirectState });
      } else {
        toast.error("Failed to load selected plan");
      }
    } finally {
      setLoadingPlans(false);
    }
  };

  const removePlan = async (planId: string) => {
    setPlanToDelete(planId);
    return;
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) {
      return;
    }

    try {
      setLoadingPlans(true);
      await deleteTripPlan(planToDelete);
      setSavedPlans((current) => current.filter((plan) => plan.id !== planToDelete));
      if (tripPlan?.tripPlanId === planToDelete) {
        setTripPlan(null);
      }
      toast.success("Plan deleted");
    } catch (error) {
      if (getApiErrorStatus(error) === 401) {
        navigate("/login", { state: loginRedirectState });
      } else {
        toast.error("Failed to delete plan");
      }
    } finally {
      setLoadingPlans(false);
      setPlanToDelete(null);
    }
  };

  const cancelDeletePlan = () => {
    setPlanToDelete(null);
  };

  const clearPlan = () => {
    setTripPlan(null);
  };

  const publishPlan = async () => {
    if (!isAuthenticated) {
      toast.info("Please login to save or share this plan");
      navigate("/login", { state: loginRedirectState });
      return;
    }

    if (!tripPlan) {
      toast.error("Generate a trip first");
      return;
    }

    try {
      setPublishing(true);
      const cityLabel = formatCityLabel(formData.cityId);
      const title = tripPlan.title ?? `${cityLabel} in ${formData.days} days`;
      const description =
        tripPlan.description ??
        `A ${formData.days}-day itinerary for ${formData.persons} traveler(s) focused on ${
          formData.interests?.length
            ? formData.interests.join(", ")
            : "smart local discovery"
        }.`;

      const response = (await publishTripPlan(tripPlan.tripPlanId, {
        description,
        isPublic: true,
        title,
      })) as ShareTripResponse;

      const shareUrl = toLocalTripUrl(response.shareUrl, response.shareSlug);
      if (!shareUrl) {
        throw new Error("Share link missing");
      }

      const nextTripPlan: TripPlanView = {
        ...tripPlan,
        description,
        isPublic: response.isPublic,
        shareSlug: response.shareSlug,
        shareUrl,
        title,
      };

      setTripPlan(nextTripPlan);
      await copyTextToClipboard(shareUrl);
      toast.success("Public link copied");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to publish trip"));
    } finally {
      setPublishing(false);
    }
  };

  const copyShareLink = async () => {
    if (!isAuthenticated) {
      toast.info("Please login to save or share this plan");
      navigate("/login", { state: loginRedirectState });
      return;
    }

    const shareUrl =
      tripPlan?.isPublic
        ? toLocalTripUrl(tripPlan.shareUrl, tripPlan.shareSlug)
        : null;

    if (!shareUrl) {
      await publishPlan();
      return;
    }

    try {
      await copyTextToClipboard(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.cityId) {
      toast.error("Please select a city");
      return;
    }
    if (formData.days < 1) {
      toast.error("Days must be at least 1");
      return;
    }
    if (formData.budget <= 0) {
      toast.error("Budget must be greater than 0");
      return;
    }
    if (formData.persons < 1) {
      toast.error("Number of persons must be at least 1");
      return;
    }

    const minimumBudget = formData.persons * formData.days * 10;
    if (formData.budget < minimumBudget) {
      toast.warn("Budget may be too low");
    }

    toast.info("Generating your trip...", {
      autoClose: 25000,
      toastId: "trip-generation",
    });

    try {
      setGenerating(true);
      const payload = (await generateTripPlan(
        formData as unknown as Record<string, unknown>,
      )) as TripPlanResponse;
      const nextTripPlan = normalizeGeneratedPlan(payload);
      if (!nextTripPlan) {
        throw new Error("Invalid response");
      }

      // Generation now requires login; clear any legacy guest token.
      localStorage.removeItem(STORAGE_KEYS.guestTripToken);
      localStorage.removeItem("waynest_guest_trip_token");

      setTripPlan(nextTripPlan);
      toast.dismiss("trip-generation");
      toast.success("Trip plan ready!");
      if (isAuthenticated) {
        const newPlan: TripPlanSummary = {
          budget: formData.budget,
          cityId: formData.cityId,
          createdAt: new Date().toISOString(),
          days: formData.days,
          id: nextTripPlan.tripPlanId,
          persons: formData.persons,
          totalEstimatedCost: nextTripPlan.totalEstimatedCost,
        };
        setSavedPlans((current) => [
          newPlan,
          ...current.filter((plan) => plan.id !== newPlan.id),
        ]);
      }
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      toast.dismiss("trip-generation");
      if (isApiTimeoutError(error)) {
        toast.error("Request timed out. Try again.");
        return;
      }
      if (getApiErrorStatus(error) === 429) {
        toast.error(getApiErrorMessage(error, "Too many requests. Please wait a few minutes."));
        return;
      }
      if (getApiErrorStatus(error) === 401) {
        navigate("/login", { state: loginRedirectState });
        return;
      }
      toast.error(getApiErrorMessage(error, "Failed to generate trip plan"));
    } finally {
      setGenerating(false);
    }
  };

  const formatCityLabel = (cityId: string) => {
    const city = cityLookup.get(cityId);
    if (!city) {
      return cityId;
    }

    return city.stateName ? `${city.name} (${city.stateName})` : city.name;
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const minimumBudget = formData.persons * formData.days * 10;
  const budgetTooLow = formData.budget < minimumBudget;
  const hasShareLink = Boolean(
    tripPlan?.isPublic && (tripPlan.shareUrl || tripPlan.shareSlug),
  );
  const publicShareUrl = hasShareLink
    ? toLocalTripUrl(tripPlan?.shareUrl, tripPlan?.shareSlug) ?? ""
    : "";

  return {
    addToWishlist,
    budgetTooLow,
    cities,
    clearPlan,
    confirmDeletePlan,
    cancelDeletePlan,
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
    minimumBudget,
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
  };
};
