import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import { useAuth } from "@/context/AuthContext";
import {
  createStory,
  deleteSocialPost,
  deleteStory,
  fetchSocialFeed,
  fetchStoryFeed,
  groupStoriesByAuthor,
  saveSocialPost,
  unsaveSocialPost,
  toggleSocialLike,
  updateSocialPost,
  uploadImage,
  viewStory,
} from "@/services/social/social.service";
import { PostCard, Stories } from "@/components/social";
import "./SocialFeed.css";

const SocialFeed = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

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

  const loadFeed = async () => {
    try {
      setLoading(true);
      const payload = await fetchSocialFeed(filter);
      setPosts(Array.isArray(payload) ? payload : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load social feed"));
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
      toast.error(getApiErrorMessage(error, "Failed to load stories"));
      setStories([]);
    } finally {
      setStoriesLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [filter]);

  useEffect(() => {
    loadStories();
  }, [isAuthenticated]);

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
      toast.success("Story published");
      await loadStories();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Story failed"));
    } finally {
      setCreatingStory(false);
      setStoryUploadProgress(0);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await deleteSocialPost(postId);
      toast.success("Post deleted");
      await loadFeed();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Delete failed"));
    }
  };

  const handleUpdatePost = async (postId, payload) => {
    try {
      await updateSocialPost(postId, payload);
      toast.success("Post updated");
      await loadFeed();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Update failed"));
    }
  };

  const handleDeleteStory = async (storyId) => {
    try {
      await deleteStory(storyId);
      toast.success("Story deleted");
      await loadStories();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Delete story failed"));
    }
  };

  const handleViewStory = async (id) => {
    try {
      await viewStory(id);
    } catch {}
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
        onDeleteStory={handleDeleteStory}
        actorId={user?.id}
      />

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
                  toast.error("Only image files are allowed");
                  return;
                }
                if (file.size > 5 * 1024 * 1024) {
                  toast.error("Image size must be less than 5MB");
                  return;
                }

                if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);

                setStoryFile(file);
                setStoryPreviewUrl(URL.createObjectURL(file));
              }}
            />

            {storyPreviewUrl && <img src={storyPreviewUrl} alt="preview" />}
            {storyUploadProgress > 0 && storyUploadProgress < 100 ? (
              <small>Uploading... {storyUploadProgress}%</small>
            ) : null}

            <textarea
              value={storyCaption}
              onChange={(e) => setStoryCaption(e.target.value)}
            />

            <button
              onClick={submitStory}
              disabled={!storyFile || creatingStory}>
              Publish
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default SocialFeed;
