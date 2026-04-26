import { Place } from './place';
import { Review } from './review';

export interface EventComment {
  id: string;
  // ... extra fields
}

export interface Event {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  slug: string | null;
  description?: string;
  venue: Place;
  startDate: string;
  endDate: string;
  availableTickets: number;
  ticketPrice: number;
  currencyCode: string;
  isActive: boolean;
  reviews?: Review[];
  comments?: EventComment[];
}
