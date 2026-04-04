import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

const ProviderProfilePage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const {
    slug,
    profile,
    places,
    stats,
    upcomingEvents,
    reviewsByPlace,
    profileLoading,
    error,
  } = useProviderProfile();
  const [posts, setPosts] = useState([]);
  const { displayGraph, showFollow, handleFollow } = useProviderPageFollow();

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
        />

        <ProviderTabs />

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
          className="provider-profile-block"
          aria-labelledby="provider-profile-section-places"
        >
          <header className="provider-profile-block__head">
            <div>
              <h2 id="provider-profile-section-places" className="provider-profile-block__title">
                {t("provider.business.placesTitle", { defaultValue: "Places" })}
              </h2>
              <p className="provider-profile-block__sub">
                {t("provider.business.placesSub", {
                  defaultValue: "Venues and listings for this business",
                })}
              </p>
            </div>
            {placesCount > 0 ? (
              <span className="provider-profile-block__badge" aria-hidden>
                {placesCount}
              </span>
            ) : null}
          </header>
          {places.length === 0 ? (
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

        <section
          className="provider-profile-block"
          aria-labelledby="provider-profile-section-events"
        >
          <header className="provider-profile-block__head">
            <div>
              <h2 id="provider-profile-section-events" className="provider-profile-block__title">
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
              {upcomingEvents.slice(0, 6).map((ev) => (
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

        <section
          className="provider-profile-block"
          aria-labelledby="provider-profile-section-reviews"
        >
          <header className="provider-profile-block__head">
            <div>
              <h2 id="provider-profile-section-reviews" className="provider-profile-block__title">
                {t("provider.business.reviewsTitle", { defaultValue: "Reviews" })}
              </h2>
              <p className="provider-profile-block__sub">
                {t("provider.business.reviewsSub", {
                  defaultValue: "Feedback from guests",
                })}
              </p>
            </div>
          </header>
          <ProviderReviewList blocks={reviewsByPlace} />
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
      </div>
    </section>
  );
};

export default ProviderProfilePage;
