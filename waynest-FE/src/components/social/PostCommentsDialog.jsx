import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiX } from "react-icons/fi";
import { toast } from "react-toastify";

import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/utils/errors";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import {
  createPostComment,
  fetchPostComments,
} from "@/services/social/social.service";

import "./PostCommentsDialog.css";

const PostCommentsDialog = ({
  isOpen,
  onClose,
  postId,
  postTitle,
  onCommentsLoaded,
}) => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");

  const resolveCommentAuthor = (comment) => {
    const author = comment.author || comment.authorObject || null;
    if (author && typeof author === "object") {
      const name =
        author.username?.trim() ||
        `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() ||
        null;
      const avatarUrl = getResolvedAvatarUrl(author);
      const initial =
        (author.username?.trim()?.charAt(0) ||
         (author.firstName || author.fullName || "U")?.trim()?.charAt(0) ||
         "U").toUpperCase();
      return { name, avatarUrl, initial };
    }

    const flatName = comment.authorName?.trim() || null;
    if (flatName) {
      const initial = flatName.charAt(0).toUpperCase();
      return { name: flatName, avatarUrl: null, initial };
    }
    return null;
  };

  const loadComments = useCallback(async () => {
    if (!postId) {
      return;
    }
    setLoading(true);
    try {
      const list = await fetchPostComments(postId);
      const rows = Array.isArray(list) ? list : [];
      setComments(rows);
      onCommentsLoaded?.(rows.length);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.comments.loadFailed", {
            defaultValue: "Could not load comments",
          }),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [postId, t, onCommentsLoaded]);

  useEffect(() => {
    if (isOpen && postId) {
      void loadComments();
      setText("");
    }
  }, [isOpen, postId, loadComments]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const authorLabel = (author) => {
    if (!author || typeof author !== "object") {
      return t("social.feed.traveler", { defaultValue: "Traveler" });
    }
    const u = author.username?.trim();
    if (u) {
      return u;
    }
    const name = `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim();
    return name || t("social.feed.traveler", { defaultValue: "Traveler" });
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || !isAuthenticated) {
      return;
    }
    setSubmitting(true);
    try {
      const saved = await createPostComment(postId, { content: trimmed });
      setText("");
      const author = user
        ? {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl ?? null,
            avatar: user.avatar ?? null,
          }
        : null;
      setComments((current) => {
        const next = [...current, author ? { ...saved, author } : saved];
        onCommentsLoaded?.(next.length);
        return next;
      });
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.postDetail.addCommentFailed", {
            defaultValue: "Failed to add comment",
          }),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderCommentAvatar = (comment) => {
    const resolved = resolveCommentAuthor(comment);
    if (!resolved) {
      return (
        <div className="pcd-avatar pcd-avatar--fallback">
          <span>U</span>
        </div>
      );
    }
    if (resolved.avatarUrl) {
      return (
        <div className="pcd-avatar">
          <img
            src={resolved.avatarUrl}
            alt=""
            className="pcd-avatar__img"
            onError={handleAvatarImageError}
          />
        </div>
      );
    }
    return (
      <div className="pcd-avatar pcd-avatar--initial">
        <span>{resolved.initial}</span>
      </div>
    );
  };

  const dialog = (
    <div
      className="post-comments-dialog__backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="post-comments-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-comments-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="post-comments-dialog__header">
          <h2
            id="post-comments-dialog-title"
            className="post-comments-dialog__title"
          >
            {postTitle?.trim()
              ? postTitle.trim()
              : t("social.postDetail.commentsTitle", {
                  defaultValue: "Comments",
                })}
          </h2>
          <button
            type="button"
            className="post-comments-dialog__close"
            onClick={onClose}
            aria-label={t("common.close", { defaultValue: "Close" })}
          >
            <FiX aria-hidden />
          </button>
        </header>

        <div className="post-comments-dialog__body">
          {loading ? (
            <p className="post-comments-dialog__muted">
              {t("social.comments.loading", {
                defaultValue: "Loading comments…",
              })}
            </p>
          ) : comments.length === 0 ? (
            <p className="post-comments-dialog__muted">
              {t("social.postDetail.commentsEmpty", {
                defaultValue: "No comments yet.",
              })}
            </p>
          ) : (
            <ul className="post-comments-dialog__list">
              {comments.map((comment) => {
                const resolved = resolveCommentAuthor(comment);
                const displayName = resolved?.name || "Traveler";
                return (
                  <li key={comment.id} className="pcd-item">
                    {renderCommentAvatar(comment)}
                    <div className="pcd-item__body">
                      <div className="pcd-item__header">
                        <span className="pcd-item__author">
                          {displayName}
                        </span>
                        <time dateTime={comment.createdAt}>
                          {new Date(comment.createdAt).toLocaleString(
                            i18n.language,
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            },
                          )}
                        </time>
                      </div>
                      <p className="pcd-item__content">{comment.content}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {isAuthenticated ? (
          <div className="post-comments-dialog__compose">
            <div className="pcd-compose-row">
              {user && (
                <div className="pcd-compose-avatar">
                  {getResolvedAvatarUrl(user) ? (
                    <img
                      src={getResolvedAvatarUrl(user)}
                      alt=""
                      className="pcd-avatar__img"
                      onError={handleAvatarImageError}
                    />
                  ) : (
                    <span>
                      {(user.username || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              )}
              <textarea
                className="post-comments-dialog__textarea"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t("social.postDetail.commentPlaceholder", {
                  defaultValue: "Add a comment…",
                })}
                rows={2}
              />
            </div>
            <button
              type="button"
              className="post-comments-dialog__submit"
              onClick={() => void handleSubmit()}
              disabled={submitting || !text.trim()}
            >
              {submitting
                ? t("social.comments.sending", { defaultValue: "Sending…" })
                : t("social.postDetail.addComment", {
                    defaultValue: "Comment",
                  })}
            </button>
          </div>
        ) : (
          <p className="post-comments-dialog__loginHint">
            {t("social.comments.loginToComment", {
              defaultValue: "Sign in to add a comment.",
            })}
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default PostCommentsDialog;
