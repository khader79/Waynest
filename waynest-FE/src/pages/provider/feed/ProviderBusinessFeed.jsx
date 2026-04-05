import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  MdCalendarToday,
  MdEventNote,
  MdOpenInNew,
  MdRateReview,
  MdSettings,
  MdStar,
  MdStorefront,
} from "react-icons/md";
import { fetchProviderProfile, fetchProviderStats } from "@/api/provider";
import { useProviderWorkspace } from "@/context/ProviderWorkspaceContext";
import { fetchProviderPostsBySlug } from "@/api/social";
import { PostCard } from "@/components/social";
import { useAuth } from "@/context/AuthContext";
import {
  deleteSocialPost,
  saveSocialPost,
  toggleSocialLike,
  unsaveSocialPost,
  updateSocialPost,
} from "@/services/social/social.service";
import { getApiErrorMessage, getApiErrorStatus } from "@/utils/errors";
import "../../providerPanel.css";

const isRecord = (value) => typeof value === "object" && value !== null;

const normalizeStats = (value) => {
  if (!isRecord(value)) {
    return {
      averageRating: 0,
      totalBookings: 0,
      totalPlaces: 0,
      totalReviews: 0,
    };
  }

  return {
    averageRating: Number(value.averageRating ?? 0),
    totalBookings: Number(value.totalBookings ?? 0),
    totalPlaces: Number(value.totalPlaces ?? 0),
    totalReviews: Number(value.totalReviews ?? 0),
  };
};

