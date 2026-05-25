import { useEffect, useState } from "react";
import "@/components/social/PostCard.css";
import { useTranslation } from "react-i18next";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import {
  createPostComment,
  fetchPostComments,
  fetchSocialPost,
  toggleSocialLike,
} from "@/api/social";
import { useAuth } from "@/context/AuthContext";
import {
  FaArrowLeft,
  FaExpand,
  FaHeart,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaUser,
} from "react-icons/fa";
import { FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi";
import { IoEarth } from "react-icons/io5";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import "./SocialPostDetail.css";

function formatRelativeTime(isoString) {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

const SocialPostDetail = () => {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const nextPost = await fetchSocialPost(id);
      setPost(nextPost);
      setLiked(Boolean(nextPost.likedByMe));
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.postDetail.loadFailed", {
            defaultValue: "Failed to load post",
          }),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const nextComments = await fetchPostComments(id);
      setComments(Array.isArray(nextComments) ? nextComments : []);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    void load();
    void loadComments();
  }, [id]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      const saved = await createPostComment(id, { content: commentText });
      setCommentText("");
      setComments((current) => [...current, saved]);
      toast.success(
        t("social.postDetail.commentAdded", { defaultValue: "Comment added" }),
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.postDetail.addCommentFailed", {
            defaultValue: "Failed to add comment",
          }),
        ),
      );
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.info(
        t("common.loginFirst", { defaultValue: "Please login first" }),
      );
      return;
    }
    try {
      await toggleSocialLike(id);
      setLiked(!liked);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              // backend returns `likeCount`; older code used `likesCount`.
              likeCount: liked
                ? (prev.likeCount || 1) - 1
                : (prev.likeCount || 0) + 1,
              likesCount: liked
                ? (prev.likesCount || 1) - 1
                : (prev.likesCount || 0) + 1,
            }
          : null,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("errors.generic")));
    }
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case "PUBLIC":
        return <IoEarth className="post-visibility-icon" />;
      case "FRIENDS":
        return <FaUser className="post-visibility-icon" />;
      default:
        return <IoEarth className="post-visibility-icon" />;
    }
  };

  const author = post?.author;
  const avatarUrl = getResolvedAvatarUrl(author);
  const authorInitial = author?.username
    ? author.username.trim().charAt(0).toUpperCase()
    : "U";

  const locationInfo = post?.snapshot?.location?.label;
  const likeCount =
    post?.likeCount ?? post?.likesCount ?? post?._count?.likes ?? 0;

  if (loading) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-skeleton">
          <div className="post-detail-sk-header">
            <div className="post-detail-sk-avatar" />
            <div className="post-detail-sk-lines">
              <div className="post-detail-sk-line post-detail-sk-line--wide" />
              <div className="post-detail-sk-line" />
            </div>
          </div>
          <div className="post-detail-sk-text" />
          <div className="post-detail-sk-text" />
          <div className="post-detail-sk-text post-detail-sk-text--short" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-empty">
          <button
            type="button"
            className="post-detail-back"
            onClick={() => navigate(-1)}>
            <FaArrowLeft size={14} />
            {t("common.back", { defaultValue: "Back" })}
          </button>
          <h2>
            {t("social.postDetail.notFoundTitle", {
              defaultValue: "Post not found",
            })}
          </h2>
          <p>
            {t("social.postDetail.loadFailed", {
              defaultValue: "Failed to load post",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="post-detail-page">
      <button
        type="button"
        className="post-detail-back"
        onClick={() => navigate(-1)}>
        <FaArrowLeft size={14} />
        {t("common.back", { defaultValue: "Back" })}
      </button>

      <article className="post-detail-card">
        <header className="social-post-card__header">
          <div className="social-post-card__author">
            <div className="social-post-card__avatar">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="social-post-card__avatarImg"
                  onError={handleAvatarImageError}
                />
              ) : (
                authorInitial
              )}
            </div>
            <div className="social-post-card__meta">
              <p className="social-post-card__name">
                <Link to={author?.username ? `/u/${author.username}` : "#"}>
                  {author?.username ??
                    t("social.feed.traveler", { defaultValue: "Traveler" })}
                </Link>
              </p>
              <p className="social-post-card__time">
                {formatRelativeTime(post.createdAt)}
                {getVisibilityIcon(post.visibility)}
              </p>
            </div>
          </div>
          {post.shareSlug && (
            <span className="social-post-card__chip">
              {t("social.feed.sharedPlan", {
                defaultValue: "Shared itinerary",
              })}
            </span>
          )}
        </header>

        {(post.title || post.body) && (
          <div className="social-post-card__text">
            {post.title && (
              <h3 className="social-post-card__title">{post.title}</h3>
            )}
            {post.body && <p className="social-post-card__body">{post.body}</p>}
          </div>
        )}

        {post.imageUrls?.length > 0 && (
          <div
            className={`social-post-card__gallery social-post-card__gallery--${Math.min(post.imageUrls.length, 6)}`}>
            {post.imageUrls.slice(0, 6).map((url, idx) => (
              <img
                key={`${url}-${idx}`}
                src={url}
                alt=""
                className="social-post-card__img"
              />
            ))}
          </div>
        )}

        {locationInfo && (
          <div className="social-post-card__location">
            <FaMapMarkerAlt className="social-post-card__locationIcon" />
            <span className="social-post-card__locationLink">
              {locationInfo}
            </span>
          </div>
        )}

        {post.shareSlug && (
          <div className="social-post-card__trip">
            <Link
              to={`/trip/${post.shareSlug}`}
              className="social-post-card__tripLink">
              <FaExpand />
              {t("social.feed.openSharedTrip", {
                defaultValue: "Open shared trip",
              })}
            </Link>
          </div>
        )}

        <footer className="social-post-card__footer">
          <button
            type="button"
            className={`social-post-card__action ${liked ? "social-post-card__action--liked" : ""}`}
            onClick={() => void handleLike()}
            aria-pressed={liked}>
            {liked ? (
              <FaHeart className="social-post-card__heartIcon" />
            ) : (
              <FiHeart className="social-post-card__heartIcon" />
            )}
            <span>{likeCount}</span>
          </button>
          <button
            type="button"
            className="social-post-card__action"
            aria-label={t("social.feed.comments", {
              defaultValue: "Comments",
            })}>
            <FiMessageCircle />
            <span>{comments.length}</span>
          </button>
          <button
            type="button"
            className="social-post-card__action"
            aria-label={t("social.feed.actions.share", {
              defaultValue: "Share",
            })}>
            <FiShare2 />
            <span>
              {t("social.feed.actions.share", { defaultValue: "Share" })}
            </span>
          </button>
        </footer>
      </article>

      <article className="post-detail-comments">
        <h3>
          {t("social.postDetail.commentsTitle", { defaultValue: "Comments" })} (
          {comments.length})
        </h3>

        {loadingComments ? (
          <div className="social-loading">
            {t("social.postDetail.loading", { defaultValue: "Loading..." })}
          </div>
        ) : comments.length === 0 ? (
          <p className="social-empty">
            {t("social.postDetail.commentsEmpty", {
              defaultValue: "No comments yet. Be the first!",
            })}
          </p>
        ) : (
          <div className="social-comments-list">
            {comments.map((comment) => {
              const author = comment.author || null;
              const avatarUrl = author
                ? getResolvedAvatarUrl(author) || author.avatarUrl || null
                : null;
              const name =
                comment.authorName?.trim() ||
                author?.username?.trim() ||
                `${author?.firstName ?? ""} ${author?.lastName ?? ""}`.trim() ||
                "Traveler";
              const initial = name.charAt(0).toUpperCase();
              return (
                <div key={comment.id} className="social-comment-item">
                  <div className="social-post-card__avatar">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="social-post-card__avatarImg"
                        onError={handleAvatarImageError}
                      />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="social-comment-content">
                    <div className="social-comment-header">
                      <strong>{name}</strong>
                      <span>{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <p>{comment.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isAuthenticated ? (
          <div className="social-composer-input">
            <div className="social-post-card__avatar">
              {getResolvedAvatarUrl(user) ? (
                <img
                  src={getResolvedAvatarUrl(user)}
                  alt=""
                  className="social-post-card__avatarImg"
                  onError={handleAvatarImageError}
                />
              ) : (
                (user?.username || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div className="social-composer-textarea">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t("social.postDetail.commentPlaceholder", {
                  defaultValue: "Write a comment...",
                })}
                rows={2}
              />
              <button
                type="button"
                className="social-composer-submit"
                onClick={handleAddComment}
                disabled={!commentText.trim()}>
                <FaPaperPlane />
              </button>
            </div>
          </div>
        ) : (
          <p className="social-empty">
            {t("common.loginFirst", { defaultValue: "Please login first" })}
          </p>
        )}
      </article>
    </div>
  );
};

export default SocialPostDetail;
