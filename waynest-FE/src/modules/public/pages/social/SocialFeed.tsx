import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FiImage } from "react-icons/fi";
import { getApiErrorMessage } from "@/core/utils/errors";
import { useAuth } from "@/core/providers/AuthContext";
import { extractTripPlans } from "@/features/trip-planner/utils/dataNormalizers";
import type { TripPlanSummary } from "@/features/trip-planner/types";
import {
  createSocialPost,
  createStory,
  fetchSocialFeed,
  fetchStoryFeed,
  groupStoriesByAuthor,
  saveSocialPost,
  toggleSocialLike,
  uploadImage,
  viewStory,
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
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [creatingStory, setCreatingStory] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null);
  const [storyCaption, setStoryCaption] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [selectedTripPlanId, setSelectedTripPlanId] = useState("");
  const [newPostVisibility, setNewPostVisibility] =
    useState<SocialPostVisibility>("PUBLIC");
  const [stories, setStories] = useState(() => groupStoriesByAuthor([]));

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

  const loadStories = async () => {
    if (!isAuthenticated) {
      setStories([]);
      return;
    }

    try {
      setStoriesLoading(true);
      const payload = await fetchStoryFeed();
      setStories(groupStoriesByAuthor(Array.isArray(payload) ? payload : []));
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("stories.loadFailed", { defaultValue: "Failed to load stories" }),
        ),
      );
      setStories([]);
    } finally {
      setStoriesLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
  }, [filter]);

  useEffect(() => {
    void loadStories();
  }, [isAuthenticated]);

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
  }, [isAuthenticated, t]);

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

  const closeStoryModal = () => {
    if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);
    setStoryFile(null);
    setStoryPreviewUrl(null);
    setStoryCaption("");
    setStoryModalOpen(false);
  };

  const submitStory = async () => {
    if (!storyFile) {
      toast.info(
        t("stories.imageRequired", {
          defaultValue: "Please select a photo before publishing your story.",
        }),
      );
      return;
    }

    try {
      setCreatingStory(true);
      const { url } = await uploadImage(storyFile);
      await createStory({
        imageUrl: url,
        caption: storyCaption.trim() || undefined,
      });
      closeStoryModal();
      toast.success(t("stories.created", { defaultValue: "Story published" }));
      await loadStories();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("stories.createFailed", { defaultValue: "Failed to publish story" }),
        ),
      );
    } finally {
      setCreatingStory(false);
    }
  };

  const handleViewStory = async (storyId: string) => {
    try {
      await viewStory(storyId);
    } catch {
      // The viewer should remain smooth even if one view ping fails.
    }
  };

  const hasComposerContent = useMemo(
    () => Boolean(newPostBody.trim() || newPostTitle.trim() || selectedTripPlanId),
    [newPostBody, newPostTitle, selectedTripPlanId],
  );

  return (
    <section className="social-feed-page">
      <div className="social-feed-homeBar">
        <div className="social-feed-homeBar__copy">
          <p className="social-feed-heading__eyebrow">
            {t("social.feed.eyebrow", { defaultValue: "Waynest home" })}
          </p>
          <h1>{t("social.feed.homeTitle", { defaultValue: "Travel feed" })}</h1>
          <p className="social-feed-heading__text">
            {t("social.feed.homeSubtitle", {
              defaultValue:
                "Stories, traveler posts, and shared itineraries stay together here while Messenger lives on its own page.",
            })}
          </p>
        </div>
        <div className="social-feed-header__actions">
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
          <Link to="/social" className="social-feed-header__btn social-feed-header__btn--link">
            {t("sidebar.openMessenger", { defaultValue: "Open Messenger" })}
          </Link>
        </div>
      </div>

      <Stories
        stories={stories}
        loading={storiesLoading}
        onCreateStory={() => setStoryModalOpen(true)}
        onViewStory={handleViewStory}
      />

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

      {loading ? (
        <p className="social-loading">
          {t("social.feed.loading", { defaultValue: "Loading feed..." })}
        </p>
      ) : posts.length === 0 ? (
        <div className="social-empty social-empty--panel">
          <strong>{t("social.feed.empty", { defaultValue: "No posts in this feed yet." })}</strong>
          <span>
            {t("social.feed.emptyHelp", {
              defaultValue:
                "Once travelers publish plans and updates, they will land here in one clean stream.",
            })}
          </span>
        </div>
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

      {storyModalOpen ? (
        <div className="social-modalBackdrop" role="presentation" onClick={closeStoryModal}>
          <div
            className="social-modalCard"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-story-title"
            onClick={(event) => event.stopPropagation()}>
            <div className="social-modalHeader">
              <div>
                <p className="social-composer-eyebrow">
                  {t("stories.modalEyebrow", { defaultValue: "Traveler story" })}
                </p>
                <h2 id="create-story-title">
                  {t("stories.create", { defaultValue: "Create Story" })}
                </h2>
              </div>
              <button
                type="button"
                className="social-feed-header__btn"
                onClick={closeStoryModal}>
                {t("common.close", { defaultValue: "Close" })}
              </button>
            </div>

            <div className="social-modalBody">
              <div className="social-formField">
                <span>{t("stories.imageLabel", { defaultValue: "Photo" })}</span>
                <label className="social-story-upload">
                  {storyPreviewUrl ? (
                    <img
                      src={storyPreviewUrl}
                      alt="preview"
                      className="social-story-preview"
                    />
                  ) : (
                    <div className="social-story-upload__placeholder">
                      <FiImage aria-hidden="true" />
                      <span>
                        {t("stories.choosePicture", { defaultValue: "Tap to choose a photo" })}
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="social-story-upload__input"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);
                      setStoryFile(file);
                      setStoryPreviewUrl(URL.createObjectURL(file));
                    }}
                  />
                </label>
              </div>

              <label className="social-formField">
                <span>{t("stories.captionLabel", { defaultValue: "Caption" })}</span>
                <textarea
                  placeholder={t("stories.captionPlaceholder", {
                    defaultValue: "Add a short travel note for this story...",
                  })}
                  value={storyCaption}
                  onChange={(event) => setStoryCaption(event.target.value)}
                />
              </label>
            </div>

            <div className="social-modalActions">
              <button
                type="button"
                className="social-feed-header__btn"
                onClick={closeStoryModal}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>
              <button
                type="button"
                className="social-feed-header__btn social-feed-header__btn--primary"
                disabled={creatingStory || !storyFile}
                onClick={() => void submitStory()}>
                {creatingStory
                  ? t("stories.creating", { defaultValue: "Publishing..." })
                  : t("stories.publish", { defaultValue: "Publish story" })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default SocialFeed;
