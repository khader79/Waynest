import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import { useAuth } from "@/context/AuthContext";
import { reviewsService } from "@/api/reviews";
import "./FeedbackSection.css";

const toEpoch = (value) => {
  const epoch = new Date(value ?? "").getTime();
  return Number.isFinite(epoch) ? epoch : 0;
};

const sortByDateDesc = (rows) =>
  [...rows].sort((a, b) => toEpoch(b.createdAt) - toEpoch(a.createdAt));

const getUserLabel = (user) => user?.username ?? user?.email ?? "User";

const renderRatingStars = (rating) => {
  const normalized = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return `${"★".repeat(normalized)}${"☆".repeat(5 - normalized)}`;
};

const FeedbackSection = ({ target, targetId }) => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoadError, setReviewsLoadError] = useState(false);
  const [commentsLoadError, setCommentsLoadError] = useState(false);
  const [rating, setRating] = useState(0);
  const [composeText, setComposeText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewsResult, commentsResult] = await Promise.allSettled([
        target === "place"
          ? reviewsService.getPlaceReviews(targetId)
          : reviewsService.getEventReviews(targetId),
        target === "place"
          ? reviewsService.getPlaceComments(targetId)
          : reviewsService.getEventComments(targetId),
      ]);
      if (reviewsResult.status === "fulfilled") {
        setReviews(
          Array.isArray(reviewsResult.value) ? reviewsResult.value : [],
        );
        setReviewsLoadError(false);
      } else {
        setReviews([]);
        setReviewsLoadError(true);
      }

      if (commentsResult.status === "fulfilled") {
        setComments(
          Array.isArray(commentsResult.value)
            ? sortByDateDesc(commentsResult.value)
            : [],
        );
        setCommentsLoadError(false);
      } else {
        setComments([]);
        setCommentsLoadError(true);
      }
    } catch {
      setReviews([]);
      setComments([]);
      setReviewsLoadError(true);
      setCommentsLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [target, targetId]);

  const commentsById = useMemo(() => {
    const map = new Map();
    comments.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [comments]);

  const averageRating = useMemo(() => {
    if (!reviews.length) {
      return 0;
    }
    const total = reviews.reduce(
      (sum, item) => sum + (Number(item.rating) || 0),
      0,
    );
    return total / reviews.length;
  }, [reviews]);

  const myReview = useMemo(() => {
    if (!user?.id) {
      return null;
    }

    return reviews.find((item) => item?.user?.id === user.id) ?? null;
  }, [reviews, user?.id]);

  const activityFeed = useMemo(() => {
    const reviewItems = reviews.map((item) => ({
      id: `review-${item.id}`,
      kind: "review",
      rawId: item.id,
      createdAt: item.createdAt,
      user: item.user,
      rating: Number(item.rating) || 0,
      content:
        typeof item.comment === "string" && item.comment.trim()
          ? item.comment.trim()
          : "",
      parentId: null,
    }));

    const commentItems = comments.map((item) => ({
      id: `comment-${item.id}`,
      kind: "comment",
      rawId: item.id,
      createdAt: item.createdAt,
      user: item.user,
      rating: null,
      content:
        typeof item.content === "string" && item.content.trim()
          ? item.content.trim()
          : "",
      parentId: item.parentId ?? null,
    }));

    return [...reviewItems, ...commentItems].sort(
      (a, b) => toEpoch(b.createdAt) - toEpoch(a.createdAt),
    );
  }, [reviews, comments]);

  const replyTargetLabel = useMemo(() => {
    if (!replyTo) {
      return null;
    }
    const parent = commentsById.get(replyTo);
    return parent ? getUserLabel(parent.user) : null;
  }, [commentsById, replyTo]);

  const postComment = async ({ content, parentId }) => {
    if (target === "place") {
      await reviewsService.createPlaceComment(targetId, {
        content,
        parentId,
      });
      return;
    }

    await reviewsService.createEventComment(targetId, {
      content,
      parentId,
    });
  };

  const submitRating = async () => {
    if (!isAuthenticated) {
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.info(
        t("feedback.toasts.ratingRequired", {
          defaultValue: "Pick a rating between 1 and 5.",
        }),
      );
      return;
    }

    try {
      setSubmitting(true);
      await reviewsService.createReview({
        ...(target === "place" ? { place: targetId } : { event: targetId }),
        rating,
      });
      toast.success(
        t("feedback.toasts.reviewSubmitted", {
          defaultValue: "Rating saved",
        }),
      );
      await loadData();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("feedback.toasts.reviewFailed", {
            defaultValue: "Failed to save rating",
          }),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!isAuthenticated) {
      return;
    }

    const text = composeText.trim();
    if (!text) {
      toast.info(
        t("feedback.toasts.commentRequired", {
          defaultValue: "Write a comment first.",
        }),
      );
      return;
    }

    try {
      setSubmitting(true);
      await postComment({
        content: text,
        parentId: replyTo ?? undefined,
      });
      setComposeText("");
      setReplyTo(null);
      toast.success(
        t("feedback.toasts.commentSubmitted", {
          defaultValue: "Comment submitted",
        }),
      );
      await loadData();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("feedback.toasts.commentFailed", {
            defaultValue: "Failed to submit comment",
          }),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onClickReply = (commentId) => {
    setReplyTo(commentId);
    setRating(0);
  };

  return (
    <section className="feedback-section">
      <header className="feedback-header">
        <div>
          <h2>
            {t("feedback.title", {
              defaultValue: "Community feedback",
            })}
          </h2>
          <p className="feedback-header-sub">
            {t("feedback.subtitle", {
              defaultValue:
                "Ratings and comments in one stream so you can follow everything quickly.",
            })}
          </p>
        </div>

        <div className="feedback-stats" aria-label="Feedback stats">
          <div className="feedback-stat-pill">
            <span>
              {t("feedback.stats.average", { defaultValue: "Average" })}
            </span>
            <strong>
              {reviews.length ? `${averageRating.toFixed(1)} / 5` : "-"}
            </strong>
          </div>
          <div className="feedback-stat-pill">
            <span>
              {t("feedback.lists.reviewsTitle", { defaultValue: "Reviews" })}
            </span>
            <strong>{reviews.length}</strong>
          </div>
          <div className="feedback-stat-pill">
            <span>
              {t("feedback.lists.commentsTitle", { defaultValue: "Comments" })}
            </span>
            <strong>{comments.length}</strong>
          </div>
        </div>
      </header>

      {loading ? (
        <p className="feedback-cta">
          {t("feedback.loading", {
            defaultValue: "Loading reviews and comments...",
          })}
        </p>
      ) : null}

      {!isAuthenticated ? (
        <p className="feedback-cta">
          {t("feedback.loginCtaPrefix", { defaultValue: "Please" })}{" "}
          <Link to="/login">
            {t("feedback.loginLink", { defaultValue: "login" })}
          </Link>{" "}
          {t("feedback.loginCtaSuffix", {
            defaultValue: "to add reviews and comments.",
          })}
        </p>
      ) : (
        <div className="feedback-compose-grid">
          <div className="feedback-card">
            <h3>
              {t("feedback.compose.shareFeedback", {
                defaultValue: "Share your feedback",
              })}
            </h3>

            <div className="feedback-compose-split">
              <section className="feedback-subcard feedback-subcard--rating">
                <h4>
                  {t("feedback.compose.rateOnly", {
                    defaultValue: "Rate this place",
                  })}
                </h4>

                {myReview ? (
                  <p className="feedback-reply-target">
                    {t("feedback.compose.yourCurrentRating", {
                      defaultValue: "Your current rating",
                    })}
                    : {Number(myReview.rating ?? 0).toFixed(1)} / 5
                  </p>
                ) : null}

                <div className="feedback-rating-row">
                  <span className="feedback-rating-label">
                    {t("feedback.compose.rating", {
                      defaultValue: "Rating",
                    })}
                  </span>

                  <div
                    className="feedback-rating-stars"
                    role="group"
                    aria-label="Rating selector">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`feedback-rating-star${rating >= value ? " is-active" : ""}`}
                        aria-label={`Set rating ${value} out of 5`}
                        aria-pressed={rating === value}
                        disabled={submitting}
                        onClick={() =>
                          setRating((current) =>
                            current === value ? 0 : value,
                          )
                        }>
                        ★
                      </button>
                    ))}
                  </div>

                  {rating > 0 ? (
                    <button
                      type="button"
                      className="feedback-rating-clear"
                      disabled={submitting}
                      onClick={() => setRating(0)}>
                      {t("feedback.compose.clearRating", {
                        defaultValue: "Clear rating",
                      })}
                    </button>
                  ) : null}
                </div>

                <div className="feedback-actions">
                  <button
                    type="button"
                    onClick={() => void submitRating()}
                    disabled={submitting}>
                    {myReview
                      ? t("feedback.compose.updateRating", {
                          defaultValue: "Update Rating",
                        })
                      : t("feedback.compose.submitReview", {
                          defaultValue: "Submit Rating",
                        })}
                  </button>
                </div>

                <p className="feedback-composer-hint">
                  {t("feedback.compose.ratingOnlyHint", {
                    defaultValue:
                      "Rating is saved on its own. Comments are posted separately below.",
                  })}
                </p>
              </section>

              <section className="feedback-subcard feedback-subcard--comment">
                <h4>
                  {replyTo
                    ? t("feedback.compose.replyToComment", {
                        defaultValue: "Reply to comment",
                      })
                    : t("feedback.compose.addComment", {
                        defaultValue: "Add a comment",
                      })}
                </h4>

                {replyTo ? (
                  <p className="feedback-reply-target">
                    {t("feedback.compose.replyingTo", {
                      defaultValue: "Replying to",
                    })}
                    : {replyTargetLabel ?? "User"}
                  </p>
                ) : null}

                <textarea
                  rows={4}
                  value={composeText}
                  onChange={(event) => setComposeText(event.target.value)}
                  placeholder={
                    replyTo
                      ? t("feedback.compose.replyPlaceholder", {
                          defaultValue: "Write your reply...",
                        })
                      : t("feedback.compose.commentPlaceholder", {
                          defaultValue: "Write a helpful comment...",
                        })
                  }
                />

                <div className="feedback-actions">
                  <button
                    type="button"
                    onClick={() => void submitComment()}
                    disabled={submitting}>
                    {replyTo
                      ? t("feedback.compose.submitReply", {
                          defaultValue: "Submit Reply",
                        })
                      : t("feedback.compose.submitComment", {
                          defaultValue: "Submit Comment",
                        })}
                  </button>
                  {replyTo ? (
                    <button
                      type="button"
                      className="feedback-cancel-btn"
                      onClick={() => setReplyTo(null)}>
                      {t("feedback.compose.cancelReply", {
                        defaultValue: "Cancel Reply",
                      })}
                    </button>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <div className="feedback-feed-card">
        <h3>
          {t("feedback.feed.latest", {
            defaultValue: "Latest activity",
          })}
        </h3>

        {reviewsLoadError ? (
          <p className="feedback-error-note">
            {t("feedback.errors.reviewsLoad", {
              defaultValue:
                "Failed to load reviews right now. Please try again in a bit.",
            })}
          </p>
        ) : null}

        {commentsLoadError ? (
          <p className="feedback-error-note">
            {t("feedback.errors.commentsLoad", {
              defaultValue:
                "Failed to load comments right now. Please try again in a bit.",
            })}
          </p>
        ) : null}

        {activityFeed.length === 0 ? (
          <p>
            {t("feedback.feed.empty", {
              defaultValue: "No reviews or comments yet.",
            })}
          </p>
        ) : (
          <div className="feedback-feed-list">
            {activityFeed.map((item) => {
              const parent =
                item.kind === "comment" && item.parentId
                  ? commentsById.get(item.parentId)
                  : null;

              return (
                <article key={item.id} className="feedback-feed-item">
                  <div className="feedback-feed-head">
                    <strong>{getUserLabel(item.user)}</strong>
                    <span
                      className={`feedback-kind-pill${item.kind === "review" ? " feedback-kind-pill--review" : ""}`}>
                      {item.kind === "review"
                        ? t("feedback.feed.review", { defaultValue: "Review" })
                        : t("feedback.feed.comment", {
                            defaultValue: "Comment",
                          })}
                    </span>
                  </div>

                  <p className="feedback-feed-meta">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>

                  {item.kind === "review" ? (
                    <>
                      <p className="feedback-review-stars">
                        {renderRatingStars(item.rating)}
                        <span>{`${Number(item.rating).toFixed(1)} / 5`}</span>
                      </p>
                      <p className="feedback-feed-text feedback-feed-text--muted">
                        {t("feedback.feed.ratingOnly", {
                          defaultValue: "Rating only",
                        })}
                      </p>
                    </>
                  ) : (
                    <>
                      {parent ? (
                        <p className="feedback-reply-context">
                          {t("feedback.feed.replyingTo", {
                            defaultValue: "Replying to",
                          })}
                          : {getUserLabel(parent.user)}
                        </p>
                      ) : null}
                      <p className="feedback-feed-text">
                        {item.content ||
                          t("feedback.feed.commentEmpty", {
                            defaultValue: "Comment added.",
                          })}
                      </p>
                      {isAuthenticated ? (
                        <button
                          type="button"
                          className="feedback-inline-btn"
                          onClick={() => onClickReply(item.rawId)}>
                          {t("feedback.compose.replyToComment", {
                            defaultValue: "Reply",
                          })}
                        </button>
                      ) : null}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeedbackSection;
