import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { PostCard } from "@/components/social";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/utils/errors";
import {
  deleteSocialPost,
  fetchSocialFeed,
  saveSocialPost,
  toggleSocialLike,
  unsaveSocialPost,
  updateSocialPost,
} from "@/services/social/social.service";

import "./SavedPostsPage.css";

const FEED_FILTERS = ["for-you", "following", "providers"];

const toArray = (value) => (Array.isArray(value) ? value : []);

const sortByNewest = (left, right) => {
  const leftTime = new Date(left?.createdAt ?? 0).getTime();
  const rightTime = new Date(right?.createdAt ?? 0).getTime();
  return rightTime - leftTime;
};

const ActivitiesPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("saved"); // saved | liked

  const loadActivities = async () => {
    try {
      setLoading(true);

      const batches = await Promise.all(
        FEED_FILTERS.map((filter) => fetchSocialFeed(filter, 50)),
      );

      const merged = batches.flatMap(toArray);
      const mapById = new Map();

      merged.forEach((post) => {
        if (!post?.id || mapById.has(post.id)) {
          return;
        }
        mapById.set(post.id, post);
      });

      const activitiesOnly = Array.from(mapById.values())
        .filter((post) => Boolean(post?.savedByMe) || Boolean(post?.likedByMe))
        .sort(sortByNewest);

      setPosts(activitiesOnly);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.activities.loadFailed", {
            defaultValue: "Failed to load activities",
          }),
        ),
      );
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActivities();
  }, []);

  const filteredPosts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const base = posts.filter((post) => {
      if (view === "saved") return Boolean(post?.savedByMe);
      if (view === "liked") return Boolean(post?.likedByMe);
      return Boolean(post?.savedByMe) || Boolean(post?.likedByMe);
    });

    if (!query) return base;

    return base.filter((post) => {
      const author = post?.author?.username ?? "";
      const title = post?.title ?? "";
      const body = post?.body ?? "";
      const location = post?.snapshot?.location?.label ?? "";

      return [author, title, body, location]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [posts, searchTerm, view]);

  const handleDeletePost = async (postId) => {
    try {
      await deleteSocialPost(postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
      toast.success(
        t("social.activities.deleteSuccess", { defaultValue: "Post deleted" }),
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.activities.deleteFailed", {
            defaultValue: "Delete failed",
          }),
        ),
      );
    }
  };

  const handleUpdatePost = async (postId, payload) => {
    try {
      await updateSocialPost(postId, payload);
      toast.success(
        t("social.activities.updateSuccess", { defaultValue: "Post updated" }),
      );
      await loadActivities();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.activities.updateFailed", {
            defaultValue: "Update failed",
          }),
        ),
      );
    }
  };

  const handleUnsavePost = async (postId) => {
    try {
      const res = await unsaveSocialPost(postId);
      setPosts((current) =>
        current
          .map((p) =>
            p.id === postId
              ? { ...p, savedByMe: false, likedByMe: Boolean(p?.likedByMe) }
              : p,
          )
          .filter((p) =>
            view === "saved"
              ? Boolean(p?.savedByMe) || Boolean(p?.likedByMe)
              : true,
          ),
      );
      return res;
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.activities.unsaveFailed", {
            defaultValue: "Unsave failed",
          }),
        ),
      );
      throw error;
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const res = await toggleSocialLike(postId);
      setPosts((current) =>
        current
          .map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likedByMe:
                    typeof res?.liked === "boolean" ? res.liked : !p.likedByMe,
                  likeCount: res?.likeCount ?? p.likeCount,
                }
              : p,
          )
          .filter((p) =>
            view === "liked"
              ? Boolean(p?.likedByMe) || Boolean(p?.savedByMe)
              : true,
          ),
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.activities.likeFailed", { defaultValue: "Like failed" }),
        ),
      );
    }
  };

  return (
    <section className="saved-posts-page">
      <header className="saved-posts-page__header">
        <div className="saved-posts-page__heading">
          <p className="saved-posts-page__eyebrow">
            {t("social.activities.eyebrow", { defaultValue: "Your activity" })}
          </p>
          <h1>
            {t("social.activities.title", { defaultValue: "Activities" })}
          </h1>
          <p className="saved-posts-page__lead">
            {t("social.activities.subtitle", {
              defaultValue: "Posts you saved or liked in one place.",
            })}
          </p>
        </div>

        <div className="saved-posts-page__controls">
          <div className="saved-posts-page__tabs">
            <button
              type="button"
              className={view === "saved" ? "isActive" : ""}
              onClick={() => setView("saved")}>
              {t("social.activities.tabSaved", { defaultValue: "Saved" })}
            </button>
            <button
              type="button"
              className={view === "liked" ? "isActive" : ""}
              onClick={() => setView("liked")}>
              {t("social.activities.tabLiked", { defaultValue: "Liked" })}
            </button>
          </div>

          <label className="saved-posts-page__searchLabel">
            <span>
              {t("social.activities.searchLabel", {
                defaultValue: "Search in activities",
              })}
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("social.activities.searchPlaceholder", {
                defaultValue: "Search by author, title, content, or location",
              })}
              className="saved-posts-page__search"
            />
          </label>
        </div>
      </header>

      {loading ? (
        <div className="social-feed-skeletons">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="social-post-skeleton">
              <div className="social-skeleton-header">
                <div className="social-skeleton-avatar" />
                <div className="social-skeleton-meta">
                  <div className="social-skeleton-line social-skeleton-line--name" />
                  <div className="social-skeleton-line social-skeleton-line--date" />
                </div>
              </div>
              <div className="social-skeleton-line social-skeleton-line--title" />
              <div className="social-skeleton-line social-skeleton-line--body" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="saved-posts-page__empty">
          <h2>
            {searchTerm.trim()
              ? t("social.activities.emptySearchTitle", {
                  defaultValue: "No matches found",
                })
              : t("social.activities.emptyTitle", {
                  defaultValue: "No activity found",
                })}
          </h2>
          <p>
            {searchTerm.trim()
              ? t("social.activities.emptySearchBody", {
                  defaultValue:
                    "Try another keyword or clear your search to see all activities.",
                })
              : t("social.activities.emptyBody", {
                  defaultValue: "Like or save posts to see them here.",
                })}
          </p>
        </div>
      ) : (
        filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isAuthenticated={isAuthenticated}
            toggleSocialLike={handleToggleLike}
            saveSocialPost={saveSocialPost}
            unsaveSocialPost={handleUnsavePost}
            actorId={user?.id}
            onDeletePost={handleDeletePost}
            onUpdatePost={handleUpdatePost}
          />
        ))
      )}
    </section>
  );
};

export default ActivitiesPage;
