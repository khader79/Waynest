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

/** @typedef {'overview' | 'places' | 'events'} ProviderPublicTab */

function tabFromPathname(pathname) {
  const p = pathname.replace(/\/$/, "");
  if (p.endsWith("/places") || p.endsWith("/services")) {
    return "places";
  }
  if (p.endsWith("/events")) {
    return "events";
  }
  return "overview";
}

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getCityCoords = (city) => {
  const latitude = toFiniteNumber(city?.latitude);
  const longitude = toFiniteNumber(city?.longitude);
  if (latitude == null || longitude == null) {
    return null;
  }
  return { latitude, longitude };
};

const getPlaceCoords = (place) => {
  const latitude = toFiniteNumber(place?.latitude);
  const longitude = toFiniteNumber(place?.longitude);
  if (latitude != null && longitude != null) {
    return { latitude, longitude };
  }
  return getCityCoords(place?.city);
};

const ProviderPublicBusinessPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = /** @type {ProviderPublicTab} */ (
    tabFromPathname(location.pathname)
  );
  const {
    slug,
    profile,
    places,
    stats,
    followTargetUserId,
    upcomingEvents,
    profileLoading,
    placesLoading,
    error,
    loadServices,
  } = useProviderProfile();
  const [posts, setPosts] = useState([]);
  const {
    displayGraph,
    followLoading,
    showFollow,
    handleFollow,
    viewerIsOwner,
  } = useProviderPageFollow();

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
  const ownerMessageUserId = (() => {
    const fromColumn =
      typeof profile?.ownerUserId === "string" && profile.ownerUserId.trim()
        ? profile.ownerUserId.trim()
        : null;
    const fromNested =
      profile?.owner && typeof profile.owner.id === "string"
        ? profile.owner.id.trim()
        : null;
    const fromFollow =
      typeof followTargetUserId === "string" && followTargetUserId.trim()
        ? followTargetUserId.trim()
        : null;

    // Message should target the provider owner account; follow id is last-resort fallback.
    return fromColumn || fromNested || fromFollow || null;
  })();

  const mapPoint = useMemo(() => {
    const profileCityId = profile?.city?.id ?? null;

    if (profileCityId) {
      for (const place of places) {
        if (place?.city?.id !== profileCityId) {
          continue;
        }
        const coords = getPlaceCoords(place);
        if (coords) {
          return coords;
        }
      }
    }

    for (const place of places) {
      const coords = getPlaceCoords(place);
      if (coords) {
        return coords;
      }
    }

    return getCityCoords(profile?.city);
  }, [places, profile?.city]);

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
    let active = true;

    const loadPosts = async () => {
      if (!slug?.trim()) {
        if (active) {
          setPosts([]);
        }
        return;
      }

      try {
        const raw = await fetchProviderPostsBySlug(slug);
        if (!active) {
          return;
        }
        setPosts(Array.isArray(raw) ? raw : []);
      } catch {
        if (!active) {
          return;
        }
        setPosts([]);
      }
    };

    void loadPosts();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (tab === "places" && slug) {
      void loadServices(slug).catch(() => {});
    }
  }, [tab, slug, loadServices]);

  const handleDeletePost = async (postId) => {
    try {
      await deleteSocialPost(postId);
      toast.success(t("social.feed.deleted", { defaultValue: "Post deleted" }));
      await reloadPosts();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("social.feed.deleteFailed", { defaultValue: "Delete failed" }),
        ),
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
        getApiErrorMessage(
          err,
          t("social.feed.updateFailed", { defaultValue: "Update failed" }),
        ),
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
          ownerUsername={profile?.owner?.username ?? null}
          messageTargetUserId={ownerMessageUserId}
          stats={stats}
          graph={displayGraph}
          showFollow={showFollow}
          followLoading={followLoading}
          onFollowToggle={handleFollow}
          viewerIsOwner={viewerIsOwner}
        />

        <ProviderTabs
          mode="tabs"
          value={tab}
          onChange={handleTabChange}
          showReviews={false}
        />

        {tab === "overview" ? (
          <>
            {mapPoint ? (
              <section
                className="provider-profile-block provider-profile-block--map"
                aria-labelledby="provider-profile-section-map">
                <header className="provider-profile-block__head">
                  <div>
                    <h2
                      id="provider-profile-section-map"
                      className="provider-profile-block__title">
                      {t("provider.business.mapTitle", {
                        defaultValue: "Location",
                      })}
                    </h2>
                    <p className="provider-profile-block__sub">
                      {t("provider.business.mapSub", {
                        defaultValue: "Service area on the map",
                      })}
                    </p>
                  </div>
                </header>
                <iframe
                  title={t("provider.business.mapTitle", {
                    defaultValue: "Location",
                  })}
                  className="provider-map-panel__frame"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                    `${mapPoint.longitude - 0.02},${mapPoint.latitude - 0.015},${mapPoint.longitude + 0.02},${mapPoint.latitude + 0.015}`,
                  )}&layer=mapnik&marker=${encodeURIComponent(`${mapPoint.latitude},${mapPoint.longitude}`)}`}
                />
              </section>
            ) : null}

            <section
              className="provider-profile-block provider-profile-block--posts"
              aria-labelledby="provider-profile-section-posts">
              <header className="provider-profile-block__head">
                <div>
                  <h2
                    id="provider-profile-section-posts"
                    className="provider-profile-block__title">
                    {t("social.providerProfile.latest", {
                      defaultValue: "Latest posts",
                    })}
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
            aria-labelledby="provider-public-section-places">
            <header className="provider-profile-block__head">
              <div>
                <h2
                  id="provider-public-section-places"
                  className="provider-profile-block__title">
                  {t("provider.business.placesTitle", {
                    defaultValue: "Places",
                  })}
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
            aria-labelledby="provider-public-section-events">
            <header className="provider-profile-block__head">
              <div>
                <h2
                  id="provider-public-section-events"
                  className="provider-profile-block__title">
                  {t("provider.business.eventsTitle", {
                    defaultValue: "Upcoming events",
                  })}
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
                    <Link
                      to={eventHref(ev)}
                      className="provider-event-list__link">
                      <span className="provider-event-list__title">
                        {ev.title}
                      </span>
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
                    <button
                      type="button"
                      className="provider-event-list__cta"
                      disabled
                      aria-disabled="true"
                      title={t("provider.business.bookNowComingSoon", {
                        defaultValue: "Book (Coming soon)",
                      })}>
                      {t("provider.business.bookNowComingSoon", {
                        defaultValue: "Book (Coming soon)",
                      })}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
};

export default ProviderPublicBusinessPage;
