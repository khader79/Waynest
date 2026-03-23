import { del, get, patch, postJson } from "@/services/http/apiService";
import { ADMIN_ENDPOINTS, REVIEWS_ENDPOINTS } from "@/services/http/endpoints";

export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ReviewRecord = {
  id: string;
  rating: number;
  comment?: string;
  status: ModerationStatus;
  moderationNote?: string | null;
  createdAt: string;
  user?: { id: string; username?: string; email?: string };
  place?: { id: string; name?: string };
  event?: { id: string; title?: string };
};

export type CommentRecord = {
  id: string;
  content: string;
  parentId?: string | null;
  status: ModerationStatus;
  moderationNote?: string | null;
  createdAt: string;
  user?: { id: string; username?: string; email?: string };
  place?: { id: string; name?: string };
  event?: { id: string; title?: string };
};

export const reviewsService = {
  getPlaceReviews: async (placeId: string) =>
    get<ReviewRecord[]>(REVIEWS_ENDPOINTS.PLACE_REVIEWS(placeId)),
  getEventReviews: async (eventId: string) =>
    get<ReviewRecord[]>(REVIEWS_ENDPOINTS.EVENT_REVIEWS(eventId)),
  createReview: async (payload: {
    place?: string;
    event?: string;
    rating: number;
    comment?: string;
  }) => postJson(REVIEWS_ENDPOINTS.CREATE_REVIEW, payload),
  getPlaceComments: async (placeId: string) =>
    get<CommentRecord[]>(REVIEWS_ENDPOINTS.PLACE_COMMENTS(placeId)),
  getEventComments: async (eventId: string) =>
    get<CommentRecord[]>(REVIEWS_ENDPOINTS.EVENT_COMMENTS(eventId)),
  createPlaceComment: async (
    placeId: string,
    payload: { content: string; parentId?: string },
  ) => postJson(REVIEWS_ENDPOINTS.PLACE_COMMENTS(placeId), payload),
  createEventComment: async (
    eventId: string,
    payload: { content: string; parentId?: string },
  ) => postJson(REVIEWS_ENDPOINTS.EVENT_COMMENTS(eventId), payload),
  deleteComment: async (id: string) => del(REVIEWS_ENDPOINTS.DELETE_COMMENT(id)),
};

export const reviewsModerationService = {
  listReviews: async (status?: ModerationStatus) =>
    get<ReviewRecord[]>(
      `${ADMIN_ENDPOINTS.REVIEWS_LIST}${status ? `?status=${status}` : ""}`,
    ),
  moderateReview: async (
    id: string,
    payload: { status: ModerationStatus; moderationNote?: string },
  ) => patch(ADMIN_ENDPOINTS.REVIEWS_MODERATE(id), payload),
  listPlaceComments: async (status?: ModerationStatus) =>
    get<CommentRecord[]>(
      `${ADMIN_ENDPOINTS.PLACE_COMMENTS_LIST}${status ? `?status=${status}` : ""}`,
    ),
  listEventComments: async (status?: ModerationStatus) =>
    get<CommentRecord[]>(
      `${ADMIN_ENDPOINTS.EVENT_COMMENTS_LIST}${status ? `?status=${status}` : ""}`,
    ),
  moderatePlaceComment: async (
    id: string,
    payload: { status: ModerationStatus; moderationNote?: string },
  ) => patch(ADMIN_ENDPOINTS.PLACE_COMMENT_MODERATE(id), payload),
  moderateEventComment: async (
    id: string,
    payload: { status: ModerationStatus; moderationNote?: string },
  ) => patch(ADMIN_ENDPOINTS.EVENT_COMMENT_MODERATE(id), payload),
};

