import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import {
  acceptFriendship,
  declineFriendship,
  fetchUserPostsByUsername,
  followUser,
  getFriendshipStateByUsername,
  getSocialGraphState,
  requestFriendship,
  saveSocialPost,
  unsaveSocialPost,
  toggleSocialLike,
  unfollowUser,
} from "@/api/social";
import { deleteSocialPost, updateSocialPost } from "@/services/social/social.service";
import { fetchPublicUserCard } from "@/api/public";
import { useAuth } from "@/context/AuthContext";
import { PostCard, ProfilePostComposer } from "@/components/social";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./SocialFeed.css";
import "./UserSocialProfile.css";

const UserSocialProfile = () => {
  const { t } = useTranslation();
  const { username = "" } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [card, setCard] = useState(null);
  const [graph, setGraph] = useState(null);
  const [friend, setFriend] = useState(null);

  const decodedUsername = useMemo(() => decodeURIComponent(username), [username]);

  const isOwnProfile = useMemo(() => {
    if (!isAuthenticated || !user?.username || !decodedUsername.trim()) return false;
    return user.username.toLowerCase() === decodedUsername.trim().toLowerCase();
  }, [isAuthenticated, user?.username, decodedUsername]);

  const load = async () => {
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

      if (isAuthenticated && user?.id) {
        const fs = await getFriendshipStateByUsername(decodedUsername);
        setFriend(fs);

        const tid = fs.targetUserId;
        if (tid && tid !== user.id) {
          const state = await getSocialGraphState(tid);
          setGraph({
            followersCount: state.followersCount,
            following: state.following,
            followingCount: state.followingCount,
          });
        } else {
          setGraph(null);
        }
      } else {
        setGraph(null);
        setFriend(null);
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.userProfile.loadFailed", { defaultValue: "Failed to load profile" }),
        ),
      );
    }
  };

  useEffect(() => {
    void load();
  }, [decodedUsername, isAuthenticated, user?.id]);

  const targetUserId = friend?.targetUserId;

  const displayName = card
    ? `${card.firstName} ${card.lastName}`.trim() || card.username
    : t("social.userProfile.title", { defaultValue: "User Profile" });

  const initial = (card?.username || decodedUsername || "?").trim().charAt(0).toUpperCase() || "?";

  const handleDeletePost = async (postId) => {
    try {
      await deleteSocialPost(postId);
      toast.success(t("social.profile.postDeleted", { defaultValue: "Post deleted" }));
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Delete failed"));
    }
  };

  const handleUpdatePost = async (postId, payload) => {
    try {
      await updateSocialPost(postId, payload);
      toast.success(t("social.profile.postUpdated", { defaultValue: "Post updated" }));
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Update failed"));
    }
  };

  return (
    <section className="social-feed-page user-social-profile">
      <header className="user-profile-hero">
        <div className="user-profile-hero__avatar" aria-hidden="true">
          {card?.avatarUrl ? (
            <img src={resolveMediaUrl(card.avatarUrl)} alt="" className="user-profile-hero__avatarImg" />
          ) : (
            initial
          )}
        </div>
        <div className="user-profile-hero__main">
          <p className="user-profile-hero__eyebrow">
            {t("social.userProfile.eyebrow", { defaultValue: "Traveler profile" })}
          </p>
          <h1 className="user-profile-hero__title">{displayName}</h1>
          {card?.username ? (
            <p className="user-profile-hero__handle">@{card.username}</p>
          ) : null}
          {graph && !isOwnProfile ? (
            <p className="user-profile-hero__stats">
              {t("social.userProfile.stats", {
                defaultValue: "{{followers}} followers · {{following}} following",
                followers: graph.followersCount ?? 0,
                following: graph.followingCount ?? 0,
              })}
            </p>
          ) : null}
        </div>

        <div className="user-profile-hero__actions">
          {isOwnProfile ? (
            <Link to="/profile" className="user-profile-hero__btn user-profile-hero__btn--secondary">
              {t("social.userProfile.accountSettings", { defaultValue: "Account settings" })}
            </Link>
          ) : null}
          {isAuthenticated && user?.id && targetUserId && user.id !== targetUserId ? (
            <div className="user-profile-hero__chips">
              {friend?.state === "ACCEPTED" ? (
                <span className="social-feed-meta">{t("friends.connected", { defaultValue: "Friends" })}</span>
              ) : null}
              {friend?.state === "PENDING_OUTGOING" ? (
                <span className="social-feed-meta">{t("friends.requestSent", { defaultValue: "Request sent" })}</span>
              ) : null}
              {friend?.state === "PENDING_INCOMING" ? (
                <>
                  <button
                    type="button"
                    className="user-profile-hero__btn"
                    onClick={async () => {
                      try {
                        await acceptFriendship(friend.requesterId ?? "");
                        await load();
                      } catch (error) {
                        toast.error(getApiErrorMessage(error, "Accept failed"));
                      }
                    }}
                  >
                    {t("friends.accept", { defaultValue: "Accept" })}
                  </button>
                  <button
                    type="button"
                    className="user-profile-hero__btn user-profile-hero__btn--ghost"
                    onClick={async () => {
                      try {
                        await declineFriendship(friend.requesterId ?? "");
                        await load();
                      } catch (error) {
                        toast.error(getApiErrorMessage(error, "Decline failed"));
                      }
                    }}
                  >
                    {t("friends.decline", { defaultValue: "Decline" })}
                  </button>
                </>
              ) : null}
              {friend?.state === "NONE" || friend?.state === "DECLINED" ? (
                <button
                  type="button"
                  className="user-profile-hero__btn"
                  onClick={async () => {
                    try {
                      await requestFriendship(decodedUsername);
                      await load();
                    } catch (error) {
                      toast.error(getApiErrorMessage(error, "Request failed"));
                    }
                  }}
                >
                  {t("friends.add", { defaultValue: "Add friend" })}
                </button>
              ) : null}
              {graph ? (
                <button
                  type="button"
                  className="user-profile-hero__btn user-profile-hero__btn--ghost"
                  onClick={async () => {
                    try {
                      if (graph.following) {
                        await unfollowUser(targetUserId);
                      } else {
                        await followUser(targetUserId);
                      }
                      await load();
                    } catch (error) {
                      toast.error(
                        getApiErrorMessage(
                          error,
                          t("social.userProfile.followUpdateFailed", {
                            defaultValue: "Failed to update follow state",
                          }),
                        ),
                      );
                    }
                  }}
                >
                  {graph.following
                    ? t("social.unfollow", { defaultValue: "Unfollow" })
                    : t("social.follow", { defaultValue: "Follow" })}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {isOwnProfile && isAuthenticated ? (
        <div className="user-profile-composerWrap">
          <h2 className="user-profile-sectionTitle">
            {t("social.userProfile.publishSection", { defaultValue: "Share a trip to your feed" })}
          </h2>
          <ProfilePostComposer onPublished={() => void load()} />
        </div>
      ) : null}

      <h2 className="user-profile-sectionTitle user-profile-sectionTitle--posts">
        {t("social.userProfile.postsHeading", { defaultValue: "Posts" })}
      </h2>
      <div className="social-feed-list user-profile-posts">
        {posts.length === 0 ? (
          <p className="user-profile-empty">
            {t("social.userProfile.noPosts", { defaultValue: "No posts yet." })}
          </p>
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
    </section>
  );
};

export default UserSocialProfile;
