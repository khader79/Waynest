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
  calendar: {
    list: "/calendar",
    create: "/calendar",
    update: (id) => `/calendar/${id}`,
    remove: (id) => `/calendar/${id}`,
    shareTrip: (tripPlanId) => `/calendar/share-trip/${tripPlanId}`,
  },
  billing: {
    plans: "/subscriptions/plans",
    mySubscription: "/subscriptions/plans/me",
    myWallet: "/credits",
    myTransactions: "/credits/transactions",
    upgrade: "/billing/upgrade",
    downgrade: "/billing/downgrade",
    cancel: "/billing/cancel",
    reactivate: "/billing/reactivate",
    history: "/billing/history",
    createCheckoutSession: "/billing/create-checkout-session",
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
    verificationRequestStatus: (id) =>
      `/providers/verification-requests/${id}/status`,
    applications: {
      list: "/provider-applications",
      one: (id) => `/provider-applications/${id}`,
      submit: "/provider-applications",
      update: (id) => `/provider-applications/${id}`,
      status: (id) => `/provider-applications/${id}/status`,
      me: "/provider-applications/me",
      approve: (id) => `/provider-applications/${id}/approve`,
      reject: (id) => `/provider-applications/${id}/reject`,
    },
    events: {
      list: "/events",
      create: "/events",
      one: (id) => `/events/${id}`,
      update: (id) => `/events/${id}`,
      remove: (id) => `/events/${id}`,
    },
    bookings: {
      list: "/bookings",
      create: "/bookings",
      one: (id) => `/bookings/${id}`,
      updateStatus: (id) => `/bookings/${id}/status`,
    },
  },
  wishlist: {
    list: "/wishlist",
    add: "/wishlist",
    remove: (id) => `/wishlist/${id}`,
  },
  admin: {
    dashboardStats: "/admin/dashboard/stats",
    billing: {
      seedPlans: "/admin/billing/seed-plans",
      plans: "/admin/billing/plans",
      upgrade: (userId) => `/admin/billing/users/${userId}/upgrade`,
      cancel: (userId) => `/admin/billing/users/${userId}/cancel-subscription`,
      grantCredits: (userId) => `/admin/billing/users/${userId}/grant-credits`,
      balance: (userId) => `/admin/billing/users/${userId}/balance`,
      billingHistory: (userId) =>
        `/admin/billing/users/${userId}/billing-history`,
      auditLogs: "/admin/billing/audit-logs",
    },
    users: {
      list: "/users",
      create: "/users",
      one: (id) => `/users/${id}`,
      update: (id) => `/users/${id}`,
      delete: (id) => `/users/${id}`,
    },
    providers: {
      list: "/providers",
      one: (id) => `/providers/${id}`,
      update: (id) => `/providers/${id}`,
      delete: (id) => `/providers/${id}`,
      verify: (id) => `/providers/${id}/verify`,
    },
    places: {
      list: "/place",
      one: (id) => `/place/${id}`,
      create: "/place",
      update: (id) => `/place/${id}`,
      delete: (id) => `/place/${id}`,
    },
    cities: {
      list: "/cities",
      create: "/cities",
      update: (id) => `/cities/${id}`,
      delete: (id) => `/cities/${id}`,
    },
    countries: {
      list: "/countries",
      create: "/countries",
      update: (id) => `/countries/${id}`,
      delete: (id) => `/countries/${id}`,
    },
    currencies: {
      list: "/currencies",
      create: "/currencies",
      update: (id) => `/currencies/${id}`,
      delete: (id) => `/currencies/${id}`,
    },
    tags: {
      list: "/tag",
      create: "/tag",
      update: (id) => `/tag/${id}`,
      delete: (id) => `/tag/${id}`,
    },
    events: {
      list: "/events",
      create: "/events",
      update: (id) => `/events/${id}`,
      delete: (id) => `/events/${id}`,
    },
    reviews: {
      list: "/review",
      create: "/review",
      update: (id) => `/review/${id}`,
      delete: (id) => `/review/${id}`,
    },
    placePricing: {
      list: "/placepricing",
      create: "/placepricing",
      update: (id) => `/placepricing/${id}`,
      delete: (id) => `/placepricing/${id}`,
    },
    placeOpeningHours: {
      list: "/place-opening-hours",
      create: "/place-opening-hours",
      update: (id) => `/place-opening-hours/${id}`,
      delete: (id) => `/place-opening-hours/${id}`,
    },
    providerMembership: {
      list: "/provider-membership",
      create: "/provider-membership",
      update: (id) => `/provider-membership/${id}`,
      delete: (id) => `/provider-membership/${id}`,
    },
    devices: {
      list: "/users/allowed-devices",
      add: "/users/allowed-devices",
      delete: (fp) => `/users/allowed-devices/${encodeURIComponent(fp)}`,
    },
  },
  socialGraph: {
    friends: "/social-graph/friends",
    friendIncoming: "/social-graph/friends/incoming",
    friendRequest: "/social-graph/friends/request",
    acceptFriend: (id) => `/social-graph/friends/${id}/accept`,
    declineFriend: (id) => `/social-graph/friends/${id}/decline`,
    removeFriend: (id) => `/social-graph/friends/${id}`,
    follow: (id) => `/social-graph/users/${id}/follow`,
    unfollow: (id) => `/social-graph/users/${id}/unfollow`,
    block: (id) => `/social-graph/users/${id}/block`,
    unblock: (id) => `/social-graph/users/${id}/unblock`,
    mute: (id) => `/social-graph/users/${id}/mute`,
    unmute: (id) => `/social-graph/users/${id}/unmute`,
    state: (id) => `/social-graph/users/${id}/state`,
    stateByUsername: (username) =>
      `/social-graph/friends/state-by-username/${encodeURIComponent(username)}`,
    connectionCounts: "/social-graph/me/connection-counts",
    myFollowers: "/social-graph/me/followers",
    myFollowing: "/social-graph/me/following",
  },
  socialContent: {
    feed: "/social-content/feed",
    placeRecommendations: "/social-content/recommendations/places",
    createPost: "/social-content/posts",
    post: (id) => `/social-content/posts/${id}`,
    like: (id) => `/social-content/posts/${id}/like`,
    save: (id) => `/social-content/posts/${id}/save`,
    comments: (id) => `/social-content/posts/${id}/comments`,
    report: (id) => `/social-content/posts/${id}/report`,
    userPosts: (username) =>
      `/social-content/users/${encodeURIComponent(username)}/posts`,
    providerPosts: (slug) =>
      `/social-content/providers/slug/${encodeURIComponent(slug)}/posts`,
  },
  messaging: {
    inbox: "/messaging/inbox",
    aiConversation: "/messaging/ai/conversation",
    conversations: "/messaging/conversations",
    updateConversation: (id) => `/messaging/conversations/${id}`,
    addConversationMembers: (id) => `/messaging/conversations/${id}/members`,
    removeConversationMember: (id, userId) =>
      `/messaging/conversations/${id}/members/${userId}`,
    setConversationMemberRole: (id, userId) =>
      `/messaging/conversations/${id}/members/${userId}/role`,
    leaveConversation: (id) => `/messaging/conversations/${id}/leave`,
    messages: (id) => `/messaging/conversations/${id}/messages`,
    read: (id) => `/messaging/conversations/${id}/read`,
    globalMessages: "/messaging/global-messages",
    message: (id) => `/messaging/messages/${id}`,
    messageReactions: (id) => `/messaging/messages/${id}/reactions`,
    pinConversation: (id) => `/messaging/conversations/${id}/pin`,
    unpinConversation: (id) => `/messaging/conversations/${id}/unpin`,
    muteConversation: (id) => `/messaging/conversations/${id}/mute`,
    unmuteConversation: (id) => `/messaging/conversations/${id}/unmute`,
    archiveConversation: (id) => `/messaging/conversations/${id}/archive`,
    unarchiveConversation: (id) => `/messaging/conversations/${id}/unarchive`,
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
  stories: {
    create: "/stories",
    feed: "/stories/feed",
    one: (id) => `/stories/${id}`,
    view: (id) => `/stories/${id}/view`,
  },
  contact: "/contact",
  upload: {
    image: "/upload/image",
    file: "/upload/file",
  },
};
