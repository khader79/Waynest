import api from './api';

export interface TripFormData {
  cityId: string;
  days: number;
  budget: number;
  persons: number;
  interests?: string[];
}

export interface TripPlan {
  id: string;
  cityId: string;
  days: number;
  budget: number;
  persons: number;
  generatedPlan: any;
  shareSlug?: string;
  isPublic?: boolean;
  title?: string;
  description?: string;
}

export const tripPlannerApi = {
  generateTrip: (data: TripFormData) =>
    api.post<{ tripPlanId: string | null; persisted: boolean; generatedPlan: any }>(
      '/trip-planner/generate',
      data
    ),
  
  getUserPlans: () =>
    api.get<TripPlan[]>('/trip-planner/user-plans'),
  
  getPlan: (id: string) =>
    api.get<TripPlan>(`/trip-planner/${id}`),
  
  deletePlan: (id: string) =>
    api.delete(`/trip-planner/${id}`),
  
  sharePlan: (id: string, data: { title?: string; description?: string }) =>
    api.post(`/trip-planner/${id}/share`, data),
  
  getPublicPlan: (slug: string) =>
    api.get<TripPlan>(`/trip-planner/share/${slug}`),
};