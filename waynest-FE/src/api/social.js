import {
  del,
  get,
  patch,
  postFormData,
  postJson,
  postNoBody,
} from "@/api/request";
import { ROUTES } from "@/api/routes";
import { pickAvatarField } from "@/utils/avatar";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
};

const toRecord = (value) => (value && typeof value === "object" ? value : {});
const asString = (value, fallback = "") =>
  typeof value === "string" ? value : fallback;
const asNullableString = (value) => (typeof value === "string" ? value : null);
const asBoolean = (value, fallback = false) =>
  typeof value === "boolean" ? value : fallback;
const asNumber = (value, fallback = 0) =>
  typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : fallback;

const normalizeConversationMember = (row) => {
  const item = toRecord(row);
  return {
    userId: asString(item.userId ?? item.id ?? item.user_id),
    username: asString(item.username ?? item.userName ?? item.user_name),
    firstName: asString(
      item.firstName ?? item.first_name ?? item.firstname ?? item.name ?? "",
    ),
    lastName: asString(item.lastName ?? item.last_name ?? item.lastname ?? ""),
    avatarUrl: pickAvatarField(item),
    role: asString(item.role ?? item.roleName ?? item.role_name ?? ""),
    conversationRole: asString(
      item.conversationRole ??
        item.conversation_role ??
        item.memberRole ??
        "MEMBER",
      "MEMBER",
    ),
  };
};

const normalizeInboxItem = (row) => {
  const item = toRecord(row);
  return {
    id: asString(item.id),
    title:
      typeof item.title === "string" || item.title === null ? item.title : null,
    isGroup: asBoolean(item.isGroup),
    ownerUserId: asNullableString(
      item.ownerUserId ?? item.owner_user_id ?? item.createdByUserId ?? null,
    ),
    members: normalizeList(item.members).map(normalizeConversationMember),
    lastMessage: asNullableString(item.lastMessage),
    lastMessageAt:
      asString(item.lastMessageAt) ||
      asString(item.updatedAt) ||
      new Date().toISOString(),
    lastMessageSenderId: asNullableString(item.lastMessageSenderId),
    unreadCount:
      typeof item.unreadCount === "number"
        ? item.unreadCount
        : typeof item.unread_count === "number"
          ? item.unread_count
          : 0,
  };
};

const normalizeReceipt = (row) => {
  if (!row || typeof row !== "object") return null;

  return {
    id: asNullableString(row.id) ?? undefined,
    messageId: asString(row.messageId ?? row.message_id),
    userId: asString(row.userId ?? row.user_id),
    deliveredAt:
      asNullableString(row.deliveredAt) ?? asNullableString(row.delivered_at),
    readAt: asNullableString(row.readAt) ?? asNullableString(row.read_at),
    createdAt:
      asNullableString(row.createdAt) ??
      asNullableString(row.created_at) ??
      undefined,
    updatedAt:
      asNullableString(row.updatedAt) ??
      asNullableString(row.updated_at) ??
      undefined,
  };
};

export const normalizeMessageItem = (row, fallbackConversationId = "") => {
  const item = toRecord(row);
  const sender =
    item.sender && typeof item.sender === "object" ? item.sender : null;

  return {
    id: asString(item.id),
    conversationId:
      asString(item.conversationId ?? item.conversation_id) ||
      fallbackConversationId,
    content: asString(item.content),
    senderId: asString(item.senderId ?? item.sender_id),
    createdAt:
      asString(item.createdAt ?? item.created_at) || new Date().toISOString(),
    sender: sender
      ? {
          id: asString(sender.id),
          username: asNullableString(sender.username) ?? undefined,
          firstName: asNullableString(sender.firstName) ?? undefined,
          lastName: asNullableString(sender.lastName) ?? undefined,
          avatarUrl: pickAvatarField(sender) ?? undefined,
        }
      : undefined,
    receipt: normalizeReceipt(item.receipt),
  };
};

