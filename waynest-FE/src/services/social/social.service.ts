import { pickAvatarField } from "@/utils/avatar";
import {
  del,
  get,
  patch,
  postFormData,
  postJson,
  postNoBody,
} from "@/services/http/apiService";
import {
  MESSAGING_ENDPOINTS,
  NOTIFICATIONS_ENDPOINTS,
  SOCIAL_CONTENT_ENDPOINTS,
  SOCIAL_GRAPH_ENDPOINTS,
  STORIES_ENDPOINTS,
  UPLOAD_ENDPOINTS,
} from "@/services/http/endpoints";

export type SocialPostVisibility =
  | "PUBLIC"
  | "FRIENDS"
  | "FOLLOWERS"
  | "PRIVATE";

export type SocialPost = {
  id: string;
  authorId: string;
  providerId?: string | null;
  provider?: { id: string; displayName?: string };
  title?: string | null;
  body?: string | null;
  shareSlug?: string | null;
  imageUrls?: string[];
  snapshot?: Record<string, unknown> | null;
  visibility: SocialPostVisibility;
  createdAt: string;
  author?: { id: string; username?: string; avatarUrl?: string | null };
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
};

export type RecommendedPlace = {
  id: string;
  slug: string;
  name: string;
  type: string;
  imageUrl: string | null;
  description: string;
  ratingAverage: number;
  ratingCount: number;
  isVerified: boolean;
  city: {
    id: string | null;
    name: string | null;
    countryName: string | null;
  };
  provider: {
    id: string | null;
    displayName: string | null;
    slug: string | null;
  };
  tags: Array<{ id: string; name: string }>;
  score: number;
  reason: string;
  reasons: string[];
  matchedSignals: string[];
};

export type RecommendedPlacesPayload = {
  source: "personalized" | "trending";
  profile: {
    confidence: "low" | "medium" | "high";
    topTags: string[];
    topTypes: string[];
    topCities: string[];
    topProviders: string[];
  };
  items: RecommendedPlace[];
};

export type FriendSummary = {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
};

export type ConversationMemberSummary = {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  conversationRole: "MEMBER" | "ADMIN";
};

export type ConversationSummary = {
  id: string;
  title: string | null;
  isGroup: boolean;
  ownerUserId: string | null;
  members: ConversationMemberSummary[];
  lastMessage: string | null;
  lastMessageAt: string;
  lastMessageSenderId: string | null;
  unreadCount: number;
};

export type OpenAiConversationResult = {
  conversation: {
    id: string;
    title: string | null;
    isGroup: boolean;
  };
  assistant: {
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
  firstMessage: ConversationMessage | null;
};

export type AiReplyPayload = {
  content?: string;
  userMessage?: string;
};

export type MessageReceipt = {
  id?: string;
  messageId: string;
  userId: string;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender?: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
  };
  receipt?: MessageReceipt | null;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'seen';
};

export type StoryItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  viewsCount: number;
  author: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
};

export type StorySummary = {
  authorId: string;
  authorName: string;
  avatarUrl: string | null;
  latestImageUrl: string;
  expiresAt: string;
  items: StoryItem[];
};

const normalizeList = <TItem>(payload: unknown): TItem[] => {
  if (Array.isArray(payload)) {
    return payload as TItem[];
  }
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: TItem[] }).data)
  ) {
    return (payload as { data: TItem[] }).data;
  }
  return [];
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asNullableString = (value: unknown) =>
  typeof value === "string" ? value : null;

const asBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : fallback;

const normalizeConversationMember = (
  row: unknown,
): ConversationMemberSummary => {
  const item = toRecord(row);
  return {
    userId: asString(item.userId ?? item.id ?? item.user_id),
    username: asString(item.username ?? item.userName ?? item.user_name),
    firstName: asString(
      item.firstName ?? item.first_name ?? item.firstname ?? item.name ?? "",
    ),
    lastName: asString(item.lastName ?? item.last_name ?? item.lastname ?? ""),
    avatarUrl: asNullableString(
      pickAvatarField(item) ?? item.avatarUrl ?? item.avatar_url ?? item.avatar ?? null,
    ),
    role: asString(item.role ?? item.roleName ?? item.role_name ?? ""),
    conversationRole: asString(
      item.conversationRole ??
        item.conversation_role ??
        item.memberRole ??
        "MEMBER",
      "MEMBER",
    ) as "MEMBER" | "ADMIN",
  };
};

