import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FiImage } from "react-icons/fi";
import { getApiErrorMessage } from "@/utils/errors";
import { useAuth } from "@/context/AuthContext";
import { extractTripPlans } from "@/utils/trips/dataNormalizers";
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
} from "@/services/social/social.service";
import { fetchSavedTripPlans } from "@/api/trips";
import {
  CreatePostCard,
  PostCard,
  Stories,
} from "@/components/social";
import "./SocialFeed.css";

const SocialFeed = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [filter, setFilter] = useState("for-you");
  const [posts, setPosts] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [creatingStory, setCreatingStory] = useState(false);

  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyFile, setStoryFile] = useState(null);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState(null);
  const [storyCaption, setStoryCaption] = useState("");

  const [newPostBody, setNewPostBody] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [selectedTripPlanId, setSelectedTripPlanId] = useState("");
  const [newPostVisibility, setNewPostVisibility] = useState("PUBLIC");

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
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setSavedPlans(plans);
        if (plans.length > 0) {
          setSelectedTripPlanId((c) => c || plans[0].id);
        }
      } catch (error) {
        setSavedPlans([]);
        toast.error(getApiErrorMessage(error, "Failed to load saved plans"));
      } finally {
        setSavedPlansLoading(false);
      }
    };

    loadSavedPlans();
  }, [isAuthenticated]);

  const publish = async () => {
    if (!isAuthenticated) {
      toast.info("Login first");
      return;
    }

    if (!selectedTripPlanId) {
      toast.info("Select a plan first");
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

      toast.success("Published!");
      await loadFeed();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Publish failed"));
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
    if (!storyFile) return;

    try {
      setCreatingStory(true);

      const { url } = await uploadImage(storyFile);

      await createStory({
        imageUrl: url,
        caption: storyCaption.trim() || undefined,
      });

      closeStoryModal();
      toast.success("Story published");
      await loadStories();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Story failed"));
    } finally {
      setCreatingStory(false);
    }
  };

  const handleViewStory = async (id) => {
    try {
      await viewStory(id);
    } catch {}
  };

  const hasComposerContent = useMemo(
    () => Boolean(newPostBody || newPostTitle || selectedTripPlanId),
    [newPostBody, newPostTitle, selectedTripPlanId],
  );

  return (
    <section className="social-feed-page">
      <div className="social-feed-filters">
        {["for-you", "following"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`social-feed-tab${filter === tab ? " social-feed-tab--active" : ""}`}
            onClick={() => setFilter(tab)}
          >
            {tab === "for-you" ? t("social.feed.forYou", "For You") : t("social.feed.following", "Following")}
          </button>
        ))}
      </div>

      <Stories
        stories={stories}
        loading={storiesLoading}
        onCreateStory={() => setStoryModalOpen(true)}
        onViewStory={handleViewStory}
      />

      {isAuthenticated && (
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
      )}

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
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isAuthenticated={isAuthenticated}
            toggleSocialLike={toggleSocialLike}
            saveSocialPost={saveSocialPost}
          />
        ))
      )}

      {/* ✅ FIXED MODAL */}
      {storyModalOpen && (
        <div className="social-modalBackdrop" onClick={closeStoryModal}>
          <div
            className="social-modalCard"
            onClick={(e) => e.stopPropagation()}>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);

                setStoryFile(file);
                setStoryPreviewUrl(URL.createObjectURL(file));
              }}
            />

            {storyPreviewUrl && <img src={storyPreviewUrl} alt="preview" />}

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