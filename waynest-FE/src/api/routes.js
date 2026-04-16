const withQuery = (path, params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
};

export const ROUTES = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    createInvite: "/auth/invite",
    activateInvite: "/auth/invite/activate",
    verifyEmail: "/email-verification/verify",
    resendVerification: "/email-verification/resend",
  },
  trips: {
    generate: "/trip-planner",
    importGenerated: "/trip-planner/import",
    mine: "/trip-planner/my-plans",
    one: (id) => `/trip-planner/${id}`,
    remove: (id) => `/trip-planner/${id}`,
    share: (id) => `/trip-planner/${id}/share`,
    copy: (id) => `/trip-planner/${id}/copy`,
    togglePublic: (id) => `/trip-planner/${id}/toggle-public`,
    publicOne: (slug) => `/trip-planner/public/${slug}`,
    publicBrowse: (limit = 12) =>
      withQuery("/trip-planner/public/browse", { limit }),
  },
  search: {
    global: (q, cityId, limit = 8, types) =>
      withQuery("/search", {
        q,
        ...(cityId ? { cityId } : {}),
        limit,
        ...(types ? { types } : {}),
      }),
  },
  placeNearest: (lat, lng, limit = 5) =>
    withQuery("/place/nearest", { lat, lng, limit }),
  public: {
    user: (param) => `/public/users/${param}`,
    userFollowers: (param) =>
      `/public/users/${encodeURIComponent(param)}/followers`,
    userFollowing: (param) =>
      `/public/users/${encodeURIComponent(param)}/following`,
    userFriends: (param) =>
      `/public/users/${encodeURIComponent(param)}/friends`,
    providerBySlug: (slug) => `/providers/public/by-slug/${slug}`,
    providerProfile: (param) =>
      `/providers/public/profile/${encodeURIComponent(param)}`,
  },
  users: {
    me: "/auth/me",
    summary: "/auth/me/summary",
    updateMe: "/auth/me",
    list: withQuery("/users", { page: 1, limit: 100 }),
    profile: (id) => `/users/profile/${id}`,
    allowedDevices: "/users/allowed-devices",
    removeDevice: (fp) => `/users/allowed-devices/${encodeURIComponent(fp)}`,
  },
  providers: {
    myProfile: "/providers/my",
    myStats: "/providers/my/stats",
    myPlaces: "/providers/my/places",
    myPlace: (placeId) => `/providers/my/places/${placeId}`,
    myPlaceVerificationRequest: (placeId) =>
      `/providers/my/places/${placeId}/verification-request`,
    verificationRequests: "/providers/verification-requests",
    myEvents: "/providers/my/events",
    myEvent: (eventId) => `/providers/my/events/${eventId}`,
  },
  providerApplications: {
    create: "/provider-applications",
    me: "/provider-applications/me",
    list: "/provider-applications",
    approve: (id) => `/provider-applications/${id}/approve`,
    reject: (id) => `/provider-applications/${id}/reject`,
  },
  bookings: {
    mine: "/bookings/my",
    providerMine: "/bookings/provider/mine",
    cancel: (id) => `/bookings/${id}/cancel`,
    status: (id) => `/bookings/${id}/status`,
  },
  wishlist: {
    list: "/wishlist",
    add: "/wishlist",
    remove: (placeId) => `/wishlist/${placeId}`,
  },
  reviews: {
    list: "/review",
    create: "/review",
    one: (id) => `/review/${id}`,
    flag: (id) => `/review/${id}/flag`,
    place: (placeId) => `/review/places/${placeId}`,
    event: (eventId) => `/review/events/${eventId}`,
    placeComments: (placeId) => `/review/places/${placeId}/comments`,
    eventComments: (eventId) => `/review/events/${eventId}/comments`,
    deleteComment: (id) => `/review/comments/${id}`,
  },
  socialGraph: {
    connectionCounts: "/social-graph/me/connection-counts",
    myFollowers: "/social-graph/me/followers",
    myFollowing: "/social-graph/me/following",
    state: (userId) => `/social-graph/users/${userId}/state`,
    follow: (userId) => `/social-graph/users/${userId}/follow`,
    unfollow: (userId) => `/social-graph/users/${userId}/unfollow`,
    block: (userId) => `/social-graph/users/${userId}/block`,
    unblock: (userId) => `/social-graph/users/${userId}/unblock`,
    mute: (userId) => `/social-graph/users/${userId}/mute`,
    unmute: (userId) => `/social-graph/users/${userId}/unmute`,
    friendRequest: "/social-graph/friends/request",
    friendIncoming: "/social-graph/friends/incoming",
    friends: "/social-graph/friends",
    removeFriend: (friendId) => `/social-graph/friends/${friendId}`,
    acceptFriend: (requesterId) =>
      `/social-graph/friends/${requesterId}/accept`,
    declineFriend: (requesterId) =>
      `/social-graph/friends/${requesterId}/decline`,
    stateByUsername: (username) =>
      `/social-graph/friends/state-by-username/${username}`,
  },
  socialContent: {
    feed: "/social-content/feed",
    createPost: "/social-content/posts",
    post: (postId) => `/social-content/posts/${postId}`,
    like: (postId) => `/social-content/posts/${postId}/like`,
    save: (postId) => `/social-content/posts/${postId}/save`,
    comments: (postId) => `/social-content/posts/${postId}/comments`,
    report: (postId) => `/social-content/posts/${postId}/report`,
    userPosts: (username) => `/social-content/users/${username}/posts`,
    providerPosts: (slug) => `/social-content/providers/slug/${slug}/posts`,
  },
  messaging: {
    conversations: "/messaging/conversations",
    updateConversation: (id) => `/messaging/conversations/${id}`,
    addConversationMembers: (id) => `/messaging/conversations/${id}/members`,
    removeConversationMember: (conversationId, userId) =>
      `/messaging/conversations/${conversationId}/members/${userId}`,
    setConversationMemberRole: (conversationId, userId) =>
      `/messaging/conversations/${conversationId}/members/${userId}/role`,
    leaveConversation: (id) => `/messaging/conversations/${id}/leave`,
    pinConversation: (id) => `/messaging/conversations/${id}/pin`,
    unpinConversation: (id) => `/messaging/conversations/${id}/unpin`,
    muteConversation: (id) => `/messaging/conversations/${id}/mute`,
    unmuteConversation: (id) => `/messaging/conversations/${id}/unmute`,
    archiveConversation: (id) => `/messaging/conversations/${id}/archive`,
    unarchiveConversation: (id) => `/messaging/conversations/${id}/unarchive`,
    messages: (id) => `/messaging/conversations/${id}/messages`,
    message: (id) => `/messaging/messages/${id}`,
    messageReactions: (id) => `/messaging/messages/${id}/reactions`,
    read: (id) => `/messaging/conversations/${id}/read`,
    inbox: "/messaging/inbox",
    globalMessages: "/messaging/global-messages",
  },
  upload: {
    image: "/upload/image",
    file: "/upload/file",
  },
  stories: {
    create: "/stories",
    feed: "/stories/feed",
    one: (id) => `/stories/${id}`,
    view: (id) => `/stories/${id}/view`,
  },
  notifications: {
    list: "/notifications",
    unreadCount: "/notifications/unread-count",
    preferences: "/notifications/preferences",
    read: (id) => `/notifications/${id}/read`,
    readAll: "/notifications/read-all",
    pushPublicKey: "/notifications/push/public-key",
    pushSubscribe: "/notifications/push/subscribe",
    pushUnsubscribe: "/notifications/push/unsubscribe",
  },
  admin: {
    usersList: "/users",
    usersCreate: "/users",
    usersUpdate: (id) => `/users/${id}`,
    usersDelete: (id) => `/users/${id}`,
    providersList: "/providers",
    providersUpdate: (id) => `/providers/${id}`,
    providersDelete: (id) => `/providers/${id}`,
    placesList: "/place",
    placesCreate: "/place",
    placesUpdate: (id) => `/place/${id}`,
    placesDelete: (id) => `/place/${id}`,
    countriesList: (page = 1, limit = 100) =>
      withQuery("/countries", { page, limit }),
    countriesCreate: "/countries",
    countriesUpdate: (id) => `/countries/${id}`,
    countriesDelete: (id) => `/countries/${id}`,
    citiesList: (page = 1, limit = 100) =>
      withQuery("/cities", { page, limit }),
    citiesCreate: "/cities",
    citiesUpdate: (id) => `/cities/${id}`,
    citiesDelete: (id) => `/cities/${id}`,
    currenciesList: "/currencies",
    currenciesCreate: "/currencies",
    currenciesUpdate: (id) => `/currencies/${id}`,
    currenciesDelete: (id) => `/currencies/${id}`,
    tagsList: "/tag",
    tagsCreate: "/tag",
    tagsUpdate: (id) => `/tag/${id}`,
    tagsDelete: (id) => `/tag/${id}`,
    eventsList: "/events",
    eventsCreate: "/events",
    eventsUpdate: (id) => `/events/${id}`,
    eventsDelete: (id) => `/events/${id}`,
    reviewsList: "/review",
    reviewsCreate: "/review",
    reviewsUpdate: (id) => `/review/${id}`,
    reviewsDelete: (id) => `/review/${id}`,
    placePricingList: "/placepricing",
    placePricingCreate: "/placepricing",
    placePricingUpdate: (id) => `/placepricing/${id}`,
    placePricingDelete: (id) => `/placepricing/${id}`,
    placeOpeningHoursList: "/place-opening-hours",
    placeOpeningHoursCreate: "/place-opening-hours",
    placeOpeningHoursUpdate: (id) => `/place-opening-hours/${id}`,
    placeOpeningHoursDelete: (id) => `/place-opening-hours/${id}`,
    providerMembershipList: "/provider-membership",
    providerMembershipCreate: "/provider-membership",
    providerMembershipUpdate: (id) => `/provider-membership/${id}`,
    providerMembershipDelete: (id) => `/provider-membership/${id}`,
    devicesList: "/users/allowed-devices",
    devicesAdd: "/users/allowed-devices",
    devicesDelete: "/users/allowed-devices",
  },
};
