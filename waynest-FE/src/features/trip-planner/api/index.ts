/**
 * Trip Planner API
 * API calls for trip planner feature
 */

import { del, get, postJson, putJson } from '@/services/http/apiService';
import { TRIP_PLANNER_ENDPOINTS } from '@/services/http/endpoints';
import type { CreateTripPlannerDto, TripPlanResponse, ShareTripResponse, TripPlanSummary } from '../types';

/**
 * Generate a new trip plan
 */
export const generateTripPlan = async (payload: CreateTripPlannerDto): Promise<TripPlanResponse> => {
  return postJson(TRIP_PLANNER_ENDPOINTS.GENERATE, payload) as Promise<TripPlanResponse>;
};

/**
 * Fetch all saved trip plans for the current user
 */
export const fetchSavedTripPlans = async (): Promise<TripPlanSummary[]> => {
  return get(TRIP_PLANNER_ENDPOINTS.MY_PLANS) as Promise<TripPlanSummary[]>;
};

/**
 * Fetch a specific trip plan by ID
 */
export const fetchTripPlanById = async (planId: string): Promise<TripPlanSummary> => {
  return get(TRIP_PLANNER_ENDPOINTS.GET_ONE(planId)) as Promise<TripPlanSummary>;
};

/**
 * Delete a trip plan
 */
export const deleteTripPlan = async (planId: string): Promise<{ success: boolean }> => {
  return del(TRIP_PLANNER_ENDPOINTS.DELETE(planId)) as Promise<{ success: boolean }>;
};

/**
 * Publish/share a trip plan
 */
export const publishTripPlan = async (
  tripPlanId: string,
  payload: { title?: string; description?: string; isPublic?: boolean }
): Promise<ShareTripResponse> => {
  return postJson(TRIP_PLANNER_ENDPOINTS.SHARE(tripPlanId), payload) as Promise<ShareTripResponse>;
};

/**
 * Fetch a public trip plan by share slug
 */
export const fetchPublicTripPlan = async (slug: string): Promise<unknown> => {
  return get(TRIP_PLANNER_ENDPOINTS.PUBLIC(slug));
};

/**
 * Copy a trip plan
 */
export const copyTripPlan = async (tripPlanId: string): Promise<{ tripPlanId: string; success: boolean }> => {
  return postJson(TRIP_PLANNER_ENDPOINTS.COPY(tripPlanId), {}) as Promise<{ tripPlanId: string; success: boolean }>;
};

/**
 * Toggle trip plan public visibility
 */
export const toggleTripPlanVisibility = async (tripPlanId: string): Promise<{ isPublic: boolean; shareSlug: string | null }> => {
  return putJson(TRIP_PLANNER_ENDPOINTS.TOGGLE_PUBLIC(tripPlanId), {}) as Promise<{ isPublic: boolean; shareSlug: string | null }>;
};