const normalizeStoryItem = (row) => {
  const item = toRecord(row);
  const author = toRecord(item.author);

  return {
    id: asString(item.id),
    imageUrl: asString(item.imageUrl),
    caption:
      typeof item.caption === "string" || item.caption === null
        ? item.caption
        : null,
    createdAt: asString(item.createdAt) || new Date().toISOString(),
    expiresAt: asString(item.expiresAt) || new Date().toISOString(),
    viewsCount: asNumber(item.viewsCount),
    author: {
      id: asString(author.id),
      username: asString(author.username),
      firstName: asString(author.firstName),
      lastName: asString(author.lastName),
      avatarUrl: pickAvatarField(author),
    },
  };
};

export const groupStoriesByAuthor = (stories) => {
  const groups = new Map();

  stories.forEach((story) => {
    const authorId = story.author.id;
    if (!authorId) return;

    const current = groups.get(authorId);
    const authorName =
      story.author.username ||
      `${story.author.firstName} ${story.author.lastName}`.trim() ||
      "Traveler";

    if (!current) {
      groups.set(authorId, {
        authorId,
        authorName,
        avatarUrl: story.author.avatarUrl,
        latestImageUrl: story.imageUrl,
        expiresAt: story.expiresAt,
        items: [story],
      });
      return;
    }

    current.items.push(story);
    if (
      new Date(story.createdAt).getTime() >
      new Date(current.items[0]?.createdAt ?? 0).getTime()
    ) {
      current.latestImageUrl = story.imageUrl;
    }
    if (
      new Date(story.expiresAt).getTime() >
      new Date(current.expiresAt).getTime()
    ) {
      current.expiresAt = story.expiresAt;
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: [...group.items].sort(
        (left, right) =>
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime(),
      ),
    }))
    .sort(
      (left, right) =>
        new Date(
          right.items[right.items.length - 1]?.createdAt ?? 0,
        ).getTime() -
        new Date(left.items[left.items.length - 1]?.createdAt ?? 0).getTime(),
    );
};

export const fetchSocialFeed = async (filter = "for-you") =>
  normalizeList(await get(`${ROUTES.socialContent.feed}?filter=${filter}`));
export const fetchPlaceRecommendations = async (limit) => {
  const query =
    typeof limit === "number" && Number.isFinite(limit)
      ? `?limit=${encodeURIComponent(String(Math.max(1, Math.min(12, limit))))}`
      : "";
  return get(`${ROUTES.socialContent.placeRecommendations}${query}`);
};
export const createSocialPost = async (payload) =>
  postJson(ROUTES.socialContent.createPost, payload);
export const fetchSocialPost = async (postId) =>
  get(ROUTES.socialContent.post(postId));
export const toggleSocialLike = async (postId) =>
  postJson(ROUTES.socialContent.like(postId), {});
export const saveSocialPost = async (postId) =>
  postNoBody(ROUTES.socialContent.save(postId));
export const unsaveSocialPost = async (postId) =>
  del(ROUTES.socialContent.save(postId));
export const fetchPostComments = async (postId) =>
  normalizeList(await get(ROUTES.socialContent.comments(postId)));
export const createPostComment = async (postId, payload) =>
  postJson(ROUTES.socialContent.comments(postId), payload);
export const reportSocialPost = async (postId, reason) =>
  postJson(ROUTES.socialContent.report(postId), { reason });
export const followUser = async (userId) =>
  patch(ROUTES.socialGraph.follow(userId), {});
export const unfollowUser = async (userId) =>
  patch(ROUTES.socialGraph.unfollow(userId), {});
export const blockUser = async (userId) =>
  patch(ROUTES.socialGraph.block(userId), {});
export const unblockUser = async (userId) =>
  patch(ROUTES.socialGraph.unblock(userId), {});
export const muteUser = async (userId) =>
  patch(ROUTES.socialGraph.mute(userId), {});
export const unmuteUser = async (userId) =>
  patch(ROUTES.socialGraph.unmute(userId), {});
export const getSocialGraphState = async (userId) =>
  get(ROUTES.socialGraph.state(userId));
export const getFriendshipStateByUsername = async (username) =>
  get(ROUTES.socialGraph.stateByUsername(username));
export const requestFriendship = async (username) =>
  postJson(ROUTES.socialGraph.friendRequest, { username });
export const acceptFriendship = async (requesterId) =>
  patch(ROUTES.socialGraph.acceptFriend(requesterId), {});
export const declineFriendship = async (requesterId) =>
  patch(ROUTES.socialGraph.declineFriend(requesterId), {});
