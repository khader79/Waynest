import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ADMIN_ENDPOINTS,
  TRIP_PLANNER_ENDPOINTS,
  WISHLIST_ENDPOINTS,
} from "../../../../api/endpoints";
import { del, get, postJson } from "../../../../api/apiService";
import type {
  CreateTripPlannerDto,
  ITripSlot,
  ShareTripResponse,
  TripPlanResponse,
  TripPlanSummary,
  TripRemixDraft,
} from "../../../../types/tripPlanner";
import { useAuth } from "../../../../context/AuthContext";
import "./TripPlanner.css";

type City = {
  id: string;
  name: string;
  stateName?: string;
};

type Tag = {
  id: string;
  name: string;
};

type TripSlotValue = ITripSlot | null;

type TripDayView = {
  day: number;
  morning: TripSlotValue;
  afternoon: TripSlotValue;
  evening: TripSlotValue;
  totalDayCost: number;
};

type TripPlanView = {
  tripPlanId: string;
  days: TripDayView[];
  totalEstimatedCost: number;
  tips: string[];
  shareSlug?: string | null;
  shareUrl?: string | null;
  isPublic?: boolean;
  title?: string | null;
  description?: string | null;
};

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

const STORAGE_KEY_FORM = "trip_planner_form";
const STORAGE_KEY_RESULT = "trip_planner_result";
const STORAGE_KEY_REMIX = "waynest_trip_remix_draft";
const STORAGE_KEY_GUEST_TOKEN = "waynest_guest_trip_token";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractCities = (payload: unknown): City[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (city): city is City =>
        isRecord(city) &&
        typeof city.id === "string" &&
        typeof city.name === "string",
    );
  }
  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.filter(
      (city): city is City =>
        isRecord(city) &&
        typeof city.id === "string" &&
        typeof city.name === "string",
    );
  }
  return [];
};

const extractTags = (payload: unknown): Tag[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (tag): tag is Tag =>
        isRecord(tag) &&
        typeof tag.id === "string" &&
        typeof tag.name === "string",
    );
  }
  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.filter(
      (tag): tag is Tag =>
        isRecord(tag) &&
        typeof tag.id === "string" &&
        typeof tag.name === "string",
    );
  }
  return [];
};

const extractTripPlans = (payload: unknown): TripPlanSummary[] => {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(
      (plan): plan is TripPlanRecord =>
        isRecord(plan) &&
        typeof plan.id === "string" &&
        typeof plan.cityId === "string",
    )
    .map((plan) => ({
      id: plan.id,
      cityId: plan.cityId,
      days: Number(plan.days ?? 0),
      budget: Number(plan.budget ?? 0),
      persons: Number(plan.persons ?? 0),
      totalEstimatedCost: normalizeNumber(plan.totalEstimatedCost, 0),
      createdAt: plan.createdAt,
      shareSlug: plan.shareSlug ?? null,
      isPublic: Boolean(plan.isPublic),
      title: typeof plan.title === "string" ? plan.title : null,
      description:
        typeof plan.description === "string" ? plan.description : null,
    }));
};

const normalizeNumber = (value: unknown, fallback = 0) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeSlot = (value: unknown): TripSlotValue => {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name : "";
  const duration = typeof value.duration === "string" ? value.duration : "";
  if (!name || !duration) return null;
  const estimatedCost = normalizeNumber(value.estimatedCost, 0);
  return {
    placeId: typeof value.placeId === "string" ? value.placeId : undefined,
    name,
    type: typeof value.type === "string" ? value.type : undefined,
    duration,
    estimatedCost,
    openTime: typeof value.openTime === "string" ? value.openTime : undefined,
    closeTime:
      typeof value.closeTime === "string" ? value.closeTime : undefined,
  };
};

const normalizeDay = (value: unknown, index: number): TripDayView | null => {
  if (!isRecord(value)) return null;
  const day = typeof value.day === "number" ? value.day : index + 1;
  return {
    day,
    morning: normalizeSlot(value.morning),
    afternoon: normalizeSlot(value.afternoon),
    evening: normalizeSlot(value.evening),
    totalDayCost: normalizeNumber(value.totalDayCost, 0),
  };
};