const normalizeInboxItem = (row: unknown): ConversationSummary => {
  const item = toRecord(row);
  return {
    id: asString(item.id),
    title:
      typeof item.title === "string" || item.title === null
        ? (item.title as string | null)
        : null,
    isGroup: asBoolean(item.isGroup),
    ownerUserId: asNullableString(
      item.ownerUserId ?? item.owner_user_id ?? item.createdByUserId ?? null,
    ),
    members: normalizeList<unknown>(item.members).map(
      normalizeConversationMember,
    ),
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
          ? (item.unread_count as number)
          : 0,
  };
};

const normalizeReceipt = (row: unknown): MessageReceipt | null => {
  if (!row || typeof row !== "object") {
    return null;
  }

  const item = row as Record<string, unknown>;
  return {
    id: asNullableString(item.id) ?? undefined,
    messageId: asString(item.messageId ?? item.message_id),
    userId: asString(item.userId ?? item.user_id),
    deliveredAt:
      asNullableString(item.deliveredAt) ?? asNullableString(item.delivered_at),
    readAt: asNullableString(item.readAt) ?? asNullableString(item.read_at),
    createdAt:
      asNullableString(item.createdAt) ??
      asNullableString(item.created_at) ??
      undefined,
    updatedAt:
      asNullableString(item.updatedAt) ??
      asNullableString(item.updated_at) ??
      undefined,
  };
};

const normalizeMessageItem = (
  row: unknown,
  fallbackConversationId = "",
): ConversationMessage => {
  const item = toRecord(row);
  const sender =
    item.sender && typeof item.sender === "object"
      ? (item.sender as Record<string, unknown>)
      : null;

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
          avatarUrl: asNullableString(pickAvatarField(sender) ?? sender.avatarUrl) ?? undefined,
        }
      : undefined,
    receipt: normalizeReceipt(item.receipt),
    deliveryStatus: asNullableString(
      item.deliveryStatus ?? item.delivery_status,
    ) as 'pending' | 'sent' | 'delivered' | 'seen' | null,
  };
};

const normalizeStoryItem = (row: unknown): StoryItem => {
  const item = toRecord(row);
  const author = toRecord(item.author);

  return {
    id: asString(item.id),
    imageUrl: asString(item.imageUrl),
    caption:
      typeof item.caption === "string" || item.caption === null
        ? (item.caption as string | null)
        : null,
    createdAt: asString(item.createdAt) || new Date().toISOString(),
    expiresAt: asString(item.expiresAt) || new Date().toISOString(),
    viewsCount: asNumber(item.viewsCount),
    author: {
      id: asString(author.id),
      username: asString(author.username),
      firstName: asString(author.firstName),
      lastName: asString(author.lastName),
      avatarUrl: asNullableString(pickAvatarField(author) ?? author.avatarUrl),
    },
  };
};

