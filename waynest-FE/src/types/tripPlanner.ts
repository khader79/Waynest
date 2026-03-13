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
  days: ITripDay[];
  totalEstimatedCost: number;
  tips: string[];
}

export interface CreateTripPlannerDto {
  cityId: string;
  days: number;
  budget: number;
  persons: number;
  interests?: string[];
}
