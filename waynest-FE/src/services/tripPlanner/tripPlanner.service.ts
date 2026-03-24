import { del, get, postJson, putJson } from "@/services/http/apiService";
import { TRIP_PLANNER_ENDPOINTS } from "@/services/http/endpoints";

export const generateTripPlan = async (payload: Record<string, unknown>) =>
  postJson(TRIP_PLANNER_ENDPOINTS.GENERATE, payload);

export const fetchSavedTripPlans = async () => get(TRIP_PLANNER_ENDPOINTS.MY_PLANS);

export const fetchTripPlanById = async (planId: string) =>
  get(TRIP_PLANNER_ENDPOINTS.GET_ONE(planId));

export const deleteTripPlan = async (planId: string) =>
  del(TRIP_PLANNER_ENDPOINTS.DELETE(planId));

export const publishTripPlan = async (
  tripPlanId: string,
  payload: Record<string, unknown>,
) => postJson(TRIP_PLANNER_ENDPOINTS.SHARE(tripPlanId), payload);

export const fetchPublicTripPlan = async (slug: string) =>
  get(TRIP_PLANNER_ENDPOINTS.PUBLIC(slug));

export type PublicTripBrowseItem = {
  shareSlug: string;
  title: string | null;
  username: string;
  cityId: string;
  createdAt: string;
};

export const fetchPublicTripBrowse = async (limit = 12) =>
  get<{ items: PublicTripBrowseItem[] }>(TRIP_PLANNER_ENDPOINTS.PUBLIC_BROWSE(limit));

export const copyTripPlan = async (tripPlanId: string) =>
  postJson(TRIP_PLANNER_ENDPOINTS.COPY(tripPlanId), {});

export const toggleTripPlanVisibility = async (tripPlanId: string) =>
  putJson(TRIP_PLANNER_ENDPOINTS.TOGGLE_PUBLIC(tripPlanId), {});
