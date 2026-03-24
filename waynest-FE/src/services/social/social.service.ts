import { del, get, patch, postJson } from "@/services/http/apiService";
import {
  MESSAGING_ENDPOINTS,
  NOTIFICATIONS_ENDPOINTS,
  SOCIAL_CONTENT_ENDPOINTS,
  SOCIAL_GRAPH_ENDPOINTS,
} from "@/services/http/endpoints";

export type SocialPostVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export type SocialPost = {
  id: string;
  authorId: string;
  providerId?: string | null;
  provider?: { id: string; displayName?: string };
  title?: string | null;
  body?: string | null;
  shareSlug?: string | null;
  visibility: SocialPostVisibility;
  createdAt: string;
  author?: { id: string; username?: string; avatarUrl?: string };
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

const normalizeInboxItem = (row: unknown) => {
  const item = toRecord(row);
  return {
    id: String(item.id ?? ""),
    title:
      typeof item.title === "string" || item.title === null
        ? (item.title as string | null)
        : null,
    unreadCount:
      typeof item.unreadCount === "number"
        ? item.unreadCount
        : typeof item.unread_count === "number"
          ? (item.unread_count as number)
          : 0,
  };
};

const normalizeMessageItem = (row: unknown) => {
  const item = toRecord(row);
  return {
    id: String(item.id ?? ""),
    content: typeof item.content === "string" ? item.content : "",
    senderId:
      typeof item.senderId === "string"
        ? item.senderId
        : typeof item.sender_id === "string"
          ? (item.sender_id as string)
          : "",
    createdAt:
      typeof item.createdAt === "string"
        ? item.createdAt
        : typeof item.created_at === "string"
          ? (item.created_at as string)
          : new Date().toISOString(),
  };
};

export const fetchSocialFeed = async (
  filter: "for-you" | "following" | "providers" = "for-you",
) =>
  normalizeList<SocialPost>(
    await get<SocialPost[] | { data: SocialPost[] }>(
      `${SOCIAL_CONTENT_ENDPOINTS.FEED}?filter=${filter}`,
    ),
  );

export const createSocialPost = async (payload: {
  tripPlanId?: string;
  title?: string;
  body?: string;
  visibility?: SocialPostVisibility;
}) => postJson(SOCIAL_CONTENT_ENDPOINTS.CREATE_POST, payload);

export const fetchSocialPost = async (postId: string) =>
  get<SocialPost>(SOCIAL_CONTENT_ENDPOINTS.POST(postId));

export const toggleSocialLike = async (postId: string) =>
  postJson<{ liked: boolean }>(SOCIAL_CONTENT_ENDPOINTS.LIKE(postId), {});

export const saveSocialPost = async (postId: string) =>
  postJson<{ saved: boolean; copiedTripPlanId?: string | null }>(
    SOCIAL_CONTENT_ENDPOINTS.SAVE(postId),
    {},
  );

export const unsaveSocialPost = async (postId: string) =>
  del<{ saved: boolean }>(SOCIAL_CONTENT_ENDPOINTS.SAVE(postId));

export const fetchPostComments = async (postId: string) =>
  normalizeList<{ id: string; content: string; parentId?: string | null; createdAt: string }>(
    await get<
      | Array<{ id: string; content: string; parentId?: string | null; createdAt: string }>
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

/** Friendship + target id for API calls (URLs stay username/slug only). */
export const getFriendshipStateByUsername = async (username: string) =>
  get<FriendshipStateApi>(SOCIAL_GRAPH_ENDPOINTS.STATE_BY_USERNAME(username));

export const requestFriendship = async (username: string) =>
  postJson<{ status: string }>(SOCIAL_GRAPH_ENDPOINTS.FRIENDS_REQUEST, { username });

export const acceptFriendship = async (requesterId: string) =>
  patch<{ status: string }>(SOCIAL_GRAPH_ENDPOINTS.FRIENDS_ACCEPT(requesterId), {});

export const declineFriendship = async (requesterId: string) =>
  patch<{ status: string }>(SOCIAL_GRAPH_ENDPOINTS.FRIENDS_DECLINE(requesterId), {});

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
  normalizeList<SocialPost>(await get(SOCIAL_CONTENT_ENDPOINTS.USER_POSTS(username)));

export const fetchProviderPostsBySlug = async (slug: string) =>
  normalizeList<SocialPost>(await get(SOCIAL_CONTENT_ENDPOINTS.PROVIDER_POSTS_BY_SLUG(slug)));

export const fetchInbox = async () =>
  normalizeList<unknown>(await get(MESSAGING_ENDPOINTS.INBOX)).map(normalizeInboxItem);

export const createConversation = async (payload: {
  participantIds: string[];
  firstMessage: string;
}) => postJson(MESSAGING_ENDPOINTS.CONVERSATIONS, payload);

export const fetchConversationMessages = async (conversationId: string) =>
  normalizeList<unknown>(await get(MESSAGING_ENDPOINTS.MESSAGES(conversationId))).map(
    normalizeMessageItem,
  );

export const sendMessage = async (conversationId: string, content: string) =>
  postJson(MESSAGING_ENDPOINTS.MESSAGES(conversationId), { content });

export const markConversationRead = async (conversationId: string) =>
  patch(MESSAGING_ENDPOINTS.READ(conversationId), {});

export const fetchNotifications = async () =>
  normalizeList<{ id: string; message: string; isRead: boolean; createdAt: string }>(
    await get<
      Array<{ id: string; message: string; isRead: boolean; createdAt: string }>
      | { data: Array<{ id: string; message: string; isRead: boolean; createdAt: string }> }
    >(NOTIFICATIONS_ENDPOINTS.LIST),
  );

export const markNotificationRead = async (id: string) =>
  patch(NOTIFICATIONS_ENDPOINTS.READ(id), {});

export const markAllNotificationsRead = async () =>
  patch(NOTIFICATIONS_ENDPOINTS.READ_ALL, {});

