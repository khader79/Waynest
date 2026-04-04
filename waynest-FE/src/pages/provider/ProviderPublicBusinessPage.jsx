import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import { fetchProviderPostsBySlug } from "@/api/social";
import { useAuth } from "@/context/AuthContext";
import { useProviderProfile } from "@/context/ProviderContext";
import { useProviderPageFollow } from "@/hooks/provider/useProviderPageFollow";
import ProviderHeader from "@/components/provider/ProviderHeader";
import ProviderTabs from "@/components/provider/ProviderTabs";
import ProviderServiceCard from "@/components/provider/ProviderServiceCard";
import ProviderReviewList from "@/components/provider/ProviderReviewList";
import { PostCard } from "@/components/social";
import {
  deleteSocialPost,
  saveSocialPost,
  toggleSocialLike,
  unsaveSocialPost,
  updateSocialPost,
} from "@/services/social/social.service";
import "@/pages/provider/provider-business.css";
import "@/pages/social/SocialFeed.css";

const eventHref = (event) => {
  const id = event?.id;
  return id ? `/events/${encodeURIComponent(id)}` : "#";
};

/** @typedef {'overview' | 'places' | 'events' | 'reviews'} ProviderPublicTab */

function tabFromPathname(pathname) {
  const p = pathname.replace(/\/$/, "");
  if (p.endsWith("/places") || p.endsWith("/services")) {
    return "places";
  }
  if (p.endsWith("/events")) {
    return "events";
  }
  if (p.endsWith("/reviews")) {
    return "reviews";
  }
  return "overview";
}

const ProviderPublicBusinessPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = /** @type {ProviderPublicTab} */ (tabFromPathname(location.pathname));
  const {
    slug,
    profile,
    places,
    stats,
    upcomingEvents,
    reviewsByPlace,
    profileLoading,
    placesLoading,
    reviewsLoading,
    error,
    loadServices,
    loadReviews,
  } = useProviderProfile();
  const [posts, setPosts] = useState([]);
  const { displayGraph, showFollow, handleFollow, viewerIsOwner } = useProviderPageFollow();

  const handleTabChange = useCallback(
    (/** @type {ProviderPublicTab} */ next) => {
      if (next === tab) {
        return;
      }
      if (next === "overview") {
        navigate("..");
        return;
      }
      if (tab === "overview") {
        navigate(next);
      } else {
        navigate(`../${next}`);
      }
    },
    [navigate, tab],
  );

  const title = profile?.displayName ?? "";
  const cityLabel = profile?.city?.name ?? null;
  const description = profile?.description ?? null;

  const mapPlace = useMemo(
    () => places.find((p) => p?.latitude != null && p?.longitude != null),
    [places],
  );

  const reloadPosts = useCallback(async () => {
    if (!slug?.trim()) {
      return;
    }
    try {
      const raw = await fetchProviderPostsBySlug(slug);
      setPosts(Array.isArray(raw) ? raw : []);
    } catch {
      setPosts([]);
    }
  }, [slug]);

  useEffect(() => {
    void reloadPosts();
  }, [reloadPosts]);

  useEffect(() => {
    if (tab === "places" && slug) {
      void loadServices(slug).catch(() => {});
    }
  }, [tab, slug, loadServices]);

  useEffect(() => {
    if (tab === "reviews" && slug) {
      void loadReviews(slug).catch(() => {});
    }
  }, [tab, slug, loadReviews]);

  const handleDeletePost = async (postId) => {
    try {
      await deleteSocialPost(postId);
      toast.success(t("social.feed.deleted", { defaultValue: "Post deleted" }));
      await reloadPosts();
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, t("social.feed.deleteFailed", { defaultValue: "Delete failed" })),
      );
    }
  };

  const handleUpdatePost = async (postId, payload) => {
    try {
      await updateSocialPost(postId, payload);
      toast.success(t("social.feed.updated", { defaultValue: "Post updated" }));
      await reloadPosts();
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, t("social.feed.updateFailed", { defaultValue: "Update failed" })),
      );
    }
  };

  useEffect(() => {
    if (error && slug) {
      toast.error(
        getApiErrorMessage(
          new Error(error),
          t("social.providerProfile.loadFailed", {
            defaultValue: "Failed to load provider profile",
          }),
        ),
      );
    }
  }, [error, slug, t]);

  const placesCount = places.length;
  const eventsCount = upcomingEvents?.length ?? 0;

  const guestFeedbackCount = useMemo(() => {
    if (stats != null && typeof stats.totalReviews === "number") {
      return stats.totalReviews;
    }
    return reviewsByPlace.reduce((acc, block) => {
      const n = Array.isArray(block?.reviews) ? block.reviews.length : 0;
      return acc + n;
    }, 0);
  }, [stats, reviewsByPlace]);

  const reviewsCount = useMemo(() => {
    if (!reviewsByPlace?.length) {
      return 0;
    }
    return reviewsByPlace.reduce((acc, block) => {
      const n = Array.isArray(block?.reviews) ? block.reviews.length : 0;
      return acc + n;
    }, 0);
  }, [reviewsByPlace]);

  return (
    <section className="social-feed-page provider-business provider-business--full">
      <div className="provider-business-shell provider-profile-page">
        <ProviderHeader
          title={title}
          cityLabel={cityLabel}
          description={description}
          loading={profileLoading}
          coverUrl={profile?.coverPhotoUrl}
          logoUrl={profile?.logoUrl}
          stats={stats}
          graph={displayGraph}
          showFollow={showFollow}
          onFollowToggle={handleFollow}
          viewerIsOwner={viewerIsOwner}
        />

        <ProviderTabs mode="tabs" value={tab} onChange={handleTabChange} />

        {tab === "overview" ? (
          <>
            {mapPlace ? (
              <section
                className="provider-profile-block provider-profile-block--map"
                aria-labelledby="provider-profile-section-map"
              >
                <header className="provider-profile-block__head">
                  <div>
                    <h2 id="provider-profile-section-map" className="provider-profile-block__title">
                      {t("provider.business.mapTitle", { defaultValue: "Location" })}
                    </h2>
                    <p className="provider-profile-block__sub">
                      {t("provider.business.mapSub", {
                        defaultValue: "Service area on the map",
                      })}
                    </p>
                  </div>
                </header>
                <iframe
                  title={t("provider.business.mapTitle", { defaultValue: "Location" })}
                  className="provider-map-panel__frame"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                    `${Number(mapPlace.longitude) - 0.02},${Number(mapPlace.latitude) - 0.015},${Number(mapPlace.longitude) + 0.02},${Number(mapPlace.latitude) + 0.015}`,
                  )}&layer=mapnik&marker=${encodeURIComponent(`${mapPlace.latitude},${mapPlace.longitude}`)}`}
                />
              </section>
            ) : null}

            <section
              className="provider-profile-feedback-strip"
              aria-label={t("provider.business.feedbackStripAria", { defaultValue: "Guest feedback" })}
            >
              <button
                type="button"
                className="provider-profile-feedback-strip__link"
                onClick={() => handleTabChange("reviews")}
              >
                <div className="provider-profile-feedback-strip__text">
                  <span className="provider-profile-feedback-strip__title">
                    {t("provider.business.feedbackStripTitle", {
                      defaultValue: "Guest feedback",
                    })}
                  </span>
                  <span className="provider-profile-feedback-strip__sub">
                    {guestFeedbackCount > 0
                      ? t("provider.business.feedbackStripHint", {
                          defaultValue: "Open the full list of ratings and comments",
                        })
                      : t("provider.business.feedbackStripEmpty", {
                          defaultValue: "No ratings yet — feedback appears after guest visits",
                        })}
                  </span>
                </div>
                <div className="provider-profile-feedback-strip__meta">
                  {guestFeedbackCount > 0 ? (
                    <span className="provider-profile-feedback-strip__badge">
                      {guestFeedbackCount}{" "}
                      {t("provider.business.feedbackCountShort", { defaultValue: "reviews" })}
                    </span>
                  ) : null}
                  <span className="provider-profile-feedback-strip__chev" aria-hidden>
                    →
                  </span>
                </div>
              </button>
            </section>

            <section
              className="provider-profile-block provider-profile-block--posts"
              aria-labelledby="provider-profile-section-posts"
            >
              <header className="provider-profile-block__head">
                <div>
                  <h2 id="provider-profile-section-posts" className="provider-profile-block__title">
                    {t("social.providerProfile.latest", { defaultValue: "Latest posts" })}
                  </h2>
                  <p className="provider-profile-block__sub">
                    {t("provider.business.postsSub", {
                      defaultValue: "Updates published by this business",
                    })}
                  </p>
                </div>
              </header>
              {posts.length === 0 ? (
                <div className="provider-profile-empty" role="status">
                  <p className="provider-profile-empty__text">
                    {t("social.providerProfile.noPosts", {
                      defaultValue: "No posts yet.",
                    })}
                  </p>
                </div>
              ) : (
                <div className="provider-profile-posts">
                  {posts.map((post) => (
                    <div key={post.id} className="provider-profile-post-wrap">
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
          </>
        ) : null}

        {tab === "places" ? (
          <section
            className="provider-profile-block"
            aria-labelledby="provider-public-section-places"
          >
            <header className="provider-profile-block__head">
              <div>
                <h2 id="provider-public-section-places" className="provider-profile-block__title">
                  {t("provider.business.placesTitle", { defaultValue: "Places" })}
                </h2>
                <p className="provider-profile-block__sub">
                  {t("provider.business.placesSub", {
                    defaultValue: "Venues and listings for this business",
                  })}
                </p>
              </div>
              {!placesLoading && placesCount > 0 ? (
                <span className="provider-profile-block__badge" aria-hidden>
                  {placesCount}
                </span>
              ) : null}
            </header>
            {placesLoading ? (
              <div className="provider-profile-empty" role="status">
                <p className="provider-profile-empty__text">
                  {t("common.loading", { defaultValue: "Loading…" })}
                </p>
              </div>
            ) : places.length === 0 ? (
              <div className="provider-profile-empty" role="status">
                <p className="provider-profile-empty__text">
                  {t("provider.business.noPlaces", {
                    defaultValue: "No places listed yet.",
                  })}
                </p>
              </div>
            ) : (
              <div className="provider-places-grid">
                {places.map((p) => (
                  <ProviderServiceCard key={p.id} place={p} />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === "events" ? (
          <section
            className="provider-profile-block"
            aria-labelledby="provider-public-section-events"
          >
            <header className="provider-profile-block__head">
              <div>
                <h2 id="provider-public-section-events" className="provider-profile-block__title">
                  {t("provider.business.eventsTitle", { defaultValue: "Upcoming events" })}
                </h2>
                <p className="provider-profile-block__sub">
                  {t("provider.business.eventsSub", {
                    defaultValue: "Scheduled experiences and dates",
                  })}
                </p>
              </div>
              {eventsCount > 0 ? (
                <span className="provider-profile-block__badge" aria-hidden>
                  {eventsCount}
                </span>
              ) : null}
            </header>
            {!upcomingEvents?.length ? (
              <div className="provider-profile-empty" role="status">
                <p className="provider-profile-empty__text">
                  {t("provider.business.noEvents", {
                    defaultValue: "No upcoming events scheduled.",
                  })}
                </p>
              </div>
            ) : (
              <ul className="provider-event-list">
                {upcomingEvents.map((ev) => (
                  <li key={ev.id} className="provider-event-list__item">
                    <Link to={eventHref(ev)} className="provider-event-list__link">
                      <span className="provider-event-list__title">{ev.title}</span>
                      <span className="provider-event-list__meta">
                        {ev.venue?.name ? `${ev.venue.name} · ` : ""}
                        {ev.startDate
                          ? new Date(ev.startDate).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {tab === "reviews" ? (
          <section
            className="provider-profile-block"
            aria-labelledby="provider-public-section-reviews"
          >
            <header className="provider-profile-block__head">
              <div>
                <h2 id="provider-public-section-reviews" className="provider-profile-block__title">
                  {t("provider.business.guestFeedbackTitle", { defaultValue: "Guest feedback" })}
                </h2>
                <p className="provider-profile-block__sub">
                  {t("provider.business.guestFeedbackSub", {
                    defaultValue: "Ratings and comments left by visitors after their experience.",
                  })}
                </p>
              </div>
              {!reviewsLoading && reviewsCount > 0 ? (
                <span className="provider-profile-block__badge" aria-hidden>
                  {reviewsCount}
                </span>
              ) : null}
            </header>
            {reviewsLoading ? (
              <div className="provider-profile-empty" role="status">
                <p className="provider-profile-empty__text">
                  {t("common.loading", { defaultValue: "Loading…" })}
                </p>
              </div>
            ) : (
              <ProviderReviewList blocks={reviewsByPlace} />
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
};

export default ProviderPublicBusinessPage;
