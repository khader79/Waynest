import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/core/providers/AuthContext";
import { reviewsService, type CommentRecord, type ReviewRecord } from "@/services/reviews/reviews.service";
import "./FeedbackSection.css";

type Props = {
  target: "place" | "event";
  targetId: string;
};

const sortByDateAsc = <T extends { createdAt: string }>(rows: T[]) =>
  [...rows].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

const FeedbackSection = ({ target, targetId }: Props) => {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [nextReviews, nextComments] = await Promise.all([
        target === "place"
          ? reviewsService.getPlaceReviews(targetId)
          : reviewsService.getEventReviews(targetId),
        target === "place"
          ? reviewsService.getPlaceComments(targetId)
          : reviewsService.getEventComments(targetId),
      ]);
      setReviews(Array.isArray(nextReviews) ? nextReviews : []);
      setComments(Array.isArray(nextComments) ? sortByDateAsc(nextComments) : []);
    } catch {
      toast.error("Failed to load reviews and comments");
    }
  };

  useEffect(() => {
    void loadData();
  }, [target, targetId]);

  const commentTree = useMemo(() => {
    const byParent = new Map<string, CommentRecord[]>();
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
        comment: reviewText || undefined,
      });
      setReviewText("");
      toast.success("Review submitted for approval");
    } catch {
      toast.error("Failed to submit review");
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
          parentId: replyTo ?? undefined,
        });
      } else {
        await reviewsService.createEventComment(targetId, {
          content: commentText.trim(),
          parentId: replyTo ?? undefined,
        });
      }
      setCommentText("");
      setReplyTo(null);
      toast.success("Comment submitted for approval");
    } catch {
      toast.error("Failed to submit comment");
    } finally {
      setSubmitting(false);
    }
  };

  const renderThread = (parentId: string | null, depth = 0): ReactNode[] => {
    const key = parentId ?? "root";
    const rows = commentTree.get(key) ?? [];
    return rows.map((item) => (
      <div
        key={item.id}
        className="feedback-comment-item"
        style={{ marginInlineStart: `${Math.min(depth * 20, 60)}px` }}
      >
        <div className="feedback-comment-meta">
          <strong>{item.user?.username ?? item.user?.email ?? "User"}</strong>
          <span>{new Date(item.createdAt).toLocaleString()}</span>
        </div>
        <p>{item.content}</p>
        {isAuthenticated && (
          <button
            type="button"
            className="feedback-inline-btn"
            onClick={() => setReplyTo(item.id)}
          >
            Reply
          </button>
        )}
        {renderThread(item.id, depth + 1)}
      </div>
    ));
  };

  return (
    <section className="feedback-section">
      <h2>Reviews & Comments</h2>

      {!isAuthenticated ? (
        <p className="feedback-cta">
          Please <Link to="/login">login</Link> to add reviews and comments.
        </p>
      ) : (
        <div className="feedback-compose-grid">
          <div className="feedback-card">
            <h3>Add Review</h3>
            <label htmlFor="rating">Rating</label>
            <input
              id="rating"
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
            />
            <label htmlFor="review-text">Comment (optional)</label>
            <textarea
              id="review-text"
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
            />
            <button type="button" onClick={() => void submitReview()} disabled={submitting}>
              Submit Review
            </button>
          </div>

          <div className="feedback-card">
            <h3>{replyTo ? "Reply to Comment" : "Add Comment"}</h3>
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
            />
            <div className="feedback-actions">
              <button type="button" onClick={() => void submitComment()} disabled={submitting}>
                Submit Comment
              </button>
              {replyTo && (
                <button type="button" onClick={() => setReplyTo(null)}>
                  Cancel Reply
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="feedback-lists">
        <div className="feedback-list-card">
          <h3>Approved Reviews</h3>
          {reviews.length === 0 ? (
            <p>No approved reviews yet.</p>
          ) : (
            reviews.map((item) => (
              <div key={item.id} className="feedback-review-item">
                <div className="feedback-comment-meta">
                  <strong>{item.user?.username ?? item.user?.email ?? "User"}</strong>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p>Rating: {item.rating}/5</p>
                {item.comment && <p>{item.comment}</p>}
              </div>
            ))
          )}
        </div>
        <div className="feedback-list-card">
          <h3>Approved Comments</h3>
          {comments.length === 0 ? <p>No approved comments yet.</p> : renderThread(null)}
        </div>
      </div>
    </section>
  );
};

export default FeedbackSection;

