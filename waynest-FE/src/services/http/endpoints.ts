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

  CITIES_LIST: (page: number, limit?: number) =>
    `/cities/?page=${page}${typeof limit === "number" ? `&limit=${limit}` : ""}`,
  CITIES_CREATE: `/cities`,
  CITIES_GET: (id: string) => `/cities/${id}`,
  CITIES_UPDATE: (id: string) => `/cities/${id}`,
  CITIES_DELETE: (id: string) => `/cities/${id}`,
  CITIES_BY_COUNTRY: (countryId: string) => `/cities/by-country/${countryId}`,

  COUNTRIES_LIST: (page: number, pageSize: number) =>
    `/countries?page=${page}&limit=${pageSize}`,
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

  EVENTS_LIST: `/events`,
  EVENTS_CREATE: `/events`,
  EVENTS_GET: (id: string) => `/events/${id}`,
  EVENTS_UPDATE: (id: string) => `/events/${id}`,
  EVENTS_DELETE: (id: string) => `/events/${id}`,

  REVIEWS_LIST: `/review`,
  REVIEWS_CREATE: `/review`,
  REVIEWS_GET: (id: string) => `/review/${id}`,
  REVIEWS_UPDATE: (id: string) => `/review/${id}`,
  REVIEWS_DELETE: (id: string) => `/review/${id}`,
  REVIEWS_MODERATE: (id: string) => `/review/${id}/moderate`,
  PLACE_COMMENTS_LIST: `/review/comments/place`,
  EVENT_COMMENTS_LIST: `/review/comments/event`,
  PLACE_COMMENT_MODERATE: (id: string) => `/review/comments/place/${id}/moderate`,
  EVENT_COMMENT_MODERATE: (id: string) => `/review/comments/event/${id}/moderate`,

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

  ADMIN_DEVICES_LIST: `/auth/admin/devices`,
  ADMIN_DEVICES_ADD: `/auth/admin/devices`,
  ADMIN_DEVICES_DELETE: `/auth/admin/devices`,
};

export const AUTH_ENDPOINTS = {
  LOGIN: `/auth/login`,
  SIGNUP: `/auth/signup`,
  LOGOUT: `/auth/logout`,
  getPayload: `/auth/getPayload`,
  INVITE_CREATE: `/auth/admin/invite`,
  INVITE_JOIN: `/auth/join`,
};

export const EMAIL_VERIFICATION_ENDPOINTS = {
  VERIFY: `/email-verification/verify`,
  RESEND: `/email-verification/resend`,
};

export const TRIP_PLANNER_ENDPOINTS = {
  GENERATE: `/trip-planner`,
  MY_PLANS: `/trip-planner/my-plans`,
  GET_ONE: (id: string) => `/trip-planner/${id}`,
  DELETE: (id: string) => `/trip-planner/${id}`,
  // Viral sharing endpoints
  SHARE: (id: string) => `/trip-planner/${id}/share`,
  COPY: (id: string) => `/trip-planner/${id}/copy`,
  TOGGLE_PUBLIC: (id: string) => `/trip-planner/${id}/toggle-public`,
  // Public endpoint (no auth required)
  PUBLIC: (slug: string) => `/trip-planner/public/${slug}`,
  PUBLIC_OG_IMAGE: (slug: string) => `/trip-planner/public/${slug}/og-image`,
};

export const WISHLIST_ENDPOINTS = {
  ADD: `/wishlist`,
  REMOVE: (placeId: string) => `/wishlist/${placeId}`,
  LIST: `/wishlist`,
  CHECK: (placeId: string) => `/wishlist/${placeId}/check`,
};

export const BOOKINGS_ENDPOINTS = {
  CREATE: `/bookings`,
  MY_BOOKINGS: `/bookings/my`,
  GET_ONE: (id: string) => `/bookings/${id}`,
  CANCEL: (id: string) => `/bookings/${id}/cancel`,
  UPDATE_STATUS: (id: string) => `/bookings/${id}/status`,
};

export const SOCIAL_GRAPH_ENDPOINTS = {
  STATE: (userId: string) => `/social-graph/users/${userId}/state`,
  FOLLOW: (userId: string) => `/social-graph/users/${userId}/follow`,
  UNFOLLOW: (userId: string) => `/social-graph/users/${userId}/unfollow`,
  BLOCK: (userId: string) => `/social-graph/users/${userId}/block`,
  UNBLOCK: (userId: string) => `/social-graph/users/${userId}/unblock`,
  MUTE: (userId: string) => `/social-graph/users/${userId}/mute`,
  UNMUTE: (userId: string) => `/social-graph/users/${userId}/unmute`,
};

export const SOCIAL_CONTENT_ENDPOINTS = {
  CREATE_POST: `/social-content/posts`,
  FEED: `/social-content/feed`,
  POST: (postId: string) => `/social-content/posts/${postId}`,
  LIKE: (postId: string) => `/social-content/posts/${postId}/like`,
  SAVE: (postId: string) => `/social-content/posts/${postId}/save`,
  COMMENTS: (postId: string) => `/social-content/posts/${postId}/comments`,
  REPORT: (postId: string) => `/social-content/posts/${postId}/report`,
};

export const MESSAGING_ENDPOINTS = {
  CONVERSATIONS: `/messaging/conversations`,
  INBOX: `/messaging/inbox`,
  MESSAGES: (conversationId: string) =>
    `/messaging/conversations/${conversationId}/messages`,
  READ: (conversationId: string) => `/messaging/conversations/${conversationId}/read`,
};

export const NOTIFICATIONS_ENDPOINTS = {
  LIST: `/notifications`,
  READ: (notificationId: string) => `/notifications/${notificationId}/read`,
  READ_ALL: `/notifications/read-all`,
};

export const PROVIDER_ENDPOINTS = {
  MY_PROFILE: `/providers/my`,
  MY_PROFILE_UPDATE: `/providers/my`,
  MY_PLACES: `/providers/my/places`,
  MY_EVENTS: `/providers/my/events`,
  MY_STATS: `/providers/my/stats`,
};

export const GENERAL_ENDPOINTS = {
  PLACE: `/place`,
  PLACE_BY_ID: (id: string) => `/place/${id}`,
  EVENT_BY_ID: (id: string) => `/events/${id}`,
};

export const REVIEWS_ENDPOINTS = {
  CREATE_REVIEW: `/review`,
  PLACE_REVIEWS: (placeId: string) => `/review/places/${placeId}`,
  EVENT_REVIEWS: (eventId: string) => `/review/events/${eventId}`,
  PLACE_COMMENTS: (placeId: string) => `/review/places/${placeId}/comments`,
  EVENT_COMMENTS: (eventId: string) => `/review/events/${eventId}/comments`,
  DELETE_COMMENT: (id: string) => `/review/comments/${id}`,
};
