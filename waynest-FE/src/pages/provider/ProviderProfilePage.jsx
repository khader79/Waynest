import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import {
  fetchProviderPostsBySlug,
  followUser,
  getSocialGraphState,
  unfollowUser,
} from "@/api/social";
import { useAuth } from "@/context/AuthContext";
import { useProviderProfile } from "@/context/ProviderContext";
import ProviderHeader from "@/components/provider/ProviderHeader";
import ProviderTabs from "@/components/provider/ProviderTabs";
import "@/pages/provider/provider-business.css";
import "@/pages/social/SocialFeed.css";

const ProviderProfilePage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { slug, profile, profileLoading, error } = useProviderProfile();
  const [posts, setPosts] = useState([]);
  const [graph, setGraph] = useState(null);

  const ownerUserId = profile?.ownerUserId ?? null;
  const title = profile?.displayName ?? "";
  const cityLabel = profile?.city?.name ?? null;

  useEffect(() => {
    if (!slug?.trim()) {
      return;
    }
    const run = async () => {
      try {
        const userPosts = await fetchProviderPostsBySlug(slug);
        setPosts(Array.isArray(userPosts) ? userPosts : []);
      } catch {
        setPosts([]);
      }
    };
    void run();
  }, [slug]);

  useEffect(() => {
    const loadGraph = async () => {
      if (
        !isAuthenticated ||
        !user?.id ||
        !ownerUserId ||
        ownerUserId === user.id
      ) {
        setGraph(null);
        return;
      }
      try {
        const state = await getSocialGraphState(ownerUserId);
        setGraph({
          followersCount: state.followersCount,
          following: state.following,
          followingCount: state.followingCount,
        });
      } catch {
        setGraph(null);
      }
    };
    void loadGraph();
  }, [isAuthenticated, user?.id, ownerUserId]);

  const handleFollow = async () => {
    if (!ownerUserId || !graph) {
      return;
    }
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
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("social.providerProfile.followUpdateFailed", {
            defaultValue: "Failed to update follow state",
          }),
        ),
      );
    }
  };

  useEffect(() => {
    if (error && slug) {
      toast.error(
        getApiErrorMessage(
          new Error(error),
          t("social.providerProfile.loadFailed", {
            defaultValue: "Failed to load provider profile",
          }),
        ),
      );
    }
  }, [error, slug, t]);

  return (
    <section className="social-feed-page provider-business">
      <ProviderHeader
        title={title}
        cityLabel={cityLabel}
        loading={profileLoading}
        graph={graph}
        showFollow={Boolean(graph && ownerUserId)}
        onFollowToggle={handleFollow}
      />
      <ProviderTabs />

      <h2 className="social-provider-section-title">
        {t("social.providerProfile.latest", { defaultValue: "Latest Posts" })}
      </h2>

      <div className="social-feed-list">
        {posts.length === 0 ? (
          <p>
            {t("social.providerProfile.noPosts", {
              defaultValue: "No posts yet.",
            })}
          </p>
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

export default ProviderProfilePage;
