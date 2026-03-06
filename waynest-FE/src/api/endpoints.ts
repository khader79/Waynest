export const USERS_ENDPOINTS = {
  Profile: (userId: string) => `/users/profile/${userId}`,
};

export const ADMIN_ENDPOINTS = {
  users: {
    list: `/users`,
    create: `/users`,
    get: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
  },
  providers: {
    list: `/providers`,
    get: (id: string) => `/providers/${id}`,
    update: (id: string) => `/providers/${id}`,
    delete: (id: string) => `/providers/${id}`,
  },
  places: {
    list: `/place`,
    create: `/place`,
    get: (id: string) => `/place/${id}`,
    update: (id: string) => `/place/${id}`,
    delete: (id: string) => `/place/${id}`,
  },
  cities: {
    list: `/cities`,
    create: `/cities`,
    get: (id: string) => `/cities/${id}`,
    update: (id: string) => `/cities/${id}`,
    delete: (id: string) => `/cities/${id}`,
  },
  countries: {
    list: `/countries`,
    create: `/countries`,
    get: (id: string) => `/countries/${id}`,
    update: (id: string) => `/countries/${id}`,
    delete: (id: string) => `/countries/${id}`,
  },
  currencies: {
    list: `/currencies`,
    create: `/currencies`,
    get: (id: string) => `/currencies/${id}`,
    update: (id: string) => `/currencies/${id}`,
    delete: (id: string) => `/currencies/${id}`,
  },
  tags: {
    list: `/tag`,
    create: `/tag`,
    get: (id: string) => `/tag/${id}`,
    update: (id: string) => `/tag/${id}`,
    delete: (id: string) => `/tag/${id}`,
  },
  events: {
    list: `/event`,
    create: `/event`,
    get: (id: string) => `/event/${id}`,
    update: (id: string) => `/event/${id}`,
    delete: (id: string) => `/event/${id}`,
  },
  reviews: {
    list: `/review`,
    create: `/review`,
    get: (id: string) => `/review/${id}`,
    update: (id: string) => `/review/${id}`,
    delete: (id: string) => `/review/${id}`,
  },
  placePricing: {
    list: `/placepricing`,
    create: `/placepricing`,
    get: (id: string) => `/placepricing/${id}`,
    update: (id: string) => `/placepricing/${id}`,
    delete: (id: string) => `/placepricing/${id}`,
  },
  placeOpeningHours: {
    list: `/place-opening-hours`,
    create: `/place-opening-hours`,
    get: (id: string) => `/place-opening-hours/${id}`,
    update: (id: string) => `/place-opening-hours/${id}`,
    delete: (id: string) => `/place-opening-hours/${id}`,
  },
  providerMembership: {
    list: `/provider-membership`,
    create: `/provider-membership`,
    get: (id: string) => `/provider-membership/${id}`,
    update: (id: string) => `/provider-membership/${id}`,
    delete: (id: string) => `/provider-membership/${id}`,
  },
};

export const AUTH_ENDPOINTS = {
  LOGIN: `/auth/login`,
  SIGNUP: `/auth/signup`,
  VERIFY_EMAIL: `/auth/verify-email`,
  LOGOUT: `/auth/logout`,
  getPayload: `/auth/getPayload`,
};
