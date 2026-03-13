export const USERS_ENDPOINTS = {
  Profile: (userId: string) => `/users/profile/${userId}`,
};

export const ADMIN_ENDPOINTS = {
  USERS_LIST: `/users`,
  USERS_CREATE: `/users`,
  USERS_GET: (id: string) => `/users/${id}`,
  USERS_UPDATE: (id: string) => `/users/${id}`,
  USERS_DELETE: (id: string) => `/users/${id}`,

  PROVIDERS_LIST: `/providers`,
  PROVIDERS_GET: (id: string) => `/providers/${id}`,
  PROVIDERS_UPDATE: (id: string) => `/providers/${id}`,
  PROVIDERS_DELETE: (id: string) => `/providers/${id}`,

  PLACES_LIST: `/place`,
  PLACES_CREATE: `/place`,
  PLACES_GET: (id: string) => `/place/${id}`,
  PLACES_UPDATE: (id: string) => `/place/${id}`,
  PLACES_DELETE: (id: string) => `/place/${id}`,

  CITIES_LIST: (page:number)=>`/cities/?page=${page}`,
  CITIES_CREATE: `/cities`,
  CITIES_GET: (id: string) => `/cities/${id}`,
  CITIES_UPDATE: (id: string) => `/cities/${id}`,
  CITIES_DELETE: (id: string) => `/cities/${id}`,

  COUNTRIES_LIST: `/countries`,
  COUNTRIES_CREATE: `/countries`,
  COUNTRIES_GET: (id: string) => `/countries/${id}`,
  COUNTRIES_UPDATE: (id: string) => `/countries/${id}`,
  COUNTRIES_DELETE: (id: string) => `/countries/${id}`,

  CURRENCIES_LIST: `/currencies`,
  CURRENCIES_CREATE: `/currencies`,
  CURRENCIES_GET: (id: string) => `/currencies/${id}`,
  CURRENCIES_UPDATE: (id: string) => `/currencies/${id}`,
  CURRENCIES_DELETE: (id: string) => `/currencies/${id}`,

  TAGS_LIST: `/tag`,
  TAGS_CREATE: `/tag`,
  TAGS_GET: (id: string) => `/tag/${id}`,
  TAGS_UPDATE: (id: string) => `/tag/${id}`,
  TAGS_DELETE: (id: string) => `/tag/${id}`,

  EVENTS_LIST: `/event`,
  EVENTS_CREATE: `/event`,
  EVENTS_GET: (id: string) => `/event/${id}`,
  EVENTS_UPDATE: (id: string) => `/event/${id}`,
  EVENTS_DELETE: (id: string) => `/event/${id}`,

  REVIEWS_LIST: `/review`,
  REVIEWS_CREATE: `/review`,
  REVIEWS_GET: (id: string) => `/review/${id}`,
  REVIEWS_UPDATE: (id: string) => `/review/${id}`,
  REVIEWS_DELETE: (id: string) => `/review/${id}`,

  PLACE_PRICING_LIST: `/placepricing`,
  PLACE_PRICING_CREATE: `/placepricing`,
  PLACE_PRICING_GET: (id: string) => `/placepricing/${id}`,
  PLACE_PRICING_UPDATE: (id: string) => `/placepricing/${id}`,
  PLACE_PRICING_DELETE: (id: string) => `/placepricing/${id}`,

  PLACE_OPENING_HOURS_LIST: `/place-opening-hours`,
  PLACE_OPENING_HOURS_CREATE: `/place-opening-hours`,
  PLACE_OPENING_HOURS_GET: (id: string) => `/place-opening-hours/${id}`,
  PLACE_OPENING_HOURS_UPDATE: (id: string) => `/place-opening-hours/${id}`,
  PLACE_OPENING_HOURS_DELETE: (id: string) => `/place-opening-hours/${id}`,

  PROVIDER_MEMBERSHIP_LIST: `/provider-membership`,
  PROVIDER_MEMBERSHIP_CREATE: `/provider-membership`,
  PROVIDER_MEMBERSHIP_GET: (id: string) => `/provider-membership/${id}`,
  PROVIDER_MEMBERSHIP_UPDATE: (id: string) => `/provider-membership/${id}`,
  PROVIDER_MEMBERSHIP_DELETE: (id: string) => `/provider-membership/${id}`,
};

export const AUTH_ENDPOINTS = {
  LOGIN: `/auth/login`,
  SIGNUP: `/auth/signup`,
  VERIFY_EMAIL: `/auth/verify-email`,
  LOGOUT: `/auth/logout`,
  getPayload: `/auth/getPayload`,
};

export const TRIP_PLANNER_ENDPOINTS = {
  GENERATE: `/trip-planner`,
};