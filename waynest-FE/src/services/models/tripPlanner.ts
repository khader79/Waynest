export type TripSlot = {
  placeId?: string;
  eventId?: string;
  name: string;
  type?: string;
  duration: string;
  estimatedCost: number;
  ticketPrice?: number;
  persons?: number;
  currencyCode?: string;
  openTime?: string | null;
  closeTime?: string | null;
  imageUrl?: string | null;
};

export type TripDay = {
  day: number;
  date?: string;
  morning: TripSlot | null;
  afternoon: TripSlot | null;
  evening: TripSlot | null;
  totalDayCost: number;
};

export type GeneratedPlan = {
  startDate?: string;
  days: TripDay[];
  totalEstimatedCost: number;
  tips: string[];
};

export type TripPlan = {
  id: string;
  userId?: string | null;
  guestToken?: string | null;
  cityId: string;
  days: number;
  budget: number;
  persons: number;
  generatedPlan?: GeneratedPlan | null;
  shareSlug?: string | null;
  isPublic: boolean;
  shareVisibility?: string;
  viewCount: number;
  title?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
