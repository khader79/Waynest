import { del, get, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

export const reviewsApi = {
  getPlaceReviews: async (placeId) =>
    normalizeListPayload(await get(ROUTES.reviews.place(placeId))),
  getEventReviews: async (eventId) =>
    normalizeListPayload(await get(ROUTES.reviews.event(eventId))),
  createReview: async (payload) => postJson(ROUTES.reviews.create, payload),
  getPlaceComments: async (placeId) =>
    normalizeListPayload(await get(ROUTES.reviews.placeComments(placeId))),
  getEventComments: async (eventId) =>
    normalizeListPayload(await get(ROUTES.reviews.eventComments(eventId))),
  createPlaceComment: async (placeId, payload) =>
    postJson(ROUTES.reviews.placeComments(placeId), payload),
  createEventComment: async (eventId, payload) =>
    postJson(ROUTES.reviews.eventComments(eventId), payload),
  deleteComment: async (id) => del(ROUTES.reviews.deleteComment(id)),
};

export const reviewsService = reviewsApi;
