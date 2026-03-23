/**
 * Data Normalizers for Trip Planner API responses
 * Extracts and transforms raw API data into typed structures
 */

import { isRecord } from '@/core/utils/typeGuards';
import type {
  TripSlot,
  TripDayView,
  TripPlanView,
  TripPlanSummary,
  TripPlannerCity,
  TripPlannerTag,
} from '../types';

/**
 * Normalizes a number value, handling string inputs
 */
export const normalizeNumber = (value: unknown, fallback = 0): number => {
  const result = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(result) ? result : fallback;
};

/**
 * Extracts cities from API response
 */
export const extractCities = (payload: unknown): TripPlannerCity[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (city): city is TripPlannerCity =>
        isRecord(city) && typeof city.id === 'string' && typeof city.name === 'string',
    );
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.filter(
      (city): city is TripPlannerCity =>
        isRecord(city) && typeof city.id === 'string' && typeof city.name === 'string',
    );
  }

  return [];
};

/**
 * Extracts tags from API response
 */
export const extractTags = (payload: unknown): TripPlannerTag[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (tag): tag is TripPlannerTag =>
        isRecord(tag) && typeof tag.id === 'string' && typeof tag.name === 'string',
    );
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.filter(
      (tag): tag is TripPlannerTag =>
        isRecord(tag) && typeof tag.id === 'string' && typeof tag.name === 'string',
    );
  }

  return [];
};

/**
 * Normalizes a trip slot from raw API data
 */
export const normalizeSlot = (value: unknown): TripSlot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const name = typeof value.name === 'string' ? value.name : '';
  const duration = typeof value.duration === 'string' ? value.duration : '';

  if (!name || !duration) {
    return null;
  }

  return {
    closeTime: typeof value.closeTime === 'string' ? value.closeTime : undefined,
    duration,
    estimatedCost: normalizeNumber(value.estimatedCost, 0),
    name,
    openTime: typeof value.openTime === 'string' ? value.openTime : undefined,
    placeId: typeof value.placeId === 'string' ? value.placeId : undefined,
    type: typeof value.type === 'string' ? value.type : undefined,
  };
};

/**
 * Normalizes a trip day from raw API data
 */
export const normalizeDay = (value: unknown, index: number): TripDayView | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    afternoon: normalizeSlot(value.afternoon),
    day: typeof value.day === 'number' ? value.day : index + 1,
    evening: normalizeSlot(value.evening),
    morning: normalizeSlot(value.morning),
    totalDayCost: normalizeNumber(value.totalDayCost, 0),
  };
};

/**
 * Normalizes a generated trip plan from API response
 */
export const normalizeGeneratedPlan = (value: unknown): TripPlanView | null => {
  if (!isRecord(value) || typeof value.tripPlanId !== 'string') {
    return null;
  }

  const days = Array.isArray(value.days)
    ? value.days.map((day, index) => normalizeDay(day, index)).filter((day): day is TripDayView => day !== null)
    : [];

  return {
    days,
    description: typeof value.description === 'string' ? value.description : null,
    isPublic: typeof value.isPublic === 'boolean' ? value.isPublic : false,
    shareSlug: typeof value.shareSlug === 'string' ? value.shareSlug : null,
    shareUrl: typeof value.shareUrl === 'string' ? value.shareUrl : null,
    tips: Array.isArray(value.tips) ? value.tips.filter((tip): tip is string => typeof tip === 'string') : [],
    title: typeof value.title === 'string' ? value.title : null,
    totalEstimatedCost: normalizeNumber(value.totalEstimatedCost, 0),
    tripPlanId: value.tripPlanId,
  };
};

/**
 * Normalizes a stored trip plan from API response
 */
export const normalizeStoredPlan = (value: unknown): TripPlanView | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || !isRecord(value.generatedPlan)) {
    return null;
  }

  const generatedPlan = value.generatedPlan as Record<string, unknown>;
  const days = Array.isArray(generatedPlan.days)
    ? generatedPlan.days.map((day, index) => normalizeDay(day, index)).filter((day): day is TripDayView => day !== null)
    : [];

  return {
    days,
    description: typeof value.description === 'string' ? value.description : null,
    isPublic: typeof value.isPublic === 'boolean' ? value.isPublic : false,
    shareSlug: typeof value.shareSlug === 'string' ? value.shareSlug : null,
    shareUrl: typeof value.shareUrl === 'string' ? value.shareUrl : null,
    tips: Array.isArray(generatedPlan.tips)
      ? generatedPlan.tips.filter((tip): tip is string => typeof tip === 'string')
      : [],
    title: typeof value.title === 'string' ? value.title : null,
    totalEstimatedCost: normalizeNumber(generatedPlan.totalEstimatedCost, 0),
    tripPlanId: value.id,
  };
};

/**
 * Trip plan record type for extraction
 */
type TripPlanRecord = {
  id: string;
  cityId: string;
  days: number;
  budget: number | string;
  persons: number;
  createdAt: string;
  totalEstimatedCost?: number;
  shareSlug?: string | null;
  isPublic?: boolean;
  title?: string | null;
  description?: string | null;
};

/**
 * Extracts trip plans summary from API response
 */
export const extractTripPlans = (payload: unknown): TripPlanSummary[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter(
      (plan): plan is TripPlanRecord =>
        isRecord(plan) && typeof plan.id === 'string' && typeof plan.cityId === 'string',
    )
    .map((plan) => ({
      budget: Number(plan.budget ?? 0),
      cityId: plan.cityId,
      createdAt: plan.createdAt,
      days: Number(plan.days ?? 0),
      description: typeof plan.description === 'string' ? plan.description : null,
      id: plan.id,
      isPublic: Boolean(plan.isPublic),
      persons: Number(plan.persons ?? 0),
      shareSlug: plan.shareSlug ?? null,
      title: typeof plan.title === 'string' ? plan.title : null,
      totalEstimatedCost: normalizeNumber(plan.totalEstimatedCost, 0),
    }));
};
