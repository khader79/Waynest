export const USERS_ENDPOINTS = {
  Profile: (userId: string) => `/users/profile/${userId}`,
};

export const ADMIN_ENDPOINTS = {};

export const AUTH_ENDPOINTS = {
  LOGIN: `/auth/login`,
  SIGNUP: `/auth/signup`,
  VERIFY_EMAIL: `/auth/verify-email`,
  LOGOUT: `/auth/logout`,
  getPayload: `/auth/getPayload`,
};
