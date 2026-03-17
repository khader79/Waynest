export interface ITripSlot {
  placeId?: string;
  name: string;
  type?: string;
  duration: string;
  estimatedCost: number;
  openTime?: string;
  closeTime?: string;
}
export interface ITripDay {
  day: number;
  morning: ITripSlot;
  afternoon: ITripSlot;
  evening: ITripSlot;
  totalDayCost: number;
}
export interface IGeneratedPlan {
  days: ITripDay[];
  totalEstimatedCost: number;
  tips: string[];
}
export interface TripPlanResponse {
  tripPlanId: string;
  guestToken?: string | null;
  days: ITripDay[];
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

export interface PublicTripResponse {
  id: string;
  shareSlug: string;
  isPublic: boolean;
  title: string | null;
  description: string | null;
  cityId: string;
  cityName: string | null;
  days: number;
  budget: number;
  persons: number;
  generatedPlan: IGeneratedPlan;
  viewCount: number;
  createdAt: string;
}
