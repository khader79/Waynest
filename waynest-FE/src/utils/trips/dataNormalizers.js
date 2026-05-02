/**
 * Data Normalizers for Trip Planner API responses
 * Extracts and transforms raw API data into typed structures
 */

import { isRecord } from "@/utils/typeGuards";

/**
 * Normalizes a number value, handling string inputs
 */
export const normalizeNumber = (value, fallback = 0) => {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : fallback;
};

/**
 * Extracts countries from API response
 */
export const extractCountries = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data;
  return [];
};

/**
 * Extracts cities from API response
 */
export const extractCities = (payload) => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (city) =>
        isRecord(city) &&
        typeof city.id === "string" &&
        typeof city.name === "string",
    );
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.filter(
      (city) =>
        isRecord(city) &&
        typeof city.id === "string" &&
        typeof city.name === "string",
    );
  }

  return [];
};

/**
 * Extracts tags from API response
 */
export const extractTags = (payload) => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (tag) =>
        isRecord(tag) &&
        typeof tag.id === "string" &&
        typeof tag.name === "string",
    );
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.filter(
      (tag) =>
        isRecord(tag) &&
        typeof tag.id === "string" &&
        typeof tag.name === "string",
    );
  }

  return [];
};

/**
 * Normalizes a trip slot from raw API data
 */
export const normalizeSlot = (value) => {
  if (!isRecord(value)) {
    return null;
  }

  const name = typeof value.name === "string" ? value.name : "";
  const duration = typeof value.duration === "string" ? value.duration : "";

  if (!name || !duration) {
    return null;
  }

  const currencyCode =
    typeof value.currencyCode === "string"
      ? value.currencyCode
      : isRecord(value.currency) && typeof value.currency.code === "string"
        ? value.currency.code
        : "ILS";

  return {
    closeTime:
      typeof value.closeTime === "string" ? value.closeTime : undefined,
    duration,
    estimatedCost: normalizeNumber(value.estimatedCost, 0),
    eventId: typeof value.eventId === "string" ? value.eventId : undefined,
    currencyCode,
    rawTicketPrice: normalizeNumber(value.ticketPrice, 0),
    persons:
      typeof value.persons === "number"
        ? value.persons
        : Number.isFinite(Number(value.persons))
          ? Number(value.persons)
          : undefined,
    name,
    openTime: typeof value.openTime === "string" ? value.openTime : undefined,
    placeId: typeof value.placeId === "string" ? value.placeId : undefined,
    type: typeof value.type === "string" ? value.type : undefined,
  };
};

/**
 * Normalizes a trip day from raw API data
 */
export const normalizeDay = (value, index) => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    afternoon: normalizeSlot(value.afternoon),
    date: typeof value.date === "string" ? value.date : undefined,
    day: typeof value.day === "number" ? value.day : index + 1,
    evening: normalizeSlot(value.evening),
    morning: normalizeSlot(value.morning),
    totalDayCost: normalizeNumber(value.totalDayCost, 0),
  };
};

/**
 * Normalizes a generated trip plan from API response
 */
export const normalizeGeneratedPlan = (value) => {
  if (!isRecord(value)) {
    return null;
  }

  const days = Array.isArray(value.days)
    ? value.days
        .map((day, index) => normalizeDay(day, index))
        .filter((day) => day !== null)
    : [];

  return {
    days,
    description:
      typeof value.description === "string" ? value.description : null,
    isPublic: typeof value.isPublic === "boolean" ? value.isPublic : false,
    shareSlug: typeof value.shareSlug === "string" ? value.shareSlug : null,
    shareUrl: typeof value.shareUrl === "string" ? value.shareUrl : null,
    tips: Array.isArray(value.tips)
      ? value.tips.filter((tip) => typeof tip === "string")
      : [],
    title: typeof value.title === "string" ? value.title : null,
    totalEstimatedCost: normalizeNumber(value.totalEstimatedCost, 0),
    startDate: typeof value.startDate === "string" ? value.startDate : null,
    currencyCode:
      typeof value.currencyCode === "string"
        ? value.currencyCode
        : isRecord(value.currency) && typeof value.currency.code === "string"
          ? value.currency.code
          : "ILS",
    tripPlanId: typeof value.tripPlanId === "string" ? value.tripPlanId : null,
  };
};

/**
 * Normalizes a stored trip plan from API response
 */
export const normalizeStoredPlan = (value) => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isRecord(value.generatedPlan)
  ) {
    return null;
  }

  const generatedPlan = value.generatedPlan;
  const days = Array.isArray(generatedPlan.days)
    ? generatedPlan.days
        .map((day, index) => normalizeDay(day, index))
        .filter((day) => day !== null)
    : [];

  return {
    days,
    description:
      typeof value.description === "string" ? value.description : null,
    isPublic: typeof value.isPublic === "boolean" ? value.isPublic : false,
    shareSlug: typeof value.shareSlug === "string" ? value.shareSlug : null,
    shareUrl: typeof value.shareUrl === "string" ? value.shareUrl : null,
    tips: Array.isArray(generatedPlan.tips)
      ? generatedPlan.tips.filter((tip) => typeof tip === "string")
      : [],
    title: typeof value.title === "string" ? value.title : null,
    totalEstimatedCost: normalizeNumber(generatedPlan.totalEstimatedCost, 0),
    startDate:
      typeof generatedPlan.startDate === "string"
        ? generatedPlan.startDate
        : null,
    currencyCode:
      typeof generatedPlan.currencyCode === "string"
        ? generatedPlan.currencyCode
        : isRecord(generatedPlan.currency) &&
            typeof generatedPlan.currency.code === "string"
          ? generatedPlan.currency.code
          : "ILS",
    tripPlanId: value.id,
  };
};

/**
 * Trip plan record type for extraction
 */

/**
 * Extracts trip plans summary from API response
 */
export const extractTripPlans = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter(
      (plan) =>
        isRecord(plan) &&
        typeof plan.id === "string" &&
        typeof plan.cityId === "string",
    )
    .map((plan) => ({
      budget: Number(plan.budget ?? 0),
      cityId: plan.cityId,
      cityName:
        typeof plan.cityName === "string"
          ? plan.cityName
          : isRecord(plan.city) && typeof plan.city.name === "string"
            ? plan.city.name
            : null,
      createdAt: plan.createdAt,
      days: Number(plan.days ?? 0),
      description:
        typeof plan.description === "string" ? plan.description : null,
      id: plan.id,
      isPublic: Boolean(plan.isPublic),
      persons: Number(plan.persons ?? 0),
      shareSlug: plan.shareSlug ?? null,
      title: typeof plan.title === "string" ? plan.title : null,
      totalEstimatedCost: normalizeNumber(plan.totalEstimatedCost, 0),
    }));
};