export const groupStoriesByAuthor = (stories: StoryItem[]): StorySummary[] => {
  const groups = new Map<string, StorySummary>();

  stories.forEach((story) => {
    const authorId = story.author.id;
    if (!authorId) {
      return;
    }

    const current = groups.get(authorId);
    const authorName =
      story.author.username ||
      `${story.author.firstName} ${story.author.lastName}`.trim() ||
      "Traveler";

    if (!current) {
      groups.set(authorId, {
        authorId,
        authorName,
        avatarUrl: pickAvatarField(story.author) ?? story.author.avatarUrl,
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

export const fetchSocialFeed = async (
  filter: "for-you" | "following" | "providers" = "for-you",
  limit?: number,
) => {
  const searchParams = new URLSearchParams();
  searchParams.set("filter", filter);

  if (typeof limit === "number" && Number.isFinite(limit)) {
    searchParams.set("limit", String(Math.max(1, Math.min(50, limit))));
  }

  return normalizeList<SocialPost>(
    await get<SocialPost[] | { data: SocialPost[] }>(
      `${SOCIAL_CONTENT_ENDPOINTS.FEED}?${searchParams.toString()}`,
    ),
  );
};

export const fetchPlaceRecommendations = async (limit?: number) => {
  const searchParams = new URLSearchParams();

  if (typeof limit === "number" && Number.isFinite(limit)) {
    searchParams.set("limit", String(Math.max(1, Math.min(12, limit))));
  }

  const suffix = searchParams.toString();
  return get<RecommendedPlacesPayload>(
    `${SOCIAL_CONTENT_ENDPOINTS.PLACE_RECOMMENDATIONS}${suffix ? `?${suffix}` : ""}`,
  );
};

export const createSocialPost = async (payload: {
  tripPlanId?: string;
  placeId?: string;
  title?: string;
  body?: string;
  visibility?: SocialPostVisibility;
  imageUrls?: string[];
  locationLabel?: string;
  locationLat?: number;
  locationLng?: number;
}) => postJson(SOCIAL_CONTENT_ENDPOINTS.CREATE_POST, payload);

export const createProviderPost = async (payload: {
  tripPlanId?: string;
  placeId?: string;
  title?: string;
  body?: string;
  visibility?: SocialPostVisibility;
  imageUrls?: string[];
  locationLabel?: string;
  locationLat?: number;
  locationLng?: number;
  eventId?: string;
}) => postJson(SOCIAL_CONTENT_ENDPOINTS.PROVIDER_CREATE_POST, payload);

export const updateSocialPost = async (
  postId: string,
  payload: {
    title?: string;
    body?: string;
    visibility?: SocialPostVisibility;
    imageUrls?: string[];
  },
) => patch(SOCIAL_CONTENT_ENDPOINTS.UPDATE_POST(postId), payload);

export const deleteSocialPost = async (postId: string) =>
  del<{ deleted: boolean }>(SOCIAL_CONTENT_ENDPOINTS.DELETE_POST(postId));

export const fetchSocialPost = async (postId: string) =>
  get<SocialPost>(SOCIAL_CONTENT_ENDPOINTS.POST(postId));

export const toggleSocialLike = async (postId: string) =>
  postJson<{ liked: boolean; likeCount: number }>(
    SOCIAL_CONTENT_ENDPOINTS.LIKE(postId),
    {},
  );

export const saveSocialPost = async (postId: string) =>
  postNoBody<{ saved: boolean; copiedTripPlanId?: string | null }>(
    SOCIAL_CONTENT_ENDPOINTS.SAVE(postId),
  );

export const unsaveSocialPost = async (postId: string) =>
  del<{ saved: boolean }>(SOCIAL_CONTENT_ENDPOINTS.SAVE(postId));

export const fetchPostComments = async (postId: string) =>
  normalizeList<{
    id: string;
    content: string;
    parentId?: string | null;
    createdAt: string;
  }>(
    await get<
      | Array<{
          id: string;
          content: string;
          parentId?: string | null;
          createdAt: string;
        }>
      | {
          data: Array<{
            id: string;
            content: string;
            parentId?: string | null;
            createdAt: string;
          }>;
        }
    >(SOCIAL_CONTENT_ENDPOINTS.COMMENTS(postId)),
  );

export const createPostComment = async (
  postId: string,
  payload: { content: string; parentId?: string },
) => postJson(SOCIAL_CONTENT_ENDPOINTS.COMMENTS(postId), payload);

export const reportSocialPost = async (postId: string, reason: string) =>
  postJson(SOCIAL_CONTENT_ENDPOINTS.REPORT(postId), { reason });

export const followUser = async (userId: string) =>
  patch<{ following: boolean }>(SOCIAL_GRAPH_ENDPOINTS.FOLLOW(userId), {});

export const unfollowUser = async (userId: string) =>
  patch<{ following: boolean }>(SOCIAL_GRAPH_ENDPOINTS.UNFOLLOW(userId), {});

export const blockUser = async (userId: string) =>
  patch<{ blocked: boolean }>(SOCIAL_GRAPH_ENDPOINTS.BLOCK(userId), {});

export const unblockUser = async (userId: string) =>
  patch<{ blocked: boolean }>(SOCIAL_GRAPH_ENDPOINTS.UNBLOCK(userId), {});

export const muteUser = async (userId: string) =>
  patch<{ muted: boolean }>(SOCIAL_GRAPH_ENDPOINTS.MUTE(userId), {});

export const unmuteUser = async (userId: string) =>
  patch<{ muted: boolean }>(SOCIAL_GRAPH_ENDPOINTS.UNMUTE(userId), {});

export const getSocialGraphState = async (userId: string) =>
  get<{
    targetUserId: string;
    following: boolean;
    blocked: boolean;
    muted: boolean;
    followersCount: number;
    followingCount: number;
  }>(SOCIAL_GRAPH_ENDPOINTS.STATE(userId));

export type FriendshipStateApi = {
  state: string;
  requesterId?: string;
  targetUserId?: string;
};

export const getFriendshipStateByUsername = async (username: string) =>
  get<FriendshipStateApi>(SOCIAL_GRAPH_ENDPOINTS.STATE_BY_USERNAME(username));

export const requestFriendship = async (username: string) =>
  postJson<{ status: string }>(SOCIAL_GRAPH_ENDPOINTS.FRIENDS_REQUEST, {
    username,
  });

export const acceptFriendship = async (requesterId: string) =>
  patch<{ status: string }>(
    SOCIAL_GRAPH_ENDPOINTS.FRIENDS_ACCEPT(requesterId),
    {},
  );

export const declineFriendship = async (requesterId: string) =>
  patch<{ status: string }>(
    SOCIAL_GRAPH_ENDPOINTS.FRIENDS_DECLINE(requesterId),
    {},
  );

export const removeFriendship = async (friendId: string) =>
  del<{ status: string }>(SOCIAL_GRAPH_ENDPOINTS.FRIEND_REMOVE(friendId));

export const fetchFriends = async () =>
  normalizeList<unknown>(await get(SOCIAL_GRAPH_ENDPOINTS.FRIENDS)).map(
    (row) => {
      const item = toRecord(row);
      return {
        userId: asString(item.userId ?? item.id ?? item.user_id),
        username: asString(item.username ?? item.userName ?? item.user_name),
        firstName: asString(
          item.firstName ??
            item.first_name ??
            item.firstname ??
            item.name ??
            "",
        ),
        lastName: asString(
          item.lastName ?? item.last_name ?? item.lastname ?? "",
        ),
        avatarUrl: asNullableString(
          pickAvatarField(item) ?? item.avatarUrl ?? item.avatar_url ?? item.avatar ?? null,
        ),
        role: asString(item.role ?? item.roleName ?? item.role_name ?? ""),
      } satisfies FriendSummary;
    },
  );

export const fetchIncomingFriendRequests = async () =>
  normalizeList<{
    requesterId: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    requestedAt: string;
  }>(await get(SOCIAL_GRAPH_ENDPOINTS.FRIENDS_INCOMING));

export const fetchUserPostsByUsername = async (username: string) =>
  normalizeList<SocialPost>(
    await get(SOCIAL_CONTENT_ENDPOINTS.USER_POSTS(username)),
  );

export const fetchProviderPostsBySlug = async (slug: string) =>
  normalizeList<SocialPost>(
    await get(SOCIAL_CONTENT_ENDPOINTS.PROVIDER_POSTS_BY_SLUG(slug)),
  );

export const fetchInbox = async () =>
  normalizeList<unknown>(await get(MESSAGING_ENDPOINTS.INBOX)).map(
    normalizeInboxItem,
  );

export const openAiConversation = async () =>
  postJson<OpenAiConversationResult>(
    MESSAGING_ENDPOINTS.AI_CONVERSATION,
    {},
  ).then((response) => {
    const payload = toRecord(response);
    const conversation = toRecord(payload.conversation);
    const rawFirstMessage =
      payload.firstMessage && typeof payload.firstMessage === "object"
        ? payload.firstMessage
        : null;

    return {
      conversation: {
        id: asString(conversation.id),
        title:
          typeof conversation.title === "string" || conversation.title === null
            ? (conversation.title as string | null)
            : null,
        isGroup: asBoolean(conversation.isGroup),
      },
      assistant:
        payload.assistant && typeof payload.assistant === "object"
          ? (payload.assistant as OpenAiConversationResult["assistant"])
          : null,
      firstMessage: rawFirstMessage
        ? normalizeMessageItem(rawFirstMessage, asString(conversation.id))
        : null,
    } satisfies OpenAiConversationResult;
  });

export const createConversation = async (payload: {
  participantIds: string[];
  firstMessage?: string;
  title?: string;
}) =>
  postJson<{
    conversation: {
      id: string;
      title: string | null;
      isGroup: boolean;
    };
    firstMessage: ConversationMessage | null;
  }>(MESSAGING_ENDPOINTS.CONVERSATIONS, payload).then((response) => {
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
            ? (conversation.title as string | null)
            : null,
        isGroup: asBoolean(conversation.isGroup),
      },
      firstMessage: rawFirstMessage
        ? normalizeMessageItem(rawFirstMessage)
        : null,
    };
  });

export const updateConversation = async (
  conversationId: string,
  payload: { title: string },
) => patch(MESSAGING_ENDPOINTS.UPDATE_CONVERSATION(conversationId), payload);

export const addConversationMembers = async (
  conversationId: string,
  payload: { userIds: string[] },
) => postJson(MESSAGING_ENDPOINTS.ADD_MEMBERS(conversationId), payload);

export const removeConversationMember = async (
  conversationId: string,
  userId: string,
) => del(MESSAGING_ENDPOINTS.REMOVE_MEMBER(conversationId, userId));

export const setConversationMemberRole = async (
  conversationId: string,
  userId: string,
  role: "MEMBER" | "ADMIN",
) =>
  patch(MESSAGING_ENDPOINTS.SET_MEMBER_ROLE(conversationId, userId), {
    role,
  });

export const leaveConversation = async (conversationId: string) =>
  del(MESSAGING_ENDPOINTS.LEAVE(conversationId));

export const fetchConversationMessages = async (conversationId: string) =>
  normalizeList<unknown>(
    await get(MESSAGING_ENDPOINTS.MESSAGES(conversationId)),
  ).map((row) => normalizeMessageItem(row, conversationId));

export const fetchGlobalMessages = async (params?: {
  limit?: number;
  before?: string;
}) => {
  const searchParams = new URLSearchParams();
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit));
  } else {
    searchParams.set("limit", "30");
  }
  if (params?.before) {
    searchParams.set("before", params.before);
  }

  const url = `${MESSAGING_ENDPOINTS.GLOBAL_MESSAGES}?${searchParams.toString()}`;
  return normalizeList<unknown>(await get(url)).map((row) =>
    normalizeMessageItem(row),
  );
};

export const sendMessage = async (
  conversationId: string,
  content: string,
  replyToMessageId: string | null = null,
  options: { skipAiReply?: boolean } = {},
) =>
  postJson(MESSAGING_ENDPOINTS.MESSAGES(conversationId), {
    content,
    ...(replyToMessageId ? { replyToMessageId } : {}),
    ...(options.skipAiReply ? { skipAiReply: true } : {}),
  }).then((payload) => normalizeMessageItem(payload, conversationId));

export const sendAiReply = async (
  conversationId: string,
  payload: AiReplyPayload,
) =>
  postJson(MESSAGING_ENDPOINTS.AI_REPLY(conversationId), payload).then((row) =>
    normalizeMessageItem(row, conversationId),
  );

export const markConversationRead = async (conversationId: string) =>
  patch(MESSAGING_ENDPOINTS.READ(conversationId), {});

export const updateMessageDeliveryStatus = async (
  messageId: string,
  deliveryStatus: 'sent' | 'delivered' | 'seen',
) =>
  patch<{ updated: boolean; deliveryStatus: string }>(
    MESSAGING_ENDPOINTS.DELIVERY_STATUS(messageId),
    { deliveryStatus },
  );

/** Prefer `path` (relative `/uploads/...`) so stored refs work on any API host. */
export const uploadImage = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; path: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  return postFormData<{ url: string; path: string }>(
    UPLOAD_ENDPOINTS.IMAGE,
    formData,
    {
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        onProgress(
          Math.min(100, Math.round((event.loaded * 100) / event.total)),
        );
      },
    },
  );
};

