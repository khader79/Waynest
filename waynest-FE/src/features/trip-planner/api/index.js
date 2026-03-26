import { del, get, postJson, putJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const generateTripPlan = async (payload) =>
  postJson(ROUTES.trips.generate, payload);

export const fetchSavedTripPlans = async () => get(ROUTES.trips.mine);

export const fetchTripPlanById = async (planId) => get(ROUTES.trips.one(planId));

export const deleteTripPlan = async (planId) => del(ROUTES.trips.remove(planId));

export const publishTripPlan = async (tripPlanId, payload) =>
  postJson(ROUTES.trips.share(tripPlanId), payload);

export const fetchPublicTripPlan = async (slug) => get(ROUTES.trips.publicOne(slug));

export const fetchPublicTripBrowse = async (limit = 12) =>
  get(ROUTES.trips.publicBrowse(limit));

export const copyTripPlan = async (tripPlanId) =>
  postJson(ROUTES.trips.copy(tripPlanId), {});

export const toggleTripPlanVisibility = async (tripPlanId) =>
  putJson(ROUTES.trips.togglePublic(tripPlanId), {});