export const removeFriendship = async (friendId) =>
  del(ROUTES.socialGraph.removeFriend(friendId));
const buildFriendsUrl = (q) => {
  const base = ROUTES.socialGraph.friends;
  const trimmed = typeof q === "string" ? q.trim() : "";
  return trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
};

const buildFollowersUrl = (q) => {
  const base = ROUTES.socialGraph.myFollowers;
  const trimmed = typeof q === "string" ? q.trim() : "";
  return trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
};

const buildFollowingUrl = (q) => {
  const base = ROUTES.socialGraph.myFollowing;
  const trimmed = typeof q === "string" ? q.trim() : "";
  return trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
};

export const fetchMyConnectionCounts = async () => {
  const data = toRecord(await get(ROUTES.socialGraph.connectionCounts));
  return {
    friendsCount:
      typeof data.friendsCount === "number"
        ? data.friendsCount
        : Number.parseInt(String(data.friendsCount ?? 0), 10) || 0,
    followersCount:
      typeof data.followersCount === "number"
        ? data.followersCount
        : Number.parseInt(String(data.followersCount ?? 0), 10) || 0,
    followingCount:
      typeof data.followingCount === "number"
        ? data.followingCount
        : Number.parseInt(String(data.followingCount ?? 0), 10) || 0,
  };
};

export const fetchFriends = async (q) =>
  normalizeList(await get(buildFriendsUrl(q))).map(normalizeConversationMember);

export const fetchMyFollowers = async (q) =>
  normalizeList(await get(buildFollowersUrl(q))).map(
    normalizeConversationMember,
  );

export const fetchMyFollowing = async (q) =>
  normalizeList(await get(buildFollowingUrl(q))).map(
    normalizeConversationMember,
  );
export const fetchIncomingFriendRequests = async () =>
  normalizeList(await get(ROUTES.socialGraph.friendIncoming));
export const fetchUserPostsByUsername = async (username) =>
  normalizeList(await get(ROUTES.socialContent.userPosts(username)));
export const fetchProviderPostsBySlug = async (slug) =>
  normalizeList(await get(ROUTES.socialContent.providerPosts(slug)));
export const fetchInbox = async () =>
  normalizeList(await get(ROUTES.messaging.inbox)).map(normalizeInboxItem);
export const openAiConversation = async () =>
  postJson(ROUTES.messaging.aiConversation, {}).then((response) => {
    const payload = toRecord(response);
    const conversation = toRecord(payload.conversation);
    return {
      conversation: {
        id: asString(conversation.id),
        title:
          typeof conversation.title === "string" || conversation.title === null
            ? conversation.title
            : null,
        isGroup: asBoolean(conversation.isGroup),
      },
      assistant:
        payload.assistant && typeof payload.assistant === "object"
          ? payload.assistant
          : null,
      firstMessage:
        payload.firstMessage && typeof payload.firstMessage === "object"
          ? normalizeMessageItem(payload.firstMessage, asString(conversation.id))
          : null,
    };
  });

export const uploadChatAttachment = async (file) => {
  if (!file) return null;
  const formData = new FormData();
  formData.append("file", file);
  const response = await postFormData(
    ROUTES.upload.file ?? ROUTES.upload.image,
    formData,
  );
  const payload = toRecord(response);
  return asString(payload.url ?? payload.path);
};

export const uploadChatImage = uploadChatAttachment;

export const createConversation = async (payload) =>
  postJson(ROUTES.messaging.conversations, payload).then((response) => {
    const res = toRecord(response);
    const conversation = toRecord(res.conversation);
    const rawFirstMessage =
      res.firstMessage && typeof res.firstMessage === "object"
        ? res.firstMessage
        : null;

    return {
      conversation: {
        id: asString(conversation.id),
        title:
          typeof conversation.title === "string" || conversation.title === null
            ? conversation.title
            : null,
        isGroup: asBoolean(conversation.isGroup),
      },
      firstMessage: rawFirstMessage
        ? normalizeMessageItem(rawFirstMessage)
        : null,
    };
  });

export const updateConversation = async (conversationId, payload) =>
  patch(ROUTES.messaging.updateConversation(conversationId), payload);
