import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/core/utils/errors";
import { useAuth } from "@/core/providers/AuthContext";
import { reviewsService } from "@/modules/public/api/reviews";
import "./FeedbackSection.css";






const sortByDateAsc = (rows) =>
[...rows].sort(
  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
);

const FeedbackSection = ({ target, targetId }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoadError, setReviewsLoadError] = useState(false);
  const [commentsLoadError, setCommentsLoadError] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [composeMode, setComposeMode] = useState("review");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewsResult, commentsResult] = await Promise.allSettled([
      target === "place" ?
      reviewsService.getPlaceReviews(targetId) :
      reviewsService.getEventReviews(targetId),
      target === "place" ?
      reviewsService.getPlaceComments(targetId) :
      reviewsService.getEventComments(targetId)]
      );
      if (reviewsResult.status === "fulfilled") {
        setReviews(Array.isArray(reviewsResult.value) ? reviewsResult.value : []);
        setReviewsLoadError(false);
      } else {
        setReviews([]);
        setReviewsLoadError(true);
      }

      if (commentsResult.status === "fulfilled") {
        setComments(Array.isArray(commentsResult.value) ? sortByDateAsc(commentsResult.value) : []);
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

  const commentTree = useMemo(() => {
    const byParent = new Map();
    comments.forEach((item) => {
      const key = item.parentId ?? "root";
      const group = byParent.get(key) ?? [];
      group.push(item);
      byParent.set(key, group);
    });
    return byParent;
  }, [comments]);

  const submitReview = async () => {
    if (!isAuthenticated) return;
    try {
      setSubmitting(true);
      await reviewsService.createReview({
        ...(target === "place" ? { place: targetId } : { event: targetId }),
        rating,
        comment: reviewText || undefined
      });
      setReviewText("");
      toast.success(t("feedback.toasts.reviewSubmitted", { defaultValue: "Review submitted" }));
      await loadData();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("feedback.toasts.reviewFailed", { defaultValue: "Failed to submit review" })
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!isAuthenticated) return;
    if (!commentText.trim()) return;
    try {
      setSubmitting(true);
      if (target === "place") {
        await reviewsService.createPlaceComment(targetId, {
          content: commentText.trim(),
          parentId: replyTo ?? undefined
        });
      } else {
        await reviewsService.createEventComment(targetId, {
          content: commentText.trim(),
          parentId: replyTo ?? undefined
        });
      }
      setCommentText("");
      setReplyTo(null);
      toast.success(t("feedback.toasts.commentSubmitted", { defaultValue: "Comment submitted" }));
      await loadData();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("feedback.toasts.commentFailed", { defaultValue: "Failed to submit comment" })
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderThread = (parentId, depth = 0) => {
    const key = parentId ?? "root";
    const rows = commentTree.get(key) ?? [];
    return rows.map((item) =>
    <div
      key={item.id}
      className="feedback-comment-item"
      style={{ marginInlineStart: `${Math.min(depth * 20, 60)}px` }}>
      
        <div className="feedback-comment-meta">
          <strong>{item.user?.username ?? item.user?.email ?? "User"}</strong>
          <span>{new Date(item.createdAt).toLocaleString()}</span>
        </div>
        <p>{item.content}</p>
        {isAuthenticated &&
      <button
        type="button"
        className="feedback-inline-btn"
        onClick={() => setReplyTo(item.id)}>
        
            Reply
          </button>
      }
        {renderThread(item.id, depth + 1)}
      </div>
    );
  };

  return (
    <section className="feedback-section">
      <h2>{t("feedback.title", { defaultValue: "Reviews & Comments" })}</h2>

      {loading ?
      <p className="feedback-cta">
          {t("feedback.loading", { defaultValue: "Loading reviews and comments..." })}
        </p> :
      null}

      {!isAuthenticated ?
      <p className="feedback-cta">
          {t("feedback.loginCtaPrefix", { defaultValue: "Please" })}{" "}
          <Link to="/login">{t("feedback.loginLink", { defaultValue: "login" })}</Link>{" "}
          {t("feedback.loginCtaSuffix", {
          defaultValue: "to add reviews and comments."
        })}
        </p> :

      <div className="feedback-compose-grid">
          <div className="feedback-card">
            <div className="feedback-actions">
              <button
              type="button"
              className={composeMode === "review" ? "feedback-mode-btn is-active" : "feedback-mode-btn"}
              onClick={() => setComposeMode("review")}>
                {t("feedback.compose.reviewMode", { defaultValue: "Write Review" })}
              </button>
              <button
              type="button"
              className={composeMode === "comment" ? "feedback-mode-btn is-active" : "feedback-mode-btn"}
              onClick={() => setComposeMode("comment")}>
                {t("feedback.compose.commentMode", { defaultValue: "Write Comment" })}
              </button>
            </div>

            {composeMode === "review" ?
          <>
                <h3>{t("feedback.compose.addReview", { defaultValue: "Add Review" })}</h3>
                <label htmlFor="rating">{t("feedback.compose.rating", { defaultValue: "Rating" })}</label>
                <input
              id="rating"
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))} />
            
                <label htmlFor="review-text">
                  {t("feedback.compose.commentOptional", { defaultValue: "Comment (optional)" })}
                </label>
                <textarea
              id="review-text"
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)} />
            
                <button type="button" onClick={() => void submitReview()} disabled={submitting}>
                  {t("feedback.compose.submitReview", { defaultValue: "Submit Review" })}
                </button>
              </> :

          <>
                <h3>
                  {replyTo ?
              t("feedback.compose.replyToComment", { defaultValue: "Reply to Comment" }) :
              t("feedback.compose.addComment", { defaultValue: "Add Comment" })}
                </h3>
                <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)} />
            
                <div className="feedback-actions">
                  <button type="button" onClick={() => void submitComment()} disabled={submitting}>
                    {t("feedback.compose.submitComment", { defaultValue: "Submit Comment" })}
                  </button>
                  {replyTo &&
              <button type="button" className="feedback-cancel-btn" onClick={() => setReplyTo(null)}>
                      {t("feedback.compose.cancelReply", { defaultValue: "Cancel Reply" })}
                    </button>
              }
                </div>
              </>
          }
          </div>
        </div>
      }

      <div className="feedback-lists">
        <div className="feedback-list-card">
          <h3>{t("feedback.lists.reviewsTitle", { defaultValue: "Reviews" })}</h3>
          {reviewsLoadError ?
          <p className="feedback-error-note">
              {t("feedback.errors.reviewsLoad", {
              defaultValue: "Failed to load reviews right now. Please try again in a bit."
            })}
            </p> :
          null}
          {reviews.length === 0 ?
          <p>{t("feedback.lists.reviewsEmpty", { defaultValue: "No reviews yet." })}</p> :

          reviews.map((item) =>
          <div key={item.id} className="feedback-review-item">
                <div className="feedback-comment-meta">
                  <strong>{item.user?.username ?? item.user?.email ?? "User"}</strong>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p>Rating: {item.rating}/5</p>
                {item.comment && <p>{item.comment}</p>}
              </div>
          )
          }
        </div>
        <div className="feedback-list-card">
          <h3>{t("feedback.lists.commentsTitle", { defaultValue: "Comments" })}</h3>
          {commentsLoadError ?
          <p className="feedback-error-note">
              {t("feedback.errors.commentsLoad", {
              defaultValue: "Failed to load comments right now. Please try again in a bit."
            })}
            </p> :
          null}
          {comments.length === 0 ?
          <p>{t("feedback.lists.commentsEmpty", { defaultValue: "No comments yet." })}</p> :

          renderThread(null)
          }
        </div>
      </div>
    </section>);

};

export default FeedbackSection;