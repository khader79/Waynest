import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  fetchSocialFeed,
  followUser,
  getSocialGraphState,
  unfollowUser,
  type SocialPost,
} from "@/services/social/social.service";
import { useAuth } from "@/core/providers/AuthContext";
import "./SocialFeed.css";

const UserSocialProfile = () => {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [feed, setFeed] = useState<SocialPost[]>([]);
  const [graph, setGraph] = useState<{
    following: boolean;
    followersCount: number;
    followingCount: number;
  } | null>(null);

  const load = async () => {
    try {
      const posts = await fetchSocialFeed("for-you");
      setFeed(Array.isArray(posts) ? posts : []);
      if (isAuthenticated && user?.userId !== id) {
        const state = await getSocialGraphState(id);
        setGraph(state);
      } else {
        setGraph(null);
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
  }, [id, isAuthenticated, user?.userId]);

  const userPosts = useMemo(
    () => feed.filter((post) => post.authorId === id),
    [feed, id],
  );

  return (
    <section className="social-feed-page">
      <div className="social-feed-header">
        <h1>{t("social.userProfile.title", { defaultValue: "User Profile" })}</h1>
        {graph ? (
          <button
            type="button"
            onClick={async () => {
              try {
                if (graph.following) {
                  await unfollowUser(id);
                } else {
                  await followUser(id);
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
            }}>
            {graph.following
              ? t("social.userProfile.unfollow", { defaultValue: "Unfollow" })
              : t("social.userProfile.follow", { defaultValue: "Follow" })}
          </button>
        ) : null}
      </div>
      {graph ? (
        <p className="social-empty">
          {t("social.userProfile.counts", {
            defaultValue: "Followers: {{followers}} | Following: {{following}}",
            followers: graph.followersCount,
            following: graph.followingCount,
          })}
        </p>
      ) : null}
      <div className="social-post-list">
        {userPosts.map((post) => (
          <article key={post.id} className="social-post-card">
            <h3>{post.title || t("social.userProfile.postFallback", { defaultValue: "Post" })}</h3>
            <p>{post.body}</p>
          </article>
        ))}
        {userPosts.length === 0 ? (
          <p className="social-empty">
            {t("social.userProfile.empty", { defaultValue: "No posts yet." })}
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default UserSocialProfile;