const normalizeGeneratedPlan = (value: unknown): TripPlanView | null => {
  if (!isRecord(value)) return null;
  if (typeof value.tripPlanId !== "string") return null;
  const daysRaw = Array.isArray(value.days) ? value.days : [];
  const days = daysRaw
    .map((day, index) => normalizeDay(day, index))
    .filter((day): day is TripDayView => day !== null);
  return {
    tripPlanId: value.tripPlanId,
    days,
    totalEstimatedCost: normalizeNumber(value.totalEstimatedCost, 0),
    tips: Array.isArray(value.tips)
      ? value.tips.filter((tip): tip is string => typeof tip === "string")
      : [],
    shareSlug:
      typeof value.shareSlug === "string" ? value.shareSlug : null,
    shareUrl: typeof value.shareUrl === "string" ? value.shareUrl : null,
    isPublic: typeof value.isPublic === "boolean" ? value.isPublic : false,
    title: typeof value.title === "string" ? value.title : null,
    description:
      typeof value.description === "string" ? value.description : null,
  };
};

const normalizeStoredPlan = (value: unknown): TripPlanView | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string") return null;
  if (!isRecord(value.generatedPlan)) return null;
  const generated = value.generatedPlan as Record<string, unknown>;
  const daysRaw = Array.isArray(generated.days) ? generated.days : [];
  const days = daysRaw
    .map((day, index) => normalizeDay(day, index))
    .filter((day): day is TripDayView => day !== null);
  return {
    tripPlanId: value.id,
    days,
    totalEstimatedCost: normalizeNumber(generated.totalEstimatedCost, 0),
    tips: Array.isArray(generated.tips)
      ? generated.tips.filter((tip): tip is string => typeof tip === "string")
      : [],
    shareSlug:
      typeof value.shareSlug === "string" ? value.shareSlug : null,
    shareUrl: typeof value.shareUrl === "string" ? value.shareUrl : null,
    isPublic: typeof value.isPublic === "boolean" ? value.isPublic : false,
    title: typeof value.title === "string" ? value.title : null,
    description:
      typeof value.description === "string" ? value.description : null,
  };
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) return undefined;
  const response = error.response;
  if (!isRecord(response)) return undefined;
  const status = response.status;
  return typeof status === "number" ? status : undefined;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isRecord(error)) {
    const response = error.response;
    if (isRecord(response) && isRecord(response.data)) {
      const message = response.data.message;
      if (typeof message === "string") return message;
    }
  }
  return fallback;
};

const isTimeoutError = (error: unknown) => {
  if (!isRecord(error)) return false;
  return error.code === "ECONNABORTED";
};

type TripSlotProps = {
  label: string;
  slot: TripSlotValue;
  className: string;
  onViewPlace: (placeId: string) => void;
  onAddWishlist: (placeId: string) => void;
};