const ProviderBusinessFeed = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { slug: workspaceSlug } = useProviderWorkspace();
  const [provider, setProvider] = useState(null);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const reloadPosts = useCallback(async () => {
    const slug = provider?.slug;
    if (!slug) {
      return;
    }
    try {
      const raw = await fetchProviderPostsBySlug(slug);
      setPosts(Array.isArray(raw) ? raw : []);
    } catch {
      setPosts([]);
    }
  }, [provider?.slug]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        const [payload, statsPayload] = await Promise.all([
          fetchProviderProfile(),
          fetchProviderStats().catch(() => null),
        ]);
        if (!active) {
          return;
        }

        if (
          !payload ||
          typeof payload !== "object" ||
          typeof payload.slug !== "string" ||
          !payload.slug.trim()
        ) {
          setNotFound(true);
          return;
        }

        setProvider(payload);
        setStats(normalizeStats(statsPayload));
      } catch (error) {
        if (getApiErrorStatus(error) === 404) {
          if (active) {
            setNotFound(true);
          }
        } else {
          toast.error(
            getApiErrorMessage(
              error,
              t("provider.businessFeed.loadError", {
                defaultValue: "Failed to load business feed",
              }),
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (!provider?.slug) {
      setPostsLoading(false);
      return;
    }
    let active = true;
    setPostsLoading(true);
    void fetchProviderPostsBySlug(provider.slug)
      .then((raw) => {
        if (active) {
          setPosts(Array.isArray(raw) ? raw : []);
        }
      })
      .catch(() => {
        if (active) {
          setPosts([]);
        }
      })
      .finally(() => {
        if (active) {
          setPostsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [provider?.slug]);

  const handleDeletePost = async (postId) => {
    try {
      await deleteSocialPost(postId);
      toast.success(t("social.feed.deleted", { defaultValue: "Post deleted" }));
      await reloadPosts();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("social.feed.deleteFailed", { defaultValue: "Delete failed" })));
    }
  };

  const handleUpdatePost = async (postId, payload) => {
    try {
      await updateSocialPost(postId, payload);
      toast.success(t("social.feed.updated", { defaultValue: "Post updated" }));
      await reloadPosts();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("social.feed.updateFailed", { defaultValue: "Update failed" })));
    }
  };

  if (notFound) {
    return <div className="provider-panel-empty">{t("provider.common.notSetup")}</div>;
  }

  const slug = provider?.slug ?? workspaceSlug;
  const displayName = provider?.displayName ?? "";
  const verificationStatus =
    provider && typeof provider.verificationStatus === "string"
      ? provider.verificationStatus
      : null;

  const ratingDisplay =
    stats && stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—";

  const reviewsPath = slug ? "/account/provider/public/reviews" : null;

  const trustBadge =
    verificationStatus === "VERIFIED" ? (
      <span className="provider-business-feed__trust provider-business-feed__trust--verified">
        {t("provider.businessFeed.trustVerified", { defaultValue: "Verified business" })}
      </span>
    ) : verificationStatus === "PENDING" || verificationStatus === "UNDER_REVIEW" ? (
      <span className="provider-business-feed__trust provider-business-feed__trust--pending">
        {t("provider.businessFeed.trustPending", { defaultValue: "Verification in progress" })}
      </span>
    ) : verificationStatus === "REJECTED" || verificationStatus === "SUSPENDED" ? (
      <span className="provider-business-feed__trust provider-business-feed__trust--warn">
        {t("provider.businessFeed.trustAttention", { defaultValue: "Action required on your account" })}
      </span>
    ) : null;

  return (
    <div className="provider-panel-page provider-business-feed">
      <p className="provider-business-feed__notice" role="note">
        {t("provider.businessFeed.separationNotice", {
          defaultValue:
            "Your business account is separate from your personal profile. Activity here is for your business only.",
        })}
      </p>

      <section className="provider-business-feed__hero" aria-labelledby="provider-hero-title">
        <div className="provider-business-feed__hero-inner">
          <div className="provider-business-feed__hero-copy">
            <p className="provider-business-feed__eyebrow">
              {t("provider.businessFeed.workspaceEyebrow", { defaultValue: "Business workspace" })}
            </p>
            <div className="provider-business-feed__hero-main">
              <h1 id="provider-hero-title" className="provider-business-feed__hero-title">
                {loading
                  ? "\u00a0"
                  : displayName || t("provider.businessFeed.titleFallback", { defaultValue: "Business" })}
              </h1>
              {provider && (
                <span
                  className={`provider-panel-status provider-business-feed__hero-status ${
                    provider.isActive ? "is-active" : "is-inactive"
                  }`}
                >
                  {provider.isActive
                    ? t("provider.common.active")
                    : t("provider.common.inactive")}
                </span>
              )}
              {trustBadge}
            </div>
            <p className="provider-business-feed__hero-lead">
              {t("provider.businessFeed.heroLead", {
                defaultValue: "Manage posts, bookings, and your public presence from one place.",
              })}
            </p>
          </div>
          {slug ? (
            <div className="provider-business-feed__hero-aside">
              <Link
                className="provider-business-feed__hero-cta provider-business-feed__hero-cta--primary"
                to="/account/provider/public"
              >
                {t("provider.businessFeed.viewPublicPage", {
                  defaultValue: "Open public business page",
                })}
                <MdOpenInNew className="provider-business-feed__hero-cta-icon" aria-hidden />
              </Link>
              <Link
                className="provider-business-feed__hero-cta provider-business-feed__hero-cta--secondary"
                to="/account/provider/settings"
              >
                <MdSettings className="provider-business-feed__hero-cta-icon" aria-hidden />
                {t("provider.businessFeed.heroSettings", { defaultValue: "Business settings" })}
              </Link>
            </div>
          ) : null}
        </div>

        <nav className="provider-business-feed__ops-grid" aria-label={t("provider.businessFeed.opsNav")}>
          <button
            type="button"
            className="provider-business-feed__ops-tile"
            onClick={() => navigate("/account/provider/places")}
          >
            <span className="provider-business-feed__ops-tile-icon" aria-hidden>
              <MdStorefront />
            </span>
            <span className="provider-business-feed__ops-tile-label">
              {t("provider.businessFeed.opsPlaces", { defaultValue: "Listings" })}
            </span>
          </button>
          <button
            type="button"
            className="provider-business-feed__ops-tile"
            onClick={() => navigate("/account/provider/events")}
          >
            <span className="provider-business-feed__ops-tile-icon" aria-hidden>
              <MdCalendarToday />
            </span>
            <span className="provider-business-feed__ops-tile-label">
              {t("provider.businessFeed.opsEvents", { defaultValue: "Events" })}
            </span>
          </button>
          <button
            type="button"
            className="provider-business-feed__ops-tile"
            onClick={() => navigate("/account/provider/bookings")}
          >
            <span className="provider-business-feed__ops-tile-icon" aria-hidden>
              <MdEventNote />
            </span>
            <span className="provider-business-feed__ops-tile-label">
              {t("provider.businessFeed.opsBookings", { defaultValue: "Bookings" })}
            </span>
          </button>
          {reviewsPath ? (
            <Link className="provider-business-feed__ops-tile provider-business-feed__ops-tile--link" to={reviewsPath}>
              <span className="provider-business-feed__ops-tile-icon" aria-hidden>
                <MdRateReview />
              </span>
              <span className="provider-business-feed__ops-tile-label">
                {t("provider.businessFeed.opsReviews", { defaultValue: "Guest reviews" })}
              </span>
            </Link>
          ) : null}
        </nav>
      </section>

      <section
        className="provider-business-feed__glance"
        aria-labelledby="glance-heading"
      >
        <h2 id="glance-heading" className="provider-business-feed__glance-title">
          {t("provider.businessFeed.atAGlance", { defaultValue: "At a glance" })}
        </h2>
        {loading || !stats ? (
          <div className="provider-panel-metrics" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="provider-panel-skeleton provider-panel-skeleton-metric" />
            ))}
          </div>
        ) : (
          <div className="provider-panel-metrics">
            <button
              type="button"
              className="provider-panel-metric-card provider-panel-metric-card--rich provider-business-feed__metric-hit"
              onClick={() => navigate("/account/provider/places")}
            >
              <span className="provider-panel-metric-icon" aria-hidden>
                <MdStorefront />
              </span>
              <div className="provider-panel-metric-body">
                <span className="provider-panel-metric-label">
                  {t("provider.dashboard.metrics.totalPlaces")}
                </span>
                <span className="provider-panel-metric-value">{stats.totalPlaces}</span>
                <span className="provider-panel-metric-meta">
                  {t("provider.businessFeed.metricMeta.places", {
                    defaultValue: "Places linked to your business",
                  })}
                </span>
              </div>
            </button>
            <button
              type="button"
              className="provider-panel-metric-card provider-panel-metric-card--rich provider-business-feed__metric-hit"
              onClick={() => navigate("/account/provider/bookings")}
            >
              <span className="provider-panel-metric-icon" aria-hidden>
                <MdEventNote />
              </span>
              <div className="provider-panel-metric-body">
                <span className="provider-panel-metric-label">
                  {t("provider.dashboard.metrics.totalBookings")}
                </span>
                <span className="provider-panel-metric-value">{stats.totalBookings}</span>
                <span className="provider-panel-metric-meta">
                  {t("provider.businessFeed.metricMeta.bookings", {
                    defaultValue: "Bookings across your listings",
                  })}
                </span>
              </div>
            </button>
            <button
              type="button"
              className="provider-panel-metric-card provider-panel-metric-card--rich provider-business-feed__metric-hit"
              onClick={() => (reviewsPath ? navigate(reviewsPath) : navigate("/account/provider/places"))}
            >
              <span className="provider-panel-metric-icon" aria-hidden>
                <MdRateReview />
              </span>
              <div className="provider-panel-metric-body">
                <span className="provider-panel-metric-label">
                  {t("provider.dashboard.metrics.totalReviews")}
                </span>
                <span className="provider-panel-metric-value">{stats.totalReviews}</span>
                <span className="provider-panel-metric-meta">
                  {t("provider.businessFeed.metricMeta.reviews", {
                    defaultValue: "Reviews from guests",
                  })}
                </span>
              </div>
            </button>
            <button
              type="button"
              className="provider-panel-metric-card provider-panel-metric-card--rich provider-business-feed__metric-hit"
              onClick={() => (reviewsPath ? navigate(reviewsPath) : navigate("/account/provider/places"))}
            >
              <span className="provider-panel-metric-icon" aria-hidden>
                <MdStar />
              </span>
              <div className="provider-panel-metric-body">
                <span className="provider-panel-metric-label">
                  {t("provider.dashboard.metrics.averageRating")}
                </span>
                <span className="provider-panel-metric-value">{ratingDisplay}</span>
                <span className="provider-panel-metric-meta">
                  {t("provider.businessFeed.metricMeta.rating", {
                    defaultValue: "Average across reviews",
                  })}
                </span>
              </div>
            </button>
          </div>
        )}
      </section>

      <div className="provider-business-feed__two-col">
        <section className="provider-business-feed__section" aria-labelledby="business-feed-heading">
          <h2 id="business-feed-heading" className="provider-business-feed__section-title">
            {t("provider.businessFeed.feedTitle", { defaultValue: "Business feed" })}
          </h2>
          {postsLoading ? (
            <div className="provider-business-feed__skeleton" aria-hidden />
          ) : posts.length === 0 ? (
            <div className="provider-business-feed__empty-state">
              <p className="provider-business-feed__empty-title">
                {t("provider.businessFeed.emptyFeedTitle", {
                  defaultValue: "Start reaching guests",
                })}
              </p>
              <p className="provider-business-feed__empty">
                {t("provider.businessFeed.noPostsRich", {
                  defaultValue:
                    "Posts you publish as this business appear here and on your public page. Share updates, photos, and offers in one place.",
                })}
              </p>
              <div className="provider-business-feed__empty-actions">
                <Link className="provider-business-feed__empty-primary" to="/social">
                  {t("provider.businessFeed.ctaCreatePost", { defaultValue: "Create a business post" })}
                </Link>
                <button
                  type="button"
                  className="provider-business-feed__empty-secondary"
                  onClick={() => navigate("/account/provider/places")}
                >
                  {t("provider.businessFeed.ctaAddPlace", { defaultValue: "Manage listings" })}
                </button>
              </div>
            </div>
          ) : (
            <div className="provider-business-feed__posts">
              {posts.map((post) => (
                <div key={post.id} className="provider-business-feed__post-card">
                  <PostCard
                    post={post}
                    isAuthenticated={isAuthenticated}
                    toggleSocialLike={toggleSocialLike}
                    saveSocialPost={saveSocialPost}
                    unsaveSocialPost={unsaveSocialPost}
                    actorId={user?.id}
                    onDeletePost={handleDeletePost}
                    onUpdatePost={handleUpdatePost}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          className="provider-business-feed__section provider-business-feed__audience-card"
          aria-labelledby="people-heading"
        >
          <h2 id="people-heading" className="provider-business-feed__section-title">
            {t("provider.businessFeed.peopleTitle", { defaultValue: "Audience & people" })}
          </h2>
          <p className="provider-business-feed__body">
            {t("provider.businessFeed.peopleBody", {
              defaultValue:
                "Your public page shows followers. Personal chats and friends stay in Messages under your personal account. Team access for this business (similar to Facebook Page roles) will be available here later.",
            })}
          </p>
          <p className="provider-business-feed__hint">
            {t("provider.businessFeed.teamComingSoon", {
              defaultValue: "Inviting teammates to co-manage this business is coming soon.",
            })}
          </p>
          <div className="provider-business-feed__links">
            {slug ? (
              <Link className="provider-business-feed__link" to="/account/provider/public">
                {t("provider.businessFeed.viewPublicPage", {
                  defaultValue: "Open public business page",
                })}
              </Link>
            ) : null}
            <Link className="provider-business-feed__link" to="/social">
              {t("provider.businessFeed.personalMessages", {
                defaultValue: "Personal messages & friends",
              })}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProviderBusinessFeed;
