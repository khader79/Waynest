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

const SavedPostsPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadSavedPosts = async () => {
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

      const savedOnly = Array.from(mapById.values())
        .filter((post) => Boolean(post?.savedByMe))
        .sort(sortByNewest);

      setPosts(savedOnly);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.savedPosts.loadFailed", {
            defaultValue: "Failed to load saved posts",
          }),
        ),
      );
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSavedPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return posts;
    }

    return posts.filter((post) => {
      const author = post?.author?.username ?? "";
      const title = post?.title ?? "";
      const body = post?.body ?? "";
      const location = post?.snapshot?.location?.label ?? "";

      return [author, title, body, location]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [posts, searchTerm]);

  const handleDeletePost = async (postId) => {
    try {
      await deleteSocialPost(postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
      toast.success(
        t("social.savedPosts.deleteSuccess", {
          defaultValue: "Post deleted",
        }),
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.savedPosts.deleteFailed", {
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
        t("social.savedPosts.updateSuccess", {
          defaultValue: "Post updated",
        }),
      );
      await loadSavedPosts();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.savedPosts.updateFailed", {
            defaultValue: "Update failed",
          }),
        ),
      );
    }
  };

  const handleUnsavePost = async (postId) => {
    const response = await unsaveSocialPost(postId);
    setPosts((current) => current.filter((post) => post.id !== postId));
    return response;
  };

  return (
    <section className="saved-posts-page">
      <header className="saved-posts-page__header">
        <div className="saved-posts-page__heading">
          <p className="saved-posts-page__eyebrow">
            {t("social.savedPosts.eyebrow", { defaultValue: "Your library" })}
          </p>
          <h1>
            {t("social.savedPosts.title", { defaultValue: "Saved Posts" })}
          </h1>
          <p className="saved-posts-page__lead">
            {t("social.savedPosts.subtitle", {
              defaultValue:
                "Everything you bookmarked in one place so you can revisit ideas, routes, and updates quickly.",
            })}
          </p>
        </div>
        <label className="saved-posts-page__searchLabel">
          <span>
            {t("social.savedPosts.searchLabel", {
              defaultValue: "Search in saved posts",
            })}
          </span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("social.savedPosts.searchPlaceholder", {
              defaultValue: "Search by author, title, content, or location",
            })}
            className="saved-posts-page__search"
          />
        </label>
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
              ? t("social.savedPosts.emptySearchTitle", {
                  defaultValue: "No matches found",
                })
              : t("social.savedPosts.emptyTitle", {
                  defaultValue: "No saved posts yet",
                })}
          </h2>
          <p>
            {searchTerm.trim()
              ? t("social.savedPosts.emptySearchBody", {
                  defaultValue:
                    "Try another keyword or clear your search to see all saved posts.",
                })
              : t("social.savedPosts.emptyBody", {
                  defaultValue:
                    "When you tap save on a post, it will appear here.",
                })}
          </p>
        </div>
      ) : (
        filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isAuthenticated={isAuthenticated}
            toggleSocialLike={toggleSocialLike}
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

export default SavedPostsPage;
