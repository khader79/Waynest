/**
 * LocalStorage utilities for Trip Planner
 */

import type { CreateTripPlannerDto, TripPlanView, TripRemixDraft } from '../types';

const STORAGE_KEYS = {
  TRIP_PLANNER_FORM: 'waynest_trip_planner_form',
  TRIP_PLANNER_RESULT: 'waynest_trip_planner_result',
  TRIP_PLANNER_REMIX_DRAFT: 'waynest_trip_planner_remix_draft',
  GUEST_TRIP_TOKEN: 'waynest_guest_trip_token',
} as const;

/**
 * Saves trip form data to localStorage
 */
export const saveTripForm = (formData: CreateTripPlannerDto): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRIP_PLANNER_FORM, JSON.stringify(formData));
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

/**
 * Loads trip form data from localStorage
 */
export const loadTripForm = (): Partial<CreateTripPlannerDto> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TRIP_PLANNER_FORM);
    if (stored) {
      return JSON.parse(stored) as Partial<CreateTripPlannerDto>;
    }
  } catch {
    // Silently fail
  }
  return null;
};

/**
 * Saves trip result to localStorage
 */
export const saveTripResult = (result: TripPlanView): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRIP_PLANNER_RESULT, JSON.stringify(result));
  } catch {
    // Silently fail
  }
};

/**
 * Loads trip result from localStorage
 */
export const loadTripResult = (): TripPlanView | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TRIP_PLANNER_RESULT);
    if (stored) {
      return JSON.parse(stored) as TripPlanView;
    }
  } catch {
    // Silently fail
  }
  return null;
};

/**
 * Clears trip result from localStorage
 */
export const clearTripResult = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRIP_PLANNER_RESULT);
  } catch {
    // Silently fail
  }
};

/**
 * Loads remix draft from localStorage
 */
export const loadRemixDraft = (): Partial<TripRemixDraft> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TRIP_PLANNER_REMIX_DRAFT);
    if (stored) {
      return JSON.parse(stored) as Partial<TripRemixDraft>;
    }
  } catch {
    // Silently fail
  }
  return null;
};

/**
 * Clears remix draft from localStorage
 */
export const clearRemixDraft = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRIP_PLANNER_REMIX_DRAFT);
    localStorage.removeItem(STORAGE_KEYS.TRIP_PLANNER_RESULT);
  } catch {
    // Silently fail
  }
};

/**
 * Saves guest trip token
 */
export const saveGuestToken = (token: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.GUEST_TRIP_TOKEN, token);
  } catch {
    // Silently fail
  }
};

/**
 * Gets guest trip token
 */
export const getGuestToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.GUEST_TRIP_TOKEN);
  } catch {
    return null;
  }
};
