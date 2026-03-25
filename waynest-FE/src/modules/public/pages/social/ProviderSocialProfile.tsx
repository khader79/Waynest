import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  fetchProviderPostsBySlug,
  followUser,
  getSocialGraphState,
  unfollowUser,
  type SocialPost,
} from "@/services/social/social.service";
import { fetchPublicProviderBySlug } from "@/services/public/publicDirectory.service";
import { useAuth } from "@/core/providers/AuthContext";
import "./SocialFeed.css";

const ProviderSocialProfile = () => {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [title, setTitle] = useState("");
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [graph, setGraph] = useState<{
    following: boolean;
    followersCount: number;
    followingCount: number;
  } | null>(null);

  const decodedSlug = useMemo(() => decodeURIComponent(slug), [slug]);

  useEffect(() => {
    const load = async () => {
      if (!decodedSlug.trim()) {
        return;
      }
      try {
        const provider = await fetchPublicProviderBySlug(decodedSlug);
        setTitle(provider.displayName);
        setOwnerUserId(provider.ownerUserId ?? null);

        const userPosts = await fetchProviderPostsBySlug(decodedSlug);
        setPosts(Array.isArray(userPosts) ? userPosts : []);

        if (
          isAuthenticated &&
          user?.userId &&
          provider.ownerUserId &&
          provider.ownerUserId !== user.userId
        ) {
          const state = await getSocialGraphState(provider.ownerUserId);
          setGraph({
            followersCount: state.followersCount,
            following: state.following,
            followingCount: state.followingCount,
          });
        } else {
          setGraph(null);
        }
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            t("social.providerProfile.loadFailed", {
              defaultValue: "Failed to load provider profile",
            }),
          ),
        );
      }
    };
    void load();
  }, [decodedSlug, isAuthenticated, user?.userId, t]);

  return (
    <section className="social-feed-page">
      <div className="social-feed-header social-provider-header">
        <div className="social-provider-header__left">
          <h1>
            {title || t("social.providerProfile.title", { defaultValue: "Provider Profile" })}
          </h1>

          {graph ? (
            <div className="social-provider-stats">
              <div className="social-provider-stat">
                <strong>{graph.followersCount}</strong>
                <span>{t("social.providerProfile.followers", { defaultValue: "Followers" })}</span>
              </div>
              <div className="social-provider-stat">
                <strong>{graph.followingCount}</strong>
                <span>{t("social.providerProfile.following", { defaultValue: "Following" })}</span>
              </div>
            </div>
          ) : null}
        </div>

        {graph && ownerUserId ? (
          <div className="social-provider-actions">
            <button
              type="button"
              className="social-feed-header__btn"
              onClick={async () => {
                try {
                  if (graph.following) {
                    await unfollowUser(ownerUserId);
                  } else {
                    await followUser(ownerUserId);
                  }
                  const state = await getSocialGraphState(ownerUserId);
                  setGraph({
                    followersCount: state.followersCount,
                    following: state.following,
                    followingCount: state.followingCount,
                  });
                } catch (error) {
                  toast.error(
                    getApiErrorMessage(
                      error,
                      t("social.providerProfile.followUpdateFailed", {
                        defaultValue: "Failed to update follow state",
                      }),
                    ),
                  );
                }
              }}>
              {graph.following
                ? t("social.unfollow", { defaultValue: "Unfollow" })
                : t("social.follow", { defaultValue: "Follow" })}
            </button>
          </div>
        ) : null}
      </div>

      <h2 className="social-provider-section-title">
        {t("social.providerProfile.latest", { defaultValue: "Latest Posts" })}
      </h2>

      <div className="social-feed-list">
        {posts.length === 0 ? (
          <p>{t("social.providerProfile.noPosts", { defaultValue: "No posts yet." })}</p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="social-feed-card">
              <h3>{post.title ?? "Post"}</h3>
              <p className="social-feed-card__meta">{post.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

export default ProviderSocialProfile;
