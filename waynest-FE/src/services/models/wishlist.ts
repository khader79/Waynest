import { Place } from "./place";

export interface Wishlist {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  placeId: string | null;
  place?: Place | null;
}
