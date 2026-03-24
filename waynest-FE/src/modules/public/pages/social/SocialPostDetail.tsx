import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/core/utils/errors";
import { createPostComment, fetchPostComments, fetchSocialPost } from "@/services/social/social.service";
import { useAuth } from "@/core/providers/AuthContext";
import "./SocialFeed.css";

const SocialPostDetail = () => {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const [post, setPost] = useState<Awaited<ReturnType<typeof fetchSocialPost>> | null>(null);
  const [comments, setComments] = useState<Array<{ id: string; content: string; createdAt: string }>>([]);
  const [commentText, setCommentText] = useState("");

  const load = async () => {
    try {
      const [nextPost, nextComments] = await Promise.all([
        fetchSocialPost(id),
        fetchPostComments(id),
      ]);
      setPost(nextPost);
      setComments(Array.isArray(nextComments) ? nextComments : []);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.postDetail.loadFailed", { defaultValue: "Failed to load post details" }),
        ),
      );
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  return (
    <section className="social-feed-page">
      {!post ? (
        <p className="social-loading">
          {t("social.postDetail.loading", { defaultValue: "Loading post..." })}
        </p>
      ) : (
        <article className="social-post-card">
          <h2>{post.title || t("social.postDetail.titleFallback", { defaultValue: "Post details" })}</h2>
          {post.body ? <p>{post.body}</p> : null}
        </article>
      )}

      <article className="social-composer">
        <h3>{t("social.postDetail.commentsTitle", { defaultValue: "Comments" })}</h3>
        {comments.length === 0 ? (
          <p className="social-empty">
            {t("social.postDetail.commentsEmpty", { defaultValue: "No comments yet." })}
          </p>
        ) : null}
        {comments.map((comment) => (
          <div key={comment.id} className="social-post-card">
            <p>{comment.content}</p>
            <small>{new Date(comment.createdAt).toLocaleString()}</small>
          </div>
        ))}
        {isAuthenticated ? (
          <>
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={t("social.postDetail.commentPlaceholder", {
                defaultValue: "Add a comment...",
              })}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await createPostComment(id, { content: commentText });
                  setCommentText("");
                  await load();
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
              }}>
              {t("social.postDetail.addComment", { defaultValue: "Add Comment" })}
            </button>
          </>
        ) : null}
      </article>
    </section>
  );
};

export default SocialPostDetail;