export const createStory = async (payload: {
  imageUrl: string;
  caption?: string;
}) => postJson(STORIES_ENDPOINTS.CREATE, payload).then(normalizeStoryItem);

export const updateStory = async (
  storyId: string,
  payload: { imageUrl?: string; caption?: string },
) => patch(STORIES_ENDPOINTS.UPDATE(storyId), payload).then(normalizeStoryItem);

export const deleteStory = async (storyId: string) =>
  del<{ deleted: boolean }>(STORIES_ENDPOINTS.DELETE(storyId));

export const fetchStoryFeed = async () =>
  normalizeList<unknown>(await get(STORIES_ENDPOINTS.FEED)).map(
    normalizeStoryItem,
  );

export const fetchStoryById = async (storyId: string) =>
  get(STORIES_ENDPOINTS.ONE(storyId)).then(normalizeStoryItem);

export const viewStory = async (storyId: string) =>
  postNoBody(STORIES_ENDPOINTS.VIEW(storyId));

export const fetchNotifications = async () =>
  normalizeList<{
    id: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>(
    await get<
      | Array<{
          id: string;
          message: string;
          isRead: boolean;
          createdAt: string;
        }>
      | {
          data: Array<{
            id: string;
            message: string;
            isRead: boolean;
            createdAt: string;
          }>;
        }
    >(NOTIFICATIONS_ENDPOINTS.LIST),
  );

export const markNotificationRead = async (id: string) =>
  patch(NOTIFICATIONS_ENDPOINTS.READ(id), {});

export const markAllNotificationsRead = async () =>
  patch(NOTIFICATIONS_ENDPOINTS.READ_ALL, {});
