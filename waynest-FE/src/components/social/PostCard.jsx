import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  FiBookmark,
  FiEdit2,
  FiExternalLink,
  FiHeart,
  FiMapPin,
  FiMessageCircle,
  FiShare2,
  FiTrash2,
} from "react-icons/fi";

import { copyTextToClipboard } from "@/utils/clipboard";
import { DEFAULT_AVATAR_SRC } from "@/utils/avatar";
import { getApiErrorMessage } from "@/utils/errors";
import { resolveMediaUrl } from "@/utils/mediaUrl";

import PostCommentsDialog from "./PostCommentsDialog";
import "./PostCard.css";

function formatPostDate(iso, locale) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

function parsePostLocation(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const raw = snapshot.location;
  if (!raw || typeof raw !== "object") return null;
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (!label) return null;
  const lat = typeof raw.lat === "number" && Number.isFinite(raw.lat) ? raw.lat : null;
  const lng = typeof raw.lng === "number" && Number.isFinite(raw.lng) ? raw.lng : null;
  const slug = typeof raw.slug === "string" && raw.slug.trim() ? raw.slug.trim() : null;
  const mapsUrl =
    lat != null && lng != null
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=14`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
  const placePath = slug ? `/places/${encodeURIComponent(slug)}` : null;
  return { label, mapsUrl, placePath };
}

const PostCard = ({
  post,
  isAuthenticated,
  toggleSocialLike,
  saveSocialPost,
  unsaveSocialPost,
  actorId,
  onDeletePost,
  onUpdatePost,
}) => {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(post.title ?? "");
  const [draftBody, setDraftBody] = useState(post.body ?? "");
  const [likeCount, setLikeCount] = useState(post.likeCount ?? post._count?.likes ?? 0);
  const [likedByMe, setLikedByMe] = useState(Boolean(post.likedByMe));
  const [savedByMe, setSavedByMe] = useState(Boolean(post.savedByMe));
  const [savingPost, setSavingPost] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? post._count?.comments ?? 0);

  useEffect(() => {
    setLikeCount(post.likeCount ?? post._count?.likes ?? 0);
    setLikedByMe(Boolean(post.likedByMe));
    setSavedByMe(Boolean(post.savedByMe));
    setCommentCount(post.commentCount ?? post._count?.comments ?? 0);
  }, [post.id, post.likeCount, post.likedByMe, post.savedByMe, post.commentCount]);

  const authorHref = post.author?.username
    ? `/u/${encodeURIComponent(post.author.username)}`
    : `/social/users/${encodeURIComponent(post.authorId)}`;
  const authorName =
    post.author?.username ?? t("social.feed.traveler", { defaultValue: "Traveler" });
  const authorInitial = authorName.trim().charAt(0).toUpperCase() || "T";
  const avatarUrl =
    typeof post.author?.avatarUrl === "string" && post.author.avatarUrl.trim()
      ? resolveMediaUrl(post.author.avatarUrl)
      : null;

  const imageUrls = Array.isArray(post.imageUrls) ? post.imageUrls : [];
  const imageCount = Math.min(imageUrls.length, 6);
  const locationInfo = parsePostLocation(post.snapshot);

  const onLike = async () => {
    if (!isAuthenticated) {
      toast.info(t("social.feed.loginFirst", { defaultValue: "Please login first" }));
      return;
    }

    try {
      const result = await toggleSocialLike(post.id);
      setLikedByMe(result.liked);
      setLikeCount(typeof result.likeCount === "number" ? result.likeCount : likeCount);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, t("social.feed.likeFailed", { defaultValue: "Could not update like" })),
      );
    }
  };

  const onSave = async () => {
    if (!isAuthenticated) {
      toast.info(t("social.feed.loginFirst", { defaultValue: "Please login first" }));
      return;
    }

    if (savingPost) {
      return;
    }

    setSavingPost(true);
    try {
      if (savedByMe) {
        await unsaveSocialPost(post.id);
        setSavedByMe(false);
        toast.success(
          t("social.feed.removedFromSaved", { defaultValue: "Removed from saved" }),
        );
      } else {
        await saveSocialPost(post.id);
        setSavedByMe(true);
        toast.success(
          t("social.feed.savedToAccount", { defaultValue: "Saved to your account" }),
        );
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.feed.saveFailed", { defaultValue: "Could not update saved posts" }),
        ),
      );
    } finally {
      setSavingPost(false);
    }
  };

  const onShare = async () => {
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
    toast.success(t("social.feed.shareCopied", { defaultValue: "Trip link copied" }));
  };

  const isOwner = Boolean(actorId && post.authorId === actorId);

  return (
    <article className="social-post-card">
      <header className="social-post-card__header">
        <div className="social-post-card__author">
          <div className="social-post-card__avatar" aria-hidden="true">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="social-post-card__avatarImg"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = DEFAULT_AVATAR_SRC;
                }}
              />
            ) : (
              authorInitial
            )}
          </div>
          <div className="social-post-card__meta">
            <p className="social-post-card__name">
              <Link to={authorHref}>{authorName}</Link>
            </p>
            <p className="social-post-card__time">{formatPostDate(post.createdAt, i18n.language)}</p>
          </div>
        </div>
        {post.shareSlug ? (
          <span className="social-post-card__chip">
            {t("social.feed.sharedPlan", { defaultValue: "Shared itinerary" })}
          </span>
        ) : null}
      </header>

      {post.title || post.body ? (
        <div className="social-post-card__text">
          {post.title ? <h3 className="social-post-card__title">{post.title}</h3> : null}
          {post.body ? <p className="social-post-card__body">{post.body}</p> : null}
        </div>
      ) : null}

      {imageUrls.length > 0 ? (
        <div
          className={`social-post-card__gallery social-post-card__gallery--${imageCount}`}
          role="group"
          aria-label={t("social.feed.postImages", { defaultValue: "Post images" })}
        >
          {imageUrls.slice(0, 6).map((imageUrl, idx) => (
            <img
              key={`${imageUrl}-${idx}`}
              src={resolveMediaUrl(imageUrl)}
              alt=""
              className="social-post-card__img"
            />
          ))}
        </div>
      ) : null}

      {locationInfo ? (
        <div className="social-post-card__location">
          <FiMapPin aria-hidden className="social-post-card__locationIcon" />
          {locationInfo.placePath ? (
            <Link to={locationInfo.placePath} className="social-post-card__locationLink">
              {locationInfo.label}
            </Link>
          ) : (
            <a
              href={locationInfo.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-post-card__locationLink"
            >
              {locationInfo.label}
            </a>
          )}
        </div>
      ) : null}

      {editing ? (
        <div className="social-post-card__edit">
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder={t("social.feed.editTitle", { defaultValue: "Title" })}
          />
          <textarea
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            placeholder={t("social.feed.editBody", { defaultValue: "Body" })}
          />
          <button
            type="button"
            className="social-post-card__editSave"
            onClick={async () => {
              await onUpdatePost?.(post.id, {
                title: draftTitle.trim(),
                body: draftBody.trim(),
              });
              setEditing(false);
            }}
          >
            {t("social.feed.saveEdits", { defaultValue: "Save" })}
          </button>
        </div>
      ) : null}

      {post.shareSlug ? (
        <div className="social-post-card__trip">
          <Link to={`/trip/${encodeURIComponent(post.shareSlug)}`} className="social-post-card__tripLink">
            <FiExternalLink aria-hidden />
            {t("social.feed.openSharedTrip", { defaultValue: "Open shared trip" })}
          </Link>
        </div>
      ) : null}

      <footer className="social-post-card__footer">
        <button
          type="button"
          className={`social-post-card__action${likedByMe ? " social-post-card__action--liked" : ""}`}
          onClick={() => void onLike()}
          aria-pressed={likedByMe}
          aria-label={t("social.feed.actions.like", { defaultValue: "Like" })}
        >
          <FiHeart aria-hidden className="social-post-card__heartIcon" />
          <span>{likeCount}</span>
        </button>
        <button
          type="button"
          className={`social-post-card__action${savedByMe ? " social-post-card__action--saved" : ""}`}
          onClick={() => void onSave()}
          disabled={savingPost}
          aria-pressed={savedByMe}
          aria-label={
            savedByMe
              ? t("social.feed.actions.unsave", { defaultValue: "Remove from saved" })
              : t("social.feed.actions.save", { defaultValue: "Save" })
          }
        >
          <FiBookmark aria-hidden className="social-post-card__bookmarkIcon" />
          <span>
            {savedByMe
              ? t("social.feed.actions.saved", { defaultValue: "Saved" })
              : t("social.feed.actions.save", { defaultValue: "Save" })}
          </span>
        </button>
        <button
          type="button"
          className="social-post-card__action"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setCommentsOpen(true);
          }}
          aria-label={t("social.feed.comments", { defaultValue: "Comments" })}
        >
          <FiMessageCircle aria-hidden />
          <span>{commentCount}</span>
        </button>
        <button
          type="button"
          className="social-post-card__action"
          onClick={() => void onShare()}
          aria-label={t("social.feed.actions.share", { defaultValue: "Share" })}
        >
          <FiShare2 aria-hidden />
          <span>{t("social.feed.actions.share", { defaultValue: "Share" })}</span>
        </button>
        {isOwner ? (
          <>
            <button
              type="button"
              className="social-post-card__action"
              onClick={() => setEditing((current) => !current)}
              aria-label={editing ? t("social.feed.cancelEdit", { defaultValue: "Cancel" }) : t("social.feed.edit", { defaultValue: "Edit" })}
            >
              <FiEdit2 aria-hidden />
              <span>{editing ? t("social.feed.cancelEdit", { defaultValue: "Cancel" }) : t("social.feed.edit", { defaultValue: "Edit" })}</span>
            </button>
            <button
              type="button"
              className="social-post-card__action social-post-card__action--danger"
              onClick={() => void onDeletePost?.(post.id)}
              aria-label={t("social.feed.delete", { defaultValue: "Delete" })}
            >
              <FiTrash2 aria-hidden />
              <span>{t("social.feed.delete", { defaultValue: "Delete" })}</span>
            </button>
          </>
        ) : null}
      </footer>

      {commentsOpen ? (
        <PostCommentsDialog
          isOpen={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          postId={post.id}
          postTitle={post.title ?? ""}
          onCommentsLoaded={setCommentCount}
        />
      ) : null}
    </article>
  );
};

export default PostCard;
