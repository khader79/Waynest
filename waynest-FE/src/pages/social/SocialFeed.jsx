import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import { useGlobalShare } from "@/context/GlobalShareContext";
import { useAuth } from "@/context/AuthContext";
import {
  createStory,
  deleteSocialPost,
  deleteStory,
  fetchPlaceRecommendations,
  fetchSocialFeed,
  fetchSocialPost,
  fetchStoryById,
  fetchStoryFeed,
  groupStoriesByAuthor,
  saveSocialPost,
  unsaveSocialPost,
  toggleSocialLike,
  updateSocialPost,
  uploadImage,
  viewStory,
} from "@/services/social/social.service";
import { AIPlaceRecommendations, PostCard, Stories } from "@/components/social";
import "./SocialFeed.css";

const SocialFeed = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { openShare } = useGlobalShare();

  const [filter, setFilter] = useState("for-you");
  const [posts, setPosts] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingStory, setCreatingStory] = useState(false);

  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyFile, setStoryFile] = useState(null);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState(null);
  const [storyCaption, setStoryCaption] = useState("");

  const [storyUploadProgress, setStoryUploadProgress] = useState(0);

  const [stories, setStories] = useState(() => groupStoriesByAuthor([]));
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [deepLinkPostId, setDeepLinkPostId] = useState(null);
  const [deepLinkStoryId, setDeepLinkStoryId] = useState(null);

  const updateUrlWithoutDeepLink = (key) => {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete(key);

    const query = nextUrl.searchParams.toString();
    const rebuilt = `${nextUrl.pathname}${query ? `?${query}` : ""}${nextUrl.hash}`;
    window.history.replaceState({}, "", rebuilt);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const postId = params.get("post")?.trim() || null;
    const storyId = params.get("story")?.trim() || null;

    setDeepLinkPostId(postId);
    setDeepLinkStoryId(storyId);
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const payload = await fetchSocialFeed(filter);
      const feedPosts = Array.isArray(payload) ? payload : [];

      if (deepLinkPostId) {
        const alreadyThere = feedPosts.some(
          (post) => post.id === deepLinkPostId,
        );
        if (!alreadyThere) {
          try {
            const targetPost = await fetchSocialPost(deepLinkPostId);
            const merged = [targetPost, ...feedPosts].filter(
              (post, index, list) =>
                post?.id &&
                list.findIndex((item) => item?.id === post.id) === index,
            );
            setPosts(merged);
            return;
          } catch {
            // If not accessible, keep normal feed.
          }
        }
      }

      setPosts(feedPosts);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("toasts.socialFeed.failedToLoadFeed", "Failed to load social feed")));
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
      const feedStories = Array.isArray(payload) ? payload : [];

      if (deepLinkStoryId) {
        const inFeed = feedStories.some(
          (story) => story.id === deepLinkStoryId,
        );
        if (!inFeed) {
          try {
            const deepStory = await fetchStoryById(deepLinkStoryId);
            setStories(groupStoriesByAuthor([deepStory, ...feedStories]));
            return;
          } catch {
            // If not accessible, keep normal stories feed.
          }
        }
      }

      setStories(groupStoriesByAuthor(feedStories));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("toasts.socialFeed.storyFailed", { defaultValue: "Failed to load stories" })));
      setStories([]);
    } finally {
      setStoriesLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      setRecommendationsLoading(true);
      const payload = await fetchPlaceRecommendations(6);
      setRecommendations(payload ?? null);
    } catch {
      setRecommendations(null);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [filter, deepLinkPostId]);

  useEffect(() => {
    loadStories();
  }, [isAuthenticated, deepLinkStoryId]);

  useEffect(() => {
    if (filter !== "for-you") {
      return;
    }

    void loadRecommendations();
  }, [filter, isAuthenticated, user?.id]);

  useEffect(() => {
    if (
      !deepLinkPostId ||
      posts.length === 0 ||
      typeof window === "undefined"
    ) {
      return;
    }

    const element = document.getElementById(`social-post-${deepLinkPostId}`);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    updateUrlWithoutDeepLink("post");
    setDeepLinkPostId(null);
  }, [deepLinkPostId, posts]);

  const closeStoryModal = () => {
    if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);
    setStoryFile(null);
    setStoryPreviewUrl(null);
    setStoryCaption("");
    setStoryModalOpen(false);
  };

  const submitStory = async () => {
    if (!storyFile) return;

    try {
      setCreatingStory(true);

      const { path } = await uploadImage(storyFile, setStoryUploadProgress);

      await createStory({
        imageUrl: path,
        caption: storyCaption.trim() || undefined,
      });

      closeStoryModal();
      toast.success(t("toasts.socialFeed.storyPublished"));
      await loadStories();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("toasts.socialFeed.storyFailed")));
    } finally {
      setCreatingStory(false);
      setStoryUploadProgress(0);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await deleteSocialPost(postId);
      toast.success(t("toasts.socialFeed.postDeleted"));
      await loadFeed();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("toasts.socialFeed.deleteFailed")));
    }
  };

  const handleUpdatePost = async (postId, payload) => {
    try {
      await updateSocialPost(postId, payload);
      toast.success(t("toasts.socialFeed.postUpdated"));
      await loadFeed();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("toasts.socialFeed.updateFailed")));
    }
  };

  const handleDeleteStory = async (storyId) => {
    try {
      await deleteStory(storyId);
      toast.success(t("toasts.socialFeed.storyDeleted"));
      await loadStories();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("toasts.socialFeed.deleteStoryFailed")));
    }
  };

  const handleViewStory = async (id) => {
    try {
      await viewStory(id);
    } catch {
      // View tracking is best-effort and should not interrupt story browsing.
    }
  };

  const handleShareStory = (story, storyGroup) => {
    if (!story?.id) {
      return;
    }

    const hasWindow = typeof window !== "undefined";
    const url = hasWindow
      ? `${window.location.origin}/social?story=${encodeURIComponent(story.id)}`
      : "";

    const title = t("stories.shareTitle", {
      author: storyGroup?.authorName,
      defaultValue: storyGroup?.authorName
        ? "{{author}} shared a story on Waynest"
        : "Check this story on Waynest",
    });
    const text =
      story.caption?.trim() ||
      t("stories.shareText", {
        defaultValue: "Take a look at this story on Waynest.",
      });

    openShare({
      dialogTitle: t("stories.share", { defaultValue: "Share story" }),
      title,
      text,
      url,
    });
  };

  return (
    <section className="social-feed-page">
      <div className="social-feed-filters">
        {["for-you", "following"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`social-feed-tab${filter === tab ? " social-feed-tab--active" : ""}`}
            onClick={() => setFilter(tab)}>
            {tab === "for-you"
              ? t("social.feed.forYou", "For You")
              : t("social.feed.following", "Following")}
          </button>
        ))}
      </div>

      <Stories
        stories={stories}
        loading={storiesLoading}
        onCreateStory={() => setStoryModalOpen(true)}
        onViewStory={handleViewStory}
        onShareStory={handleShareStory}
        onDeleteStory={handleDeleteStory}
        actorId={user?.id}
        requestedStoryId={deepLinkStoryId}
        onRequestedStoryConsumed={() => {
          updateUrlWithoutDeepLink("story");
          setDeepLinkStoryId(null);
        }}
      />

      {filter === "for-you" ? (
        <AIPlaceRecommendations
          payload={recommendations}
          loading={recommendationsLoading}
          isAuthenticated={isAuthenticated}
        />
      ) : null}

      {loading ? (
        <div className="social-feed-skeletons">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="social-post-skeleton">
              <div className="social-skeleton-header">
                <div className="social-skeleton-avatar" />
                <div className="social-skeleton-meta">
                  <div className="social-skeleton-line social-skeleton-line--name" />
                  <div className="social-skeleton-line social-skeleton-line--date" />
                </div>
              </div>
              <div className="social-skeleton-line social-skeleton-line--title" />
              <div className="social-skeleton-line social-skeleton-line--body" />
              <div className="social-skeleton-line social-skeleton-line--body-short" />
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
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
            domId={`social-post-${post.id}`}
            focused={post.id === deepLinkPostId}
          />
        ))
      ) : (
        <div className="social-empty">
          {t("social.feed.empty", {
            defaultValue: "No posts yet. Public posts will appear here.",
          })}
        </div>
      )}

      {storyModalOpen && (
        <div className="social-modalBackdrop" onClick={closeStoryModal}>
          <div
            className="social-modalCard"
            onClick={(e) => e.stopPropagation()}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith("image/")) {
                  toast.error(t("toasts.socialFeed.onlyImages"));
                  return;
                }
                if (file.size > 5 * 1024 * 1024) {
                  toast.error(t("toasts.socialFeed.imageTooLarge"));
                  return;
                }

                if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);

                setStoryFile(file);
                setStoryPreviewUrl(URL.createObjectURL(file));
              }}
            />

            {storyPreviewUrl && <img src={storyPreviewUrl} alt={t("stories.preview", "preview")} />}
            {storyUploadProgress > 0 && storyUploadProgress < 100 ? (
              <small>{t("toasts.socialFeed.uploading")} {storyUploadProgress}%</small>
            ) : null}

            <textarea
              value={storyCaption}
              onChange={(e) => setStoryCaption(e.target.value)}
            />

            <button
              onClick={submitStory}
              disabled={!storyFile || creatingStory}>
              {t("stories.publish", "Publish")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default SocialFeed;
