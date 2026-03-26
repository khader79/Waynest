import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  acceptFriendship,
  declineFriendship,
  fetchUserPostsByUsername,
  followUser,
  getFriendshipStateByUsername,
  getSocialGraphState,
  requestFriendship,
  unfollowUser } from


"@/features/social/api";
import { fetchPublicUserCard } from "@/modules/public/api/directory";
import { useAuth } from "@/core/providers/AuthContext";
import "./SocialFeed.css";

const UserSocialProfile = () => {
  const { t } = useTranslation();
  const { username = "" } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [card, setCard] = useState(
    null
  );
  const [graph, setGraph] = useState(



    null);
  const [friend, setFriend] = useState(null);

  const decodedUsername = useMemo(() => decodeURIComponent(username), [username]);

  const load = async () => {
    if (!decodedUsername.trim()) {
      return;
    }
    try {
      const [publicCard, userPosts] = await Promise.all([
      fetchPublicUserCard(decodedUsername),
      fetchUserPostsByUsername(decodedUsername)]
      );
      setCard(publicCard);
      setPosts(Array.isArray(userPosts) ? userPosts : []);

      if (isAuthenticated && user?.userId) {
        const fs = await getFriendshipStateByUsername(decodedUsername);
        setFriend(fs);

        const tid = fs.targetUserId;
        if (tid && tid !== user.userId) {
          const state = await getSocialGraphState(tid);
          setGraph({
            followersCount: state.followersCount,
            following: state.following,
            followingCount: state.followingCount
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
          t("social.userProfile.loadFailed", { defaultValue: "Failed to load profile" })
        )
      );
    }
  };

  useEffect(() => {
    void load();
  }, [decodedUsername, isAuthenticated, user?.userId]);

  const targetUserId = friend?.targetUserId;

  return (
    <section className="social-feed-page">
      <div className="social-feed-header">
        <h1>
          {card ?
          `${card.firstName} ${card.lastName} (@${card.username})` :
          t("social.userProfile.title", { defaultValue: "User Profile" })}
        </h1>
        {isAuthenticated && user?.userId && targetUserId && user.userId !== targetUserId ?
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {friend?.state === "ACCEPTED" ?
          <span className="social-feed-meta">
                {t("friends.connected", { defaultValue: "Friends" })}
              </span> :
          null}
            {friend?.state === "PENDING_OUTGOING" ?
          <span className="social-feed-meta">
                {t("friends.requestSent", { defaultValue: "Request sent" })}
              </span> :
          null}
            {friend?.state === "PENDING_INCOMING" ?
          <>
                <button
              type="button"
              className="social-feed-header__btn"
              onClick={async () => {
                try {
                  await acceptFriendship(friend.requesterId ?? "");
                  await load();
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "Accept failed"));
                }
              }}>
                  {t("friends.accept", { defaultValue: "Accept" })}
                </button>
                <button
              type="button"
              className="social-feed-header__btn"
              onClick={async () => {
                try {
                  await declineFriendship(friend.requesterId ?? "");
                  await load();
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "Decline failed"));
                }
              }}>
                  {t("friends.decline", { defaultValue: "Decline" })}
                </button>
              </> :
          null}
            {friend?.state === "NONE" || friend?.state === "DECLINED" ?
          <button
            type="button"
            className="social-feed-header__btn"
            onClick={async () => {
              try {
                await requestFriendship(decodedUsername);
                await load();
              } catch (error) {
                toast.error(getApiErrorMessage(error, "Request failed"));
              }
            }}>
                {t("friends.add", { defaultValue: "Add friend" })}
              </button> :
          null}
            {graph ?
          <button
            type="button"
            className="social-feed-header__btn"
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
                      defaultValue: "Failed to update follow state"
                    })
                  )
                );
              }
            }}>
                {graph.following ?
            t("social.unfollow", { defaultValue: "Unfollow" }) :
            t("social.follow", { defaultValue: "Follow" })}
              </button> :
          null}
          </div> :
        null}
      </div>
      <div className="social-feed-list">
        {posts.length === 0 ?
        <p>{t("social.userProfile.noPosts", { defaultValue: "No posts yet." })}</p> :

        posts.map((post) =>
        <article key={post.id} className="social-feed-card">
              <h3>{post.title ?? post.shareSlug ?? "Post"}</h3>
              <p className="social-feed-card__meta">{post.body}</p>
            </article>
        )
        }
      </div>
    </section>);

};

export default UserSocialProfile;