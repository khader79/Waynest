import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import {
  acceptFriendship,
  declineFriendship,
  fetchUserPostsByUsername,
  getFriendshipStateByUsername,
  removeFriendship,
  requestFriendship,
  saveSocialPost,
  unsaveSocialPost,
  toggleSocialLike,
} from "@/api/social";
import {
  deleteSocialPost,
  updateSocialPost,
} from "@/services/social/social.service";
import { fetchPublicUserCard } from "@/api/public";
import { useAuth } from "@/context/AuthContext";
import { PostCard, ProfilePostComposer } from "@/components/social";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import "./SocialFeed.css";
import "./UserSocialProfile.css";

export default function UserSocialProfile() {
  const { t } = useTranslation();
  const { username = "" } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [card, setCard] = useState(null);
  const [friend, setFriend] = useState(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [friendsCount, setFriendsCount] = useState(null);

  const decodedUsername = useMemo(
    () => decodeURIComponent(username),
    [username],
  );

  const isOwnProfile = useMemo(() => {
    if (!isAuthenticated || !user?.username || !decodedUsername.trim())
      return false;
    return user.username.toLowerCase() === decodedUsername.trim().toLowerCase();
  }, [isAuthenticated, user?.username, decodedUsername]);

  const load = useCallback(async () => {
    if (!decodedUsername.trim()) {
      return;
    }
    try {
      const [publicCard, userPosts] = await Promise.all([
        fetchPublicUserCard(decodedUsername),
        fetchUserPostsByUsername(decodedUsername),
      ]);
      setCard(publicCard);
      setPosts(Array.isArray(userPosts) ? userPosts : []);

      const actualFriendsCount =
        typeof publicCard?.friendsCount === "number"
          ? publicCard.friendsCount
          : 0;
      setFriendsCount(actualFriendsCount);

      if (isAuthenticated && user?.id) {
        const fs = await getFriendshipStateByUsername(decodedUsername);
        setFriend(fs);
      } else {
        setFriend(null);
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.userProfile.loadFailed", {
            defaultValue: "Failed to load profile",
          }),
        ),
      );
    }
  }, [decodedUsername, isAuthenticated, user?.id, t]);

  useEffect(() => {
    void load();
  }, [decodedUsername, isAuthenticated, user?.id, load]);

  const targetUserId = friend?.targetUserId;

  const displayName = card
    ? `${card.firstName} ${card.lastName}`.trim() || card.username
    : decodedUsername ||
      t("social.userProfile.title", { defaultValue: "User Profile" });

  const profileUsername = card?.username ?? decodedUsername;
  const providerPageTo = card?.providerSlug
    ? `/p/${encodeURIComponent(card.providerSlug)}`
    : null;

  const initial =
    (card?.username || decodedUsername || "?").trim().charAt(0).toUpperCase() ||
    "?";

  const cardAvatarSrc = getResolvedAvatarUrl(card);

  const friendsTo = profileUsername
    ? isOwnProfile
      ? "/profile/friends"
      : `/u/${encodeURIComponent(profileUsername)}/friends`
    : null;

  const displayFriendsCount =
    friendsCount !== null
      ? friendsCount
      : typeof card?.friendsCount === "number"
        ? card.friendsCount
        : 0;

  const handleDeletePost = async (postId) => {
    const previousPosts = posts;
    setPosts((current) => current.filter((post) => post.id !== postId));
    try {
      await deleteSocialPost(postId);
      toast.success(
        t("social.profile.postDeleted", { defaultValue: "Post deleted" }),
      );
    } catch (error) {
      setPosts(previousPosts);
      toast.error(getApiErrorMessage(error, "Delete failed"));
    }
  };

  const handleUpdatePost = async (postId, payload) => {
    const previousPosts = posts;
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              title:
                typeof payload.title === "string" ? payload.title : post.title,
              body: typeof payload.body === "string" ? payload.body : post.body,
            }
          : post,
      ),
    );
    try {
      await updateSocialPost(postId, payload);
      toast.success(
        t("social.profile.postUpdated", { defaultValue: "Post updated" }),
      );
    } catch (error) {
      setPosts(previousPosts);
      toast.error(getApiErrorMessage(error, "Update failed"));
    }
  };

  const optimisticFriendUpdate = (
    nextState,
    nextRequesterId = friend?.requesterId ?? null,
  ) => {
    setFriend((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        state: nextState,
        requesterId: nextRequesterId,
      };
    });
  };

  const handleAcceptFriend = async () => {
    const requesterId = friend?.requesterId ?? "";
    if (!requesterId || friendActionLoading) return;

    setFriendActionLoading(true);
    optimisticFriendUpdate("ACCEPTED", requesterId);
    try {
      await acceptFriendship(requesterId);
      setFriendsCount((prev) => (prev !== null ? prev + 1 : prev));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Accept failed"));
      await load();
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleDeclineFriend = async () => {
    const requesterId = friend?.requesterId ?? "";
    if (!requesterId || friendActionLoading) return;

    setFriendActionLoading(true);
    optimisticFriendUpdate("DECLINED", requesterId);
    try {
      await declineFriendship(requesterId);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Decline failed"));
      await load();
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    const friendId = targetUserId ?? "";
    if (!friendId || friendActionLoading) return;

    setFriendActionLoading(true);
    try {
      await removeFriendship(friendId);
      await load();
      toast.success(t("friends.removed", { defaultValue: "Friend removed" }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Remove failed"));
      await load();
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleRequestFriend = async () => {
    if (!decodedUsername || friendActionLoading) return;

    setFriendActionLoading(true);
    optimisticFriendUpdate(
      "PENDING_OUTGOING",
      user?.id ?? friend?.requesterId ?? null,
    );
    try {
      await requestFriendship(decodedUsername);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Request failed"));
      await load();
    } finally {
      setFriendActionLoading(false);
    }
  };

  return (
    <section className="social-feed-page user-public-profile">
      <div className="user-public__shell">
        <div className="user-public__cover" aria-hidden />
        <div className="user-public__sheet">
          <div className="user-public__identity">
            <div className="user-public__avatarCol">
              <div className="user-public__avatarShell">
                <div className="user-public__avatar" aria-hidden="true">
                  {cardAvatarSrc ? (
                    <img
                      src={cardAvatarSrc}
                      alt=""
                      className="user-public__avatarImg"
                      onError={handleAvatarImageError}
                    />
                  ) : (
                    <span className="user-public__avatarInitial">
                      {initial}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="user-public__main">
              <p className="user-public__eyebrow">
                {t("social.userProfile.eyebrow", {
                  defaultValue: "Traveler profile",
                })}
              </p>
              <h1 className="user-public__name">{displayName}</h1>
              {profileUsername ? (
                <p className="user-public__handle">@{profileUsername}</p>
              ) : null}
              <div className="user-public__metaLine">
                <span className="user-public__metaPill">
                  {t("social.userProfile.personalProfile", {
                    defaultValue: "Personal profile",
                  })}
                </span>
                {providerPageTo ? (
                  <>
                    <span className="user-public__metaDot" aria-hidden>
                      ·
                    </span>
                    <Link to={providerPageTo} className="user-public__metaLink">
                      {t("social.userProfile.viewBusinessPage", {
                        defaultValue: "View business page",
                      })}
                    </Link>
                  </>
                ) : null}
              </div>

              <div className="user-public__stats" role="list">
                {friendsTo ? (
                  <Link
                    to={friendsTo}
                    className="user-public__statLink"
                    role="listitem">
                    <strong>{displayFriendsCount}</strong>
                    <span>
                      {t("social.userProfile.friendsLabel", {
                        defaultValue: "friends",
                      })}
                    </span>
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="user-public__actions">
              {isOwnProfile ? (
                <Link
                  to="/profile"
                  className="user-public__btn user-public__btn--secondary">
                  {t("social.userProfile.accountSettings", {
                    defaultValue: "Account settings",
                  })}
                </Link>
              ) : null}
              {!isOwnProfile && !isAuthenticated ? (
                <Link to="/login" className="user-public__btn user-public__btn--primary">
                  {t("friends.add", { defaultValue: "Add friend" })}
                </Link>
              ) : null}
              {targetUserId &&
              !isOwnProfile &&
              isAuthenticated &&
              user?.id &&
              user.id !== targetUserId ? (
                <div className="user-public__actionChips">
                  {friend?.state === "ACCEPTED" ? (
                    <>
                      <span className="user-public__badge">
                        {t("friends.connected", {
                          defaultValue: "Friends",
                        })}
                      </span>
                      <Link
                        to="/social"
                        className="user-public__btn user-public__btn--ghost">
                        {t("social.userProfile.message", {
                          defaultValue: "Message",
                        })}
                      </Link>
                      <button
                        type="button"
                        className="user-public__btn user-public__btn--danger"
                        disabled={friendActionLoading}
                        onClick={handleRemoveFriend}>
                        {t("friends.remove", {
                          defaultValue: "Remove friend",
                        })}
                      </button>
                    </>
                  ) : null}
                  {friend?.state === "PENDING_OUTGOING" ? (
                    <span className="user-public__badge user-public__badge--muted">
                      {t("friends.requestSent", {
                        defaultValue: "Request sent",
                      })}
                    </span>
                  ) : null}
                  {friend?.state === "PENDING_INCOMING" ? (
                    <>
                      <button
                        type="button"
                        className="user-public__btn user-public__btn--primary"
                        disabled={friendActionLoading}
                        onClick={handleAcceptFriend}>
                        {t("friends.accept", { defaultValue: "Accept" })}
                      </button>
                      <button
                        type="button"
                        className="user-public__btn user-public__btn--ghost"
                        disabled={friendActionLoading}
                        onClick={handleDeclineFriend}>
                        {t("friends.decline", { defaultValue: "Decline" })}
                      </button>
                    </>
                  ) : null}
                  {friend?.state === "NONE" || friend?.state === "DECLINED" ? (
                    <button
                      type="button"
                      className="user-public__btn user-public__btn--primary"
                      disabled={friendActionLoading}
                      onClick={handleRequestFriend}>
                      {t("friends.add", { defaultValue: "Add friend" })}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && isAuthenticated ? (
        <div className="user-public__composer">
          <h2 className="user-public__composerTitle">
            {t("social.userProfile.publishSection", {
              defaultValue: "Share a trip to your feed",
            })}
          </h2>
          <ProfilePostComposer onPublished={() => void load()} />
        </div>
      ) : null}

      <div className="user-public__postsBlock">
        <h2 className="user-public__postsHeading">
          {t("social.userProfile.postsHeading", { defaultValue: "Posts" })}
        </h2>
        <div className="user-public__postList social-feed-list">
          {posts.length === 0 ? (
            <div className="user-public__empty">
              <p className="user-public__emptyTitle">
                {t("social.userProfile.noPosts", {
                  defaultValue: "No posts yet",
                })}
              </p>
              <p className="user-public__emptyHint">
                {t("social.userProfile.noPostsHint", {
                  defaultValue:
                    "When this traveler shares a trip, it will show up here.",
                })}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isAuthenticated={isAuthenticated}
                toggleSocialLike={toggleSocialLike}
                saveSocialPost={saveSocialPost}
                unsaveSocialPost={unsaveSocialPost}
                actorId={user?.id}
                onDeletePost={handleDeletePost}
                onUpdatePost={handleUpdatePost}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
