import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import type { SocialPost } from "@/services/social/social.service";
import { copyTextToClipboard } from "@/core/utils/clipboard";

type PostCardProps = {
  post: SocialPost;
  isAuthenticated: boolean;
  toggleSocialLike: (postId: string) => Promise<unknown>;
  saveSocialPost: (postId: string) => Promise<unknown>;
};

const PostCard = ({
  post,
  isAuthenticated,
  toggleSocialLike,
  saveSocialPost,
}: PostCardProps) => {
  const { t } = useTranslation();

  const authorHref = post.author?.username
    ? `/u/${encodeURIComponent(post.author.username)}`
    : `/social/users/${encodeURIComponent(post.authorId)}`;
  const authorName =
    post.author?.username ?? t("social.feed.traveler", { defaultValue: "Traveler" });
  const authorInitial = authorName.trim().charAt(0).toUpperCase() || "T";

  const onLike = async () => {
    if (!isAuthenticated) {
      toast.info(t("social.feed.loginFirst", { defaultValue: "Please login first" }));
      return;
    }

    await toggleSocialLike(post.id);
    toast.success(t("social.feed.likeUpdated", { defaultValue: "Updated like" }));
  };

  const onSave = async () => {
    if (!isAuthenticated) {
      toast.info(t("social.feed.loginFirst", { defaultValue: "Please login first" }));
      return;
    }

    await saveSocialPost(post.id);
    toast.success(
      t("social.feed.savedToAccount", { defaultValue: "Saved to your account" }),
    );
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

  return (
    <article className="social-post-card">
      <div className="social-post-head">
        <div className="social-post-author">
          <span className="social-post-avatar" aria-hidden="true">
            {authorInitial}
          </span>
          <div className="social-post-meta">
            <strong>
              <Link to={authorHref}>{authorName}</Link>
            </strong>
            <span>{new Date(post.createdAt).toLocaleString()}</span>
          </div>
        </div>
        {post.shareSlug ? (
          <span className="social-post-chip">
            {t("social.feed.sharedPlan", { defaultValue: "Shared itinerary" })}
          </span>
        ) : null}
      </div>
      {post.title ? <h3 className="social-post-title">{post.title}</h3> : null}
      {post.body ? <p className="social-post-body">{post.body}</p> : null}
      {post.shareSlug ? (
        <Link to={`/trip/${encodeURIComponent(post.shareSlug)}`} className="social-share-link">
          {t("social.feed.openSharedTrip", { defaultValue: "Open shared trip" })}
        </Link>
      ) : null}
      <div className="social-post-actions">
        <button type="button" onClick={() => void onLike()}>
          {t("social.feed.actions.like", { defaultValue: "Like" })}
        </button>
        <button type="button" onClick={() => void onSave()}>
          {t("social.feed.actions.saveCopy", { defaultValue: "Save & Copy" })}
        </button>
        <Link to={`/social/post/${post.id}`}>
          {t("social.feed.actions.comments", { defaultValue: "Comments" })}
        </Link>
        <button type="button" onClick={() => void onShare()}>
          {t("social.feed.actions.share", { defaultValue: "Share" })}
        </button>
      </div>
    </article>
  );
};

export default PostCard;

