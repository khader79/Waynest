import { del, get, patch, postJson, postNoBody } from "@/api/request";
import { ROUTES } from "@/api/routes";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
};

const toRecord = (value) => (value && typeof value === "object" ? value : {});
const asString = (value, fallback = "") => (typeof value === "string" ? value : fallback);
const asNullableString = (value) => (typeof value === "string" ? value : null);
const asBoolean = (value, fallback = false) => (typeof value === "boolean" ? value : fallback);
const asNumber = (value, fallback = 0) =>
  typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : fallback;

const normalizeConversationMember = (row) => {
  const item = toRecord(row);
  return {
    userId: asString(item.userId ?? item.id),
    username: asString(item.username),
    firstName: asString(item.firstName),
    lastName: asString(item.lastName),
    avatarUrl: asNullableString(item.avatarUrl),
    role: asString(item.role),
  };
};

const normalizeInboxItem = (row) => {
  const item = toRecord(row);
  return {
    id: asString(item.id),
    title: typeof item.title === "string" || item.title === null ? item.title : null,
    isGroup: asBoolean(item.isGroup),
    members: normalizeList(item.members).map(normalizeConversationMember),
    lastMessage: asNullableString(item.lastMessage),
    lastMessageAt: asString(item.lastMessageAt) || asString(item.updatedAt) || new Date().toISOString(),
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
    deliveredAt: asNullableString(row.deliveredAt) ?? asNullableString(row.delivered_at),
    readAt: asNullableString(row.readAt) ?? asNullableString(row.read_at),
    createdAt:
      asNullableString(row.createdAt) ?? asNullableString(row.created_at) ?? undefined,
    updatedAt:
      asNullableString(row.updatedAt) ?? asNullableString(row.updated_at) ?? undefined,
  };
};

const normalizeMessageItem = (row, fallbackConversationId = "") => {
  const item = toRecord(row);
  const sender = item.sender && typeof item.sender === "object" ? item.sender : null;

  return {
    id: asString(item.id),
    conversationId: asString(item.conversationId ?? item.conversation_id) || fallbackConversationId,
    content: asString(item.content),
    senderId: asString(item.senderId ?? item.sender_id),
    createdAt: asString(item.createdAt ?? item.created_at) || new Date().toISOString(),
    sender: sender
      ? {
          id: asString(sender.id),
          username: asNullableString(sender.username) ?? undefined,
          firstName: asNullableString(sender.firstName) ?? undefined,
          lastName: asNullableString(sender.lastName) ?? undefined,
          avatarUrl: asNullableString(sender.avatarUrl) ?? undefined,
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
    caption: typeof item.caption === "string" || item.caption === null ? item.caption : null,
    createdAt: asString(item.createdAt) || new Date().toISOString(),
    expiresAt: asString(item.expiresAt) || new Date().toISOString(),
    viewsCount: asNumber(item.viewsCount),
    author: {
      id: asString(author.id),
      username: asString(author.username),
      firstName: asString(author.firstName),
      lastName: asString(author.lastName),
      avatarUrl: asNullableString(author.avatarUrl),
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
    if (new Date(story.createdAt).getTime() > new Date(current.items[0]?.createdAt ?? 0).getTime()) {
      current.latestImageUrl = story.imageUrl;
    }
    if (new Date(story.expiresAt).getTime() > new Date(current.expiresAt).getTime()) {
      current.expiresAt = story.expiresAt;
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: [...group.items].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      ),
    }))
    .sort(
      (left, right) =>
        new Date(right.items[right.items.length - 1]?.createdAt ?? 0).getTime() -
        new Date(left.items[left.items.length - 1]?.createdAt ?? 0).getTime(),
    );
};

export const fetchSocialFeed = async (filter = "for-you") =>
  normalizeList(await get(`${ROUTES.socialContent.feed}?filter=${filter}`));
export const createSocialPost = async (payload) => postJson(ROUTES.socialContent.createPost, payload);
export const fetchSocialPost = async (postId) => get(ROUTES.socialContent.post(postId));
export const toggleSocialLike = async (postId) => postJson(ROUTES.socialContent.like(postId), {});
export const saveSocialPost = async (postId) => postNoBody(ROUTES.socialContent.save(postId));
export const unsaveSocialPost = async (postId) => del(ROUTES.socialContent.save(postId));
export const fetchPostComments = async (postId) =>
  normalizeList(await get(ROUTES.socialContent.comments(postId)));
