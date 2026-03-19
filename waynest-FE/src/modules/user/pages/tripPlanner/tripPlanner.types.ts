export interface TripSlot {
  placeId?: string;
  name: string;
  type?: string;
  duration: string;
  estimatedCost: number;
  openTime?: string;
  closeTime?: string;
}

export interface TripPlanResponse {
  tripPlanId: string;
  guestToken?: string | null;
  days: Array<{
    day: number;
    morning: TripSlot;
    afternoon: TripSlot;
    evening: TripSlot;
    totalDayCost: number;
  }>;
  totalEstimatedCost: number;
  tips: string[];
}

export interface ShareTripResponse {
  success: boolean;
  shareUrl: string | null;
  shareSlug: string | null;
  isPublic: boolean;
}

export interface CreateTripPlannerDto {
  cityId: string;
  days: number;
  budget: number;
  persons: number;
  interests?: string[];
}

export interface TripRemixDraft {
  cityId: string;
  days: number;
  budget: number;
  persons: number;
  sourceSlug?: string;
  sourceTitle?: string | null;
  sourceDescription?: string | null;
}

export interface TripPlanSummary {
  id: string;
  cityId: string;
  days: number;
  budget: number;
  persons: number;
  totalEstimatedCost?: number;
  createdAt: string;
  shareSlug?: string | null;
  isPublic?: boolean;
  title?: string | null;
  description?: string | null;
}

export interface TripPlannerCity {
  id: string;
  name: string;
  stateName?: string;
}

export interface TripPlannerTag {
  id: string;
  name: string;
}

export interface TripDayView {
  day: number;
  morning: TripSlot | null;
  afternoon: TripSlot | null;
  evening: TripSlot | null;
  totalDayCost: number;
}

export interface TripPlanView {
  tripPlanId: string;
  days: TripDayView[];
  totalEstimatedCost: number;
  tips: string[];
  shareSlug?: string | null;
  shareUrl?: string | null;
  isPublic?: boolean;
  title?: string | null;
  description?: string | null;
}