const TripSlot = ({
  label,
  slot,
  className,
  onViewPlace,
  onAddWishlist,
}: TripSlotProps) => {
  if (!slot) {
    return (
      <div className={`trip-slot ${className}`}>
        <div className="slot-header">
          <span className="slot-time">{label}</span>
        </div>
        <div className="slot-content">
          <p className="slot-name">No suitable place found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`trip-slot ${className}`}>
      <div className="slot-header">
        <span className="slot-time">{label}</span>
        <span className="slot-duration">{slot.duration}</span>
      </div>
      <div className="slot-content">
        <h4 className="slot-name">{slot.name}</h4>
        {slot.type && <span className="slot-type">{slot.type}</span>}
        <div className="slot-info">
          <span className="slot-cost">{slot.estimatedCost.toFixed(2)} ILS</span>
          {slot.openTime && slot.closeTime && (
            <span className="slot-hours">
              {slot.openTime} - {slot.closeTime}
            </span>
          )}
        </div>
        {slot.placeId && (
          <div className="slot-actions">
            <button
              className="action-button wishlist-button"
              type="button"
              //@ts-ignore
              onClick={() => onAddWishlist(slot.placeId)}>
              ♡ Wishlist
            </button>
            <button
              className="action-button view-button"
              type="button"
              //@ts-ignore
              onClick={() => onViewPlace(slot.placeId)}>
              View Place
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TripPlanner = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState<CreateTripPlannerDto>({
    cityId: "",
    days: 3,
    budget: 1000,
    persons: 2,
    interests: [],
  });
  const [cities, setCities] = useState<City[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tripPlan, setTripPlan] = useState<TripPlanView | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedPlans, setSavedPlans] = useState<TripPlanSummary[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const cityLookup = useMemo(() => {
    const map = new Map<string, City>();
    cities.forEach((city) => map.set(city.id, city));
    return map;
  }, [cities]);

  useEffect(() => {
    const storedForm = localStorage.getItem(STORAGE_KEY_FORM);
    if (storedForm) {
      try {
        const parsed = JSON.parse(storedForm) as Partial<CreateTripPlannerDto>;
        setFormData((prev) => ({
          ...prev,
          ...parsed,
          interests: parsed.interests ?? prev.interests ?? [],
        }));
      } catch {
        localStorage.removeItem(STORAGE_KEY_FORM);
      }
    }

    const storedRemix = localStorage.getItem(STORAGE_KEY_REMIX);
    if (storedRemix) {
      try {
        const parsed = JSON.parse(storedRemix) as Partial<TripRemixDraft>;
        setFormData((prev) => ({
          ...prev,
          cityId: parsed.cityId ?? prev.cityId,
          days: parsed.days ?? prev.days,
          budget: parsed.budget ?? prev.budget,
          persons: parsed.persons ?? prev.persons,
        }));
        localStorage.removeItem(STORAGE_KEY_REMIX);
        localStorage.removeItem(STORAGE_KEY_RESULT);
        setTripPlan(null);
        toast.info("Shared trip loaded into the planner");
      } catch {
        localStorage.removeItem(STORAGE_KEY_REMIX);
      }
    }

    const storedResult = localStorage.getItem(STORAGE_KEY_RESULT);
    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult) as unknown;
        const normalized =
          normalizeGeneratedPlan(parsed) ?? normalizeStoredPlan(parsed);
        if (normalized) {
          setTripPlan(normalized);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_RESULT);
      }
    }

    void fetchCities();
    void fetchTags();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (tripPlan) {
      localStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(tripPlan));
    } else {
      localStorage.removeItem(STORAGE_KEY_RESULT);
    }
  }, [tripPlan]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchSavedPlans();
    } else {
      setSavedPlans([]);
    }
  }, [isAuthenticated]);

  const fetchCities = async () => {
    try {
      setLoadingCities(true);
      const [page1, page2] = await Promise.allSettled([
        get(ADMIN_ENDPOINTS.CITIES_LIST(1)),
        get(ADMIN_ENDPOINTS.CITIES_LIST(2)),
      ]);

      const results: City[] = [];
      if (page1.status === "fulfilled") {
        results.push(...extractCities(page1.value));
      }
      if (page2.status === "fulfilled") {
        results.push(...extractCities(page2.value));
      }

      const unique = new Map<string, City>();
      results.forEach((city) => unique.set(city.id, city));
      setCities(Array.from(unique.values()));
    } catch {
      toast.error("Failed to load cities");
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await get(ADMIN_ENDPOINTS.TAGS_LIST);
      setTags(extractTags(data));
    } catch {
      toast.error("Failed to load interests");
    }
  };

  const fetchSavedPlans = async () => {
    try {
      setLoadingPlans(true);
      const data = await get(TRIP_PLANNER_ENDPOINTS.MY_PLANS);
      setSavedPlans(extractTripPlans(data));
    } catch (error) {
      if (getErrorStatus(error) !== 401) {
        toast.error("Failed to load saved plans");
      }
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleCityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, cityId: event.target.value }));
  };

  const handleDaysChange = (event: ChangeEvent<HTMLInputElement>) => {
    const days = Math.max(1, Number(event.target.value || 1));
    setFormData((prev) => ({ ...prev, days }));
  };

  const handleBudgetChange = (event: ChangeEvent<HTMLInputElement>) => {
    const budget = Math.max(0, Number(event.target.value || 0));
    setFormData((prev) => ({ ...prev, budget }));
  };

  const handlePersonsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const persons = Math.max(1, Number(event.target.value || 1));
    setFormData((prev) => ({ ...prev, persons }));
  };

  const handleInterestChange = (tagName: string) => {
    setFormData((prev) => {
      const current = prev.interests ?? [];
      const interests = current.includes(tagName)
        ? current.filter((item) => item !== tagName)
        : [...current, tagName];
      return { ...prev, interests };
    });
  };

  const handleAddWishlist = async (placeId: string) => {
    try {
      await postJson(WISHLIST_ENDPOINTS.ADD, { placeId });
      toast.success("Added to wishlist");
    } catch (error) {
      const message = getErrorMessage(error, "Failed to add to wishlist");
      toast.error(message);
    }
  };

  const handleViewPlace = (placeId: string) => {
    navigate(`/places/${placeId}`);
  };

  const handleLoadPlan = async (planId: string) => {
    try {
      setLoadingPlans(true);
      const data = await get(TRIP_PLANNER_ENDPOINTS.GET_ONE(planId));
      const normalized = normalizeStoredPlan(data);
      if (!normalized) {
        toast.error("Failed to load selected plan");
        return;
      }
      setTripPlan(normalized);
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      if (getErrorStatus(error) === 401) {
        navigate("/login");
      } else {
        toast.error("Failed to load selected plan");
      }
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm("Delete this plan?")) return;
    try {
      setLoadingPlans(true);
      await del(TRIP_PLANNER_ENDPOINTS.DELETE(planId));
      setSavedPlans((prev) => prev.filter((plan) => plan.id !== planId));
      if (tripPlan?.tripPlanId === planId) {
        setTripPlan(null);
      }
      toast.success("Plan deleted");
    } catch (error) {
      if (getErrorStatus(error) === 401) {
        navigate("/login");
      } else {
        toast.error("Failed to delete plan");
      }
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleClearPlan = () => {
    setTripPlan(null);
  };

  const copyToClipboard = async (value: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const input = document.createElement("input");
    input.value = value;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  };

  const getShareUrl = (shareSlug?: string | null) => {
    if (!shareSlug || typeof window === "undefined") return null;
    return `${window.location.origin}/trip/${shareSlug}`;
  };

  const handlePublishTrip = async () => {
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
          formData.interests?.length ? formData.interests.join(", ") : "smart local discovery"
        }.`;

      const response = (await postJson(
        TRIP_PLANNER_ENDPOINTS.SHARE(tripPlan.tripPlanId),
        {
          title,
          description,
          isPublic: true,
        },
      )) as ShareTripResponse;

      const shareUrl =
        response.shareUrl ?? getShareUrl(response.shareSlug);
      if (!shareUrl) {
        throw new Error("Share link missing");
      }
      const nextTripPlan: TripPlanView = {
        ...tripPlan,
        title,
        description,
        shareSlug: response.shareSlug,
        shareUrl,
        isPublic: response.isPublic,
      };

      setTripPlan(nextTripPlan);
      await copyToClipboard(shareUrl);
      toast.success("Public link copied");
    } catch (error) {
      const message = getErrorMessage(error, "Failed to publish trip");
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyShareLink = async () => {
    const shareUrl = tripPlan?.isPublic
      ? tripPlan?.shareUrl ?? getShareUrl(tripPlan?.shareSlug)
      : null;
    if (!shareUrl) {
      await handlePublishTrip();
      return;
    }

    try {
      await copyToClipboard(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    const minBudget = formData.persons * formData.days * 10;
    if (formData.budget < minBudget) {
      toast.warn("Budget may be too low");
    }

    toast.info("🤖 Generating your trip…", {
      autoClose: 25000,
      toastId: "gen",
    });

    try {
      setGenerating(true);
      const data = (await postJson(
        TRIP_PLANNER_ENDPOINTS.GENERATE,
        formData,
      )) as TripPlanResponse;
      const normalized = normalizeGeneratedPlan(data);
      if (!normalized) {
        throw new Error("Invalid response");
      }
      if (data.guestToken) {
        localStorage.setItem(STORAGE_KEY_GUEST_TOKEN, data.guestToken);
      }
      setTripPlan(normalized);
      toast.dismiss("gen");
      toast.success("✅ Trip plan ready!");
      if (isAuthenticated) {
        const newPlan: TripPlanSummary = {
          id: normalized.tripPlanId,
          cityId: formData.cityId,
          days: formData.days,
          budget: formData.budget,
          persons: formData.persons,
          totalEstimatedCost: normalized.totalEstimatedCost,
          createdAt: new Date().toISOString(),
        };
        setSavedPlans((prev) => [
          newPlan,
          ...prev.filter((plan) => plan.id !== newPlan.id),
        ]);
      }
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      toast.dismiss("gen");
      if (isTimeoutError(error)) {
        toast.error("⏱ Request timed out. Try again.");
        return;
      }
      if (getErrorStatus(error) === 401) {
        navigate("/login");
        return;
      }
      toast.error(getErrorMessage(error, "Failed to generate trip plan"));
    } finally {
      setGenerating(false);
    }
  };

  const formatCityLabel = (cityId: string) => {
    const city = cityLookup.get(cityId);
    if (!city) return cityId;
    return city.stateName ? `${city.name} (${city.stateName})` : city.name;
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const minBudget = formData.persons * formData.days * 10;
  const budgetTooLow = formData.budget < minBudget;
  const hasShareLink = Boolean(
    tripPlan?.isPublic && (tripPlan.shareUrl || tripPlan.shareSlug),
  );
  const publicShareUrl = hasShareLink
    ? tripPlan?.shareUrl ?? getShareUrl(tripPlan?.shareSlug) ?? ""
    : "";

  const skeletonLine = (width: string, height = 14) => ({
    width,
    height,
    borderRadius: 6,
    background: "var(--panel-input-bg)",
    animation: "tripPlannerPulse 1.4s ease-in-out infinite",
    marginBottom: 10,
  });

  return (
    <div className="trip-planner-page">
      <style>
        {`@keyframes tripPlannerPulse { 0% { opacity: 0.45; } 50% { opacity: 0.9; } 100% { opacity: 0.45; } }`}
      </style>

      <h1 className="trip-planner-title">AI Trip Planner</h1>

      <div className="trip-planner-container">
        <div className="trip-planner-form-section">
          {!isAuthenticated && (
            <div
              style={{
                background: "var(--panel-surface-soft)",
                border: "1px solid var(--panel-border)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                marginBottom: 16,
                color: "var(--color-text-secondary)",
              }}>
              You're browsing as a guest — log in to save your plans.
            </div>
          )}

          <form className="trip-planner-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="city">Select City</label>
              <select
                id="city"
                value={formData.cityId}
                onChange={handleCityChange}
                required
                disabled={loadingCities || generating}>
                <option value="">
                  {loadingCities ? "Loading…" : "Choose a city..."}
                </option>
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
                onChange={handleDaysChange}
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
                onChange={handleBudgetChange}
                required
                disabled={generating}
              />
              {budgetTooLow && (
                <span style={{ fontSize: 12, color: "var(--color-accent)" }}>
                  Budget may be too low
                </span>
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
                onChange={handlePersonsChange}
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
                        checked={
                          formData.interests?.includes(tag.name) || false
                        }
                        onChange={() => handleInterestChange(tag.name)}
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
              {generating ? "⏳ Generating…" : "✨ Generate Trip Plan"}
            </button>
          </form>

          {isAuthenticated && (
            <div
              style={{
                marginTop: 24,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>🗂 My Saved Plans</h2>
              {loadingPlans && (
                <div style={{ color: "var(--color-text-secondary)" }}>
                  Loading saved plans...
                </div>
              )}
              {!loadingPlans && savedPlans.length === 0 && (
                <div style={{ color: "var(--color-text-secondary)" }}>
                  No saved plans yet.
                </div>
              )}
              {!loadingPlans && savedPlans.length > 0 && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {savedPlans.map((plan) => (
                    <div
                      key={plan.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => void handleLoadPlan(plan.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleLoadPlan(plan.id);
                        }
                      }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 14px",
                        border: "1px solid var(--panel-border)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--color-surface)",
                        cursor: "pointer",
                        gap: 12,
                      }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}>
                        <strong style={{ fontSize: 14 }}>
                          {formatCityLabel(plan.cityId)}
                        </strong>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}>
                          <span>{formatDate(plan.createdAt)}</span>
                          <span>{plan.days} days</span>
                          <span>{plan.budget} ILS</span>
                          <span>
                            {normalizeNumber(
                              plan.totalEstimatedCost,
                              0,
                            ).toFixed(0)}{" "}
                            ILS
                          </span>
                          {plan.isPublic && <span>Public</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeletePlan(plan.id);
                        }}
                        style={{
                          border: "1px solid var(--panel-border)",
                          borderRadius: "var(--radius-md)",
                          background: "transparent",
                          color: "var(--color-text-secondary)",
                          padding: "6px 12px",
                          cursor: "pointer",
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

        <div className="trip-planner-results" ref={resultsRef}>
          {generating ? (
            <div className="trip-plan-results">
              {[0, 1, 2].map((index) => (
                <div key={index} className="trip-summary-card">
                  <div style={skeletonLine("60%", 18)} />
                  <div style={skeletonLine("45%", 14)} />
                  <div style={skeletonLine("80%", 14)} />
                  <div style={skeletonLine("100%", 64)} />
                </div>
              ))}
            </div>
          ) : tripPlan ? (
            <div className="trip-plan-results">
              <div className="trip-summary-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}>
                  <h2>Trip Summary</h2>
                  <button
                    type="button"
                    className="generate-button"
                    onClick={handleClearPlan}>
                    New Plan
                  </button>
                </div>
                <div className="summary-info">
                  <div className="summary-item">
                    <span className="summary-label">Total Estimated Cost:</span>
                    <span className="summary-value">
                      {tripPlan.totalEstimatedCost.toFixed(2)} ILS
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Days:</span>
                    <span className="summary-value">
                      {tripPlan.days.length}
                    </span>
                  </div>
                </div>

                <div className="trip-share-card">
                  <div className="trip-share-copy">
                    <h3>Share this itinerary</h3>
                    <p>
                      Publish a public link so friends can copy and remix the
                      trip.
                    </p>
                  </div>
                  <div className="trip-share-actions">
                    <button
                      type="button"
                      className="generate-button trip-share-primary"
                      onClick={() => void handlePublishTrip()}
                      disabled={publishing}>
                      {publishing
                        ? "Publishing…"
                        : hasShareLink
                          ? "Republish & Copy"
                          : "Publish & Copy Link"}
                    </button>
                    <button
                      type="button"
                      className="action-button trip-share-secondary"
                      onClick={() => void handleCopyShareLink()}
                      disabled={publishing}>
                      {hasShareLink ? "Copy Link" : "Publish First"}
                    </button>
                  </div>
                  {hasShareLink && (
                    <div className="trip-share-link">
                      <span>Public link</span>
                      <a
                        href={publicShareUrl}
                        target="_blank"
                        rel="noreferrer">
                        {publicShareUrl}
                      </a>
                    </div>
                  )}
                </div>

                {tripPlan.tips.length > 0 && (
                  <div className="tips-section">
                    <h3>Tips</h3>
                    <ul className="tips-list">
                      {tripPlan.tips.map((tip, index) => (
                        <li key={`${tip}-${index}`}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="trip-days">
                {tripPlan.days.map((day) => (
                  <div key={day.day} className="trip-day-card">
                    <h3 className="day-title">Day {day.day}</h3>
                    <div className="day-cost">
                      Total Day Cost: {day.totalDayCost.toFixed(2)} ILS
                    </div>

                    <div className="trip-slots">
                      <TripSlot
                        label="Morning"
                        className="morning"
                        slot={day.morning}
                        onViewPlace={handleViewPlace}
                        onAddWishlist={handleAddWishlist}
                      />
                      <TripSlot
                        label="Afternoon"
                        className="afternoon"
                        slot={day.afternoon}
                        onViewPlace={handleViewPlace}
                        onAddWishlist={handleAddWishlist}
                      />
                      <TripSlot
                        label="Evening"
                        className="evening"
                        slot={day.evening}
                        onViewPlace={handleViewPlace}
                        onAddWishlist={handleAddWishlist}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Fill out the form to generate your AI trip plan!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripPlanner;