export const createPostComment = async (postId, payload) =>
  postJson(ROUTES.socialContent.comments(postId), payload);
export const reportSocialPost = async (postId, reason) =>
  postJson(ROUTES.socialContent.report(postId), { reason });
export const followUser = async (userId) => patch(ROUTES.socialGraph.follow(userId), {});
export const unfollowUser = async (userId) => patch(ROUTES.socialGraph.unfollow(userId), {});
export const getSocialGraphState = async (userId) => get(ROUTES.socialGraph.state(userId));
export const getFriendshipStateByUsername = async (username) =>
  get(ROUTES.socialGraph.stateByUsername(username));
export const requestFriendship = async (username) =>
  postJson(ROUTES.socialGraph.friendRequest, { username });
export const acceptFriendship = async (requesterId) =>
  patch(ROUTES.socialGraph.acceptFriend(requesterId), {});
export const declineFriendship = async (requesterId) =>
  patch(ROUTES.socialGraph.declineFriend(requesterId), {});
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
  normalizeList(await get(buildFollowersUrl(q))).map(normalizeConversationMember);

export const fetchMyFollowing = async (q) =>
  normalizeList(await get(buildFollowingUrl(q))).map(normalizeConversationMember);
export const fetchIncomingFriendRequests = async () =>
  normalizeList(await get(ROUTES.socialGraph.friendIncoming));
export const fetchUserPostsByUsername = async (username) =>
  normalizeList(await get(ROUTES.socialContent.userPosts(username)));
export const fetchProviderPostsBySlug = async (slug) =>
  normalizeList(await get(ROUTES.socialContent.providerPosts(slug)));
export const fetchInbox = async () =>
  normalizeList(await get(ROUTES.messaging.inbox)).map(normalizeInboxItem);

export const createConversation = async (payload) =>
  postJson(ROUTES.messaging.conversations, payload).then((response) => ({
    conversation: {
      id: asString(toRecord(response).conversation && toRecord(toRecord(response).conversation).id),
      title: (() => {
        const conversation = toRecord(toRecord(response).conversation);
        return typeof conversation.title === "string" || conversation.title === null
          ? conversation.title
          : null;
      })(),
      isGroup: asBoolean(toRecord(toRecord(response).conversation).isGroup),
    },
    firstMessage: normalizeMessageItem(toRecord(response).firstMessage),
  }));

export const updateConversation = async (conversationId, payload) =>
  patch(ROUTES.messaging.updateConversation(conversationId), payload);
export const fetchConversationMessages = async (conversationId) =>
  normalizeList(await get(ROUTES.messaging.messages(conversationId))).map((row) =>
    normalizeMessageItem(row, conversationId),
  );

export const fetchGlobalMessages = async (params) => {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", typeof params?.limit === "number" ? String(params.limit) : "30");
  if (params?.before) searchParams.set("before", params.before);
  return normalizeList(
    await get(`${ROUTES.messaging.globalMessages}?${searchParams.toString()}`),
  ).map((row) => normalizeMessageItem(row));
};

export const sendMessage = async (conversationId, content) =>
  postJson(ROUTES.messaging.messages(conversationId), { content }).then((payload) =>
    normalizeMessageItem(payload, conversationId),
  );
export const markConversationRead = async (conversationId) =>
  patch(ROUTES.messaging.read(conversationId), {});
export const createStory = async (payload) =>
  postJson(ROUTES.stories.create, payload).then(normalizeStoryItem);
export const fetchStoryFeed = async () =>
  normalizeList(await get(ROUTES.stories.feed)).map(normalizeStoryItem);
export const fetchStoryById = async (storyId) =>
  get(ROUTES.stories.one(storyId)).then(normalizeStoryItem);
export const viewStory = async (storyId) => postNoBody(ROUTES.stories.view(storyId));
export const fetchNotifications = async () =>
  normalizeList(await get(ROUTES.notifications.list));
export const markNotificationRead = async (id) =>
  patch(ROUTES.notifications.read(id), {});
export const markAllNotificationsRead = async () =>
  patch(ROUTES.notifications.readAll, {});
