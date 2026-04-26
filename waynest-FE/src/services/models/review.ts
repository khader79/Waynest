import { User } from "./user";
import { Place } from "./place";
import { Event } from "./event";

export enum ReviewStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface Review {
  id: string;
  createdAt: string;
  updatedAt: string;
  place?: Place | null;
  placeId?: string | null;
  event?: Event | null;
  eventId?: string | null;
  user: User;
  userId: string;
  rating: number | null;
  comment: string | null;
  status: ReviewStatus;
  isFlagged: boolean;
  moderationNote: string | null;
  moderatedAt: string | null;
  moderatedBy: string | null;
}