export const addConversationMembers = async (conversationId, payload) =>
  postJson(ROUTES.messaging.addConversationMembers(conversationId), payload);
export const removeConversationMember = async (conversationId, userId) =>
  del(ROUTES.messaging.removeConversationMember(conversationId, userId));
export const setConversationMemberRole = async (conversationId, userId, role) =>
  patch(ROUTES.messaging.setConversationMemberRole(conversationId, userId), {
    role,
  });
export const leaveConversation = async (conversationId) =>
  del(ROUTES.messaging.leaveConversation(conversationId));
export const fetchConversationMessages = async (conversationId) =>
  normalizeList(await get(ROUTES.messaging.messages(conversationId))).map(
    (row) => normalizeMessageItem(row, conversationId),
  );

export const fetchGlobalMessages = async (params) => {
  const searchParams = new URLSearchParams();
  searchParams.set(
    "limit",
    typeof params?.limit === "number" ? String(params.limit) : "30",
  );
  if (params?.before) searchParams.set("before", params.before);
  return normalizeList(
    await get(`${ROUTES.messaging.globalMessages}?${searchParams.toString()}`),
  ).map((row) => normalizeMessageItem(row));
};

export const sendMessage = async (
  conversationId,
  content,
  replyToMessageId = null,
) =>
  postJson(ROUTES.messaging.messages(conversationId), {
    content,
    ...(replyToMessageId ? { replyToMessageId } : {}),
  }).then((payload) => normalizeMessageItem(payload, conversationId));
export const markConversationRead = async (conversationId) =>
  patch(ROUTES.messaging.read(conversationId), {});

export const editMessage = async (messageId, conversationId, payload) =>
  patch(
    `${ROUTES.messaging.message(messageId)}?conversationId=${encodeURIComponent(conversationId)}`,
    payload,
  );

export const deleteMessage = async (messageId, conversationId) =>
  del(
    `${ROUTES.messaging.message(messageId)}?conversationId=${encodeURIComponent(conversationId)}`,
  );

export const reactToMessage = async (messageId, conversationId, payload) =>
  postJson(
    `${ROUTES.messaging.messageReactions(messageId)}?conversationId=${encodeURIComponent(conversationId)}`,
    payload,
  );

export const pinConversation = async (conversationId) =>
  patch(ROUTES.messaging.pinConversation(conversationId), {});

export const unpinConversation = async (conversationId) =>
  patch(ROUTES.messaging.unpinConversation(conversationId), {});

export const muteConversation = async (conversationId) =>
  patch(ROUTES.messaging.muteConversation(conversationId), {});

export const unmuteConversation = async (conversationId) =>
  patch(ROUTES.messaging.unmuteConversation(conversationId), {});

export const archiveConversation = async (conversationId) =>
  patch(ROUTES.messaging.archiveConversation(conversationId), {});

export const unarchiveConversation = async (conversationId) =>
  patch(ROUTES.messaging.unarchiveConversation(conversationId), {});
export const createStory = async (payload) =>
  postJson(ROUTES.stories.create, payload).then(normalizeStoryItem);
export const fetchStoryFeed = async () =>
  normalizeList(await get(ROUTES.stories.feed)).map(normalizeStoryItem);
export const fetchStoryById = async (storyId) =>
  get(ROUTES.stories.one(storyId)).then(normalizeStoryItem);
export const viewStory = async (storyId) =>
  postNoBody(ROUTES.stories.view(storyId));

const normalizeNotificationItem = (row) => {
  const item = toRecord(row);
  const meta = toRecord(item.meta);
  const actor =
    item.actor && typeof item.actor === "object" ? item.actor : null;

  return {
    id: asString(item.id),
    type: asString(item.type),
    message: asString(item.message),
    isRead: asBoolean(item.isRead),
    createdAt:
      asString(item.createdAt ?? item.created_at) || new Date().toISOString(),
    meta,
    actor: actor
      ? {
          id: asString(actor.id),
          username: asString(actor.username),
          avatarUrl: pickAvatarField(actor) ?? undefined,
          firstName: asNullableString(actor.firstName) ?? undefined,
          lastName: asNullableString(actor.lastName) ?? undefined,
        }
      : null,
    actorUsername: actor ? asString(actor.username) : null,
    postId: meta.postId != null ? String(meta.postId) : null,
    conversationId:
      meta.conversationId != null ? String(meta.conversationId) : null,
    bookingId: meta.bookingId != null ? String(meta.bookingId) : null,
    placeSlug: meta.placeSlug != null ? String(meta.placeSlug) : null,
    reviewId: meta.reviewId != null ? String(meta.reviewId) : null,
    copiedTripPlanId:
      meta.copiedTripPlanId != null ? String(meta.copiedTripPlanId) : null,
    status: meta.status != null ? String(meta.status) : null,
  };
};

