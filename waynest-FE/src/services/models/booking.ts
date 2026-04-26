import { User } from "./user";
import { Place } from "./place";

export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

export interface Booking {
  id: string;
  createdAt: string;
  updatedAt: string;
  user?: User | null;
  userId?: string | null;
  place?: Place | null;
  placeId?: string | null;
  status: BookingStatus;
  totalPrice: number;
  currencyCode: string;
  reservationDate: string;
  specialRequests?: string | null;
  confirmationCode?: string | null;
}
