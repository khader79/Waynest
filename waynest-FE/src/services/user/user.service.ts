import { get } from "@/services/http/apiService";
import { ADMIN_ENDPOINTS, USERS_ENDPOINTS } from "@/services/http/endpoints";

export interface UserProfileResponse {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export const fetchUserProfile = async (userId: string) =>
  get<UserProfileResponse>(USERS_ENDPOINTS.Profile(userId));

export const fetchAllReviews = async () => get(ADMIN_ENDPOINTS.REVIEWS_LIST);