/**
 * In-app route for a notification (post, inbox, provider bookings, place, profile, etc.).
 */
export function getNotificationHref(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const type = item.type;
  const meta = item.meta && typeof item.meta === "object" ? item.meta : {};
  const postId = item.postId ?? meta.postId;
  const conversationId = item.conversationId ?? meta.conversationId;
  const placeSlug = item.placeSlug ?? meta.placeSlug;
  const actorUsername =
    item.actorUsername ??
    (item.actor && typeof item.actor === "object" ? item.actor.username : null);

  if (postId) {
    return `/social/post/${encodeURIComponent(String(postId))}`;
  }
  if (type === "MESSAGE" && conversationId) {
    return `/inbox/${encodeURIComponent(String(conversationId))}`;
  }
  if (type === "BOOKING_NEW") {
    return "/account/provider/bookings";
  }
  if (type === "BOOKING_STATUS") {
    return "/bookings";
  }
  if (type === "REVIEW_NEW" && placeSlug) {
    return `/places/${encodeURIComponent(String(placeSlug))}`;
  }
  if (type === "PLAN_COPIED") {
    return "/saved-plans";
  }
  if (
    type === "FRIEND_REQUEST" ||
    type === "FRIEND_ACCEPTED" ||
    type === "FOLLOW"
  ) {
    if (actorUsername) {
      return `/u/${encodeURIComponent(String(actorUsername))}`;
    }
    return "/profile/friends";
  }
  if (actorUsername) {
    return `/u/${encodeURIComponent(String(actorUsername))}`;
  }
  return null;
}

export const fetchNotifications = async (limit = 40) => {
  const safe = Math.min(Math.max(Number(limit) || 40, 1), 100);
  return normalizeList(
    await get(`${ROUTES.notifications.list}?limit=${safe}`),
  ).map(normalizeNotificationItem);
};

export const fetchUnreadNotificationCount = async () => {
  const raw = await get(ROUTES.notifications.unreadCount);
  const r = toRecord(raw);
  const count = typeof r.count === "number" ? r.count : Number(r.count);
  return { count: Number.isFinite(count) ? count : 0 };
};

export const fetchNotificationPreferences = async () => {
  const raw = await get(ROUTES.notifications.preferences);
  const payload = toRecord(raw);
  const channels = toRecord(payload.channels);
  const typePrefs = toRecord(payload.typePreferences);

  const normalizedTypePrefs = Object.fromEntries(
    Object.entries(typePrefs).filter(([, value]) => typeof value === "boolean"),
  );

  return {
    channels: {
      inApp: typeof channels.inApp === "boolean" ? channels.inApp : true,
      push: typeof channels.push === "boolean" ? channels.push : true,
      email: typeof channels.email === "boolean" ? channels.email : false,
    },
    typePreferences: normalizedTypePrefs,
  };
};

export const updateNotificationPreferences = async (payload) =>
  patch(ROUTES.notifications.preferences, payload);

export const markNotificationRead = async (id) =>
  patch(ROUTES.notifications.read(id), {});
export const markAllNotificationsRead = async () =>
  patch(ROUTES.notifications.readAll, {});

export const fetchPushPublicKey = async () => {
  const raw = await get(ROUTES.notifications.pushPublicKey);
  const payload = toRecord(raw);
  return asString(payload.publicKey).trim();
};

export const subscribePushNotifications = async (payload) =>
  postJson(ROUTES.notifications.pushSubscribe, payload);

export const unsubscribePushNotifications = async (endpoint) =>
  postJson(ROUTES.notifications.pushUnsubscribe, { endpoint });
