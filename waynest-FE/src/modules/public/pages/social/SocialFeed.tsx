import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { copyTextToClipboard } from "@/core/utils/clipboard";
import { getApiErrorMessage } from "@/core/utils/errors";
import { useAuth } from "@/core/providers/AuthContext";
import { extractTripPlans } from "@/features/trip-planner/utils/dataNormalizers";
import type { TripPlanSummary } from "@/features/trip-planner/types";
import {
  createSocialPost,
  fetchSocialFeed,
  saveSocialPost,
  toggleSocialLike,
  type SocialPost,
  type SocialPostVisibility,
} from "@/services/social/social.service";
import { fetchSavedTripPlans } from "@/services/tripPlanner/tripPlanner.service";
import "./SocialFeed.css";

const SocialFeed = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [filter, setFilter] = useState<"for-you" | "following" | "providers">("for-you");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [savedPlans, setSavedPlans] = useState<TripPlanSummary[]>([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [newPostBody, setNewPostBody] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [selectedTripPlanId, setSelectedTripPlanId] = useState("");
  const [newPostVisibility, setNewPostVisibility] =
    useState<SocialPostVisibility>("PUBLIC");

  const loadFeed = async () => {
    try {
      setLoading(true);
      const payload = await fetchSocialFeed(filter);
      setPosts(Array.isArray(payload) ? payload : []);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.feed.loadFailed", { defaultValue: "Failed to load social feed" }),
        ),
      );
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
  }, [filter]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedPlans([]);
      setSelectedTripPlanId("");
      return;
    }
    const loadSavedPlans = async () => {
      try {
        setSavedPlansLoading(true);
        const payload = await fetchSavedTripPlans();
        const plans = extractTripPlans(payload).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setSavedPlans(plans);
        if (plans.length > 0) {
          setSelectedTripPlanId((current) => current || plans[0].id);
        }
      } catch (error) {
        setSavedPlans([]);
        toast.error(
          getApiErrorMessage(
            error,
            t("social.feed.savedPlansLoadFailed", {
              defaultValue: "Failed to load saved plans",
            }),
          ),
        );
      } finally {
        setSavedPlansLoading(false);
      }
    };
    void loadSavedPlans();
  }, [isAuthenticated]);

  const publish = async () => {
    if (!isAuthenticated) {
      toast.info(t("social.feed.loginToPublish", { defaultValue: "Please login to publish" }));
      return;
    }
    if (!selectedTripPlanId) {
      toast.info(
        t("social.feed.selectPlanFirst", { defaultValue: "Please select a saved plan" }),
      );
      return;
    }
    try {
      setPublishing(true);
      await createSocialPost({
        body: newPostBody.trim() || undefined,
        title: newPostTitle.trim() || undefined,
        tripPlanId: selectedTripPlanId,
        visibility: newPostVisibility,
      });
      setNewPostBody("");
      setNewPostTitle("");
      toast.success(t("social.feed.published", { defaultValue: "Post published" }));
      await loadFeed();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.feed.publishFailed", { defaultValue: "Failed to publish post" }),
        ),
      );
    } finally {
      setPublishing(false);
    }
  };

  const hasComposerContent = useMemo(
    () => Boolean(newPostBody.trim() || newPostTitle.trim() || selectedTripPlanId),
    [newPostBody, newPostTitle, selectedTripPlanId],
  );

  return (
    <section className="social-feed-page">
      <div className="social-feed-header">
        <h1>{t("social.feed.title", { defaultValue: "Community Feed" })}</h1>
        <Link to="/search" className="social-feed-header__btn social-feed-header__btn--link">
          {t("social.feed.openSearch", { defaultValue: "Search" })}
        </Link>
        <div className="social-feed-filters">
          <button
            type="button"
            className={filter === "for-you" ? "active" : ""}
            onClick={() => setFilter("for-you")}>
            {t("social.feed.filters.forYou", { defaultValue: "For You" })}
          </button>
          <button
            type="button"
            className={filter === "following" ? "active" : ""}
            onClick={() => setFilter("following")}>
            {t("social.feed.filters.following", { defaultValue: "Following" })}
          </button>
          <button
            type="button"
            className={filter === "providers" ? "active" : ""}
            onClick={() => setFilter("providers")}>
            {t("social.feed.filters.providers", { defaultValue: "Providers" })}
          </button>
        </div>
      </div>

      {isAuthenticated ? (
        <article className="social-composer">
          <h2>{t("social.feed.composer.title", { defaultValue: "Share your trip" })}</h2>
          <input
            type="text"
            placeholder={t("social.feed.composer.postTitle", {
              defaultValue: "Post title (optional)",
            })}
            value={newPostTitle}
            onChange={(event) => setNewPostTitle(event.target.value)}
          />
          <textarea
            placeholder={t("social.feed.composer.bodyPlaceholder", {
              defaultValue: "Write something about your plan...",
            })}
            value={newPostBody}
            onChange={(event) => setNewPostBody(event.target.value)}
          />
          <div className="social-composer-row">
            <select
              value={selectedTripPlanId}
              onChange={(event) => setSelectedTripPlanId(event.target.value)}
              disabled={savedPlansLoading || savedPlans.length === 0}>
              {savedPlans.length === 0 ? (
                <option value="">
                  {savedPlansLoading
                    ? t("social.feed.composer.loadingPlans", { defaultValue: "Loading plans..." })
                    : t("social.feed.composer.noPlans", {
                        defaultValue: "No saved plans available",
                      })}
                </option>
              ) : (
                savedPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title || `Trip Plan ${plan.id.slice(0, 6)}`}
                  </option>
                ))
              )}
            </select>
            <select
              value={newPostVisibility}
              onChange={(event) =>
                setNewPostVisibility(event.target.value as SocialPostVisibility)
              }>
              <option value="PUBLIC">Public</option>
              <option value="FOLLOWERS">Followers</option>
              <option value="PRIVATE">Private</option>
            </select>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing || !hasComposerContent || !selectedTripPlanId}>
              {publishing
                ? t("social.feed.composer.publishing", { defaultValue: "Publishing..." })
                : t("social.feed.composer.publish", { defaultValue: "Publish" })}
            </button>
          </div>
        </article>
      ) : null}

      {loading ? (
        <p className="social-loading">
          {t("social.feed.loading", { defaultValue: "Loading feed..." })}
        </p>
      ) : posts.length === 0 ? (
        <p className="social-empty">
          {t("social.feed.empty", { defaultValue: "No posts in this feed yet." })}
        </p>
      ) : (
        <div className="social-post-list">
          {posts.map((post) => (
            <article className="social-post-card" key={post.id}>
              <div className="social-post-meta">
                <strong>
                  <Link
                    to={
                      post.author?.username
                        ? `/u/${encodeURIComponent(post.author.username)}`
                        : `/social/users/${encodeURIComponent(post.authorId)}`
                    }>
                    {post.author?.username ?? t("social.feed.traveler", { defaultValue: "Traveler" })}
                  </Link>
                </strong>
                <span>{new Date(post.createdAt).toLocaleString()}</span>
              </div>
              {post.title ? <h3>{post.title}</h3> : null}
              {post.body ? <p>{post.body}</p> : null}
              {post.shareSlug ? (
                <Link to={`/trip/${post.shareSlug}`} className="social-share-link">
                  {t("social.feed.openSharedTrip", { defaultValue: "Open shared trip" })}
                </Link>
              ) : null}
              <div className="social-post-actions">
                <button
                  type="button"
                  onClick={async () => {
                    if (!isAuthenticated) {
                      toast.info(
                        t("social.feed.loginFirst", { defaultValue: "Please login first" }),
                      );
                      return;
                    }
                    await toggleSocialLike(post.id);
                    toast.success(t("social.feed.likeUpdated", { defaultValue: "Updated like" }));
                  }}>
                  {t("social.feed.actions.like", { defaultValue: "Like" })}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!isAuthenticated) {
                      toast.info(
                        t("social.feed.loginFirst", { defaultValue: "Please login first" }),
                      );
                      return;
                    }
                    await saveSocialPost(post.id);
                    toast.success(
                      t("social.feed.savedToAccount", { defaultValue: "Saved to your account" }),
                    );
                  }}>
                  {t("social.feed.actions.saveCopy", { defaultValue: "Save & Copy" })}
                </button>
                <Link to={`/social/post/${post.id}`}>
                  {t("social.feed.actions.comments", { defaultValue: "Comments" })}
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    if (!post.shareSlug) {
                      toast.info(
                        t("social.feed.shareUnavailable", {
                          defaultValue: "This post has no shareable trip yet",
                        }),
                      );
                      return;
                    }
                    const url = `${window.location.origin}/trip/${post.shareSlug}`;
                    await copyTextToClipboard(url);
                    toast.success(
                      t("social.feed.shareCopied", { defaultValue: "Trip link copied" }),
                    );
                  }}>
                  {t("social.feed.actions.share", { defaultValue: "Share" })}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default SocialFeed;

