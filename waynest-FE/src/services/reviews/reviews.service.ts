import { del, get, postJson } from "@/services/http/apiService";
import { REVIEWS_ENDPOINTS } from "@/services/http/endpoints";

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

const normalizeListPayload = <TRecord>(payload: unknown): TRecord[] => {
  if (Array.isArray(payload)) {
    return payload as TRecord[];
  }
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: TRecord[] }).data)
  ) {
    return (payload as { data: TRecord[] }).data;
  }
  return [];
};

export const reviewsService = {
  getPlaceReviews: async (placeId: string) =>
    normalizeListPayload<ReviewRecord>(
      await get<ReviewRecord[] | { data: ReviewRecord[] }>(
        REVIEWS_ENDPOINTS.PLACE_REVIEWS(placeId),
      ),
    ),
  getEventReviews: async (eventId: string) =>
    normalizeListPayload<ReviewRecord>(
      await get<ReviewRecord[] | { data: ReviewRecord[] }>(
        REVIEWS_ENDPOINTS.EVENT_REVIEWS(eventId),
      ),
    ),
  createReview: async (payload: {
    place?: string;
    event?: string;
    rating: number;
    comment?: string;
  }) => postJson(REVIEWS_ENDPOINTS.CREATE_REVIEW, payload),
  getPlaceComments: async (placeId: string) =>
    normalizeListPayload<CommentRecord>(
      await get<CommentRecord[] | { data: CommentRecord[] }>(
        REVIEWS_ENDPOINTS.PLACE_COMMENTS(placeId),
      ),
    ),
  getEventComments: async (eventId: string) =>
    normalizeListPayload<CommentRecord>(
      await get<CommentRecord[] | { data: CommentRecord[] }>(
        REVIEWS_ENDPOINTS.EVENT_COMMENTS(eventId),
      ),
    ),
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

