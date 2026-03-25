import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
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
import { CreatePostCard, PostCard, Stories } from "@/modules/public/layout/facebook/Layout";
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
        <CreatePostCard
          publishing={publishing}
          hasComposerContent={hasComposerContent}
          savedPlans={savedPlans}
          savedPlansLoading={savedPlansLoading}
          selectedTripPlanId={selectedTripPlanId}
          newPostTitle={newPostTitle}
          newPostBody={newPostBody}
          newPostVisibility={newPostVisibility}
          onPublish={publish}
          setSelectedTripPlanId={setSelectedTripPlanId}
          setNewPostTitle={setNewPostTitle}
          setNewPostBody={setNewPostBody}
          setNewPostVisibility={setNewPostVisibility}
        />
      ) : null}

      <Stories posts={posts} />

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
            <PostCard
              key={post.id}
              post={post}
              isAuthenticated={isAuthenticated}
              toggleSocialLike={toggleSocialLike}
              saveSocialPost={saveSocialPost}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default SocialFeed;

