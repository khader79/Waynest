import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import {
  fetchProviderPostsBySlug,
  followUser,
  getSocialGraphState,
  unfollowUser,
} from "@/api/social";
import { useAuth } from "@/context/AuthContext";
import { useProviderProfile } from "@/context/ProviderContext";
import ProviderHeader from "@/components/provider/ProviderHeader";
import ProviderTabs from "@/components/provider/ProviderTabs";
import ProviderServiceCard from "@/components/provider/ProviderServiceCard";
import ProviderReviewList from "@/components/provider/ProviderReviewList";
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
  const [graph, setGraph] = useState(null);

  const ownerUserId = profile?.ownerUserId ?? null;
  const title = profile?.displayName ?? "";
  const cityLabel = profile?.city?.name ?? null;
  const description = profile?.description ?? null;

  const mapPlace = useMemo(
    () => places.find((p) => p?.latitude != null && p?.longitude != null),
    [places],
  );

  useEffect(() => {
    if (!slug?.trim()) {
      return;
    }
    const run = async () => {
      try {
        const userPosts = await fetchProviderPostsBySlug(slug);
        setPosts(Array.isArray(userPosts) ? userPosts : []);
      } catch {
        setPosts([]);
      }
    };
    void run();
  }, [slug]);

  useEffect(() => {
    const loadGraph = async () => {
      if (
        !isAuthenticated ||
        !user?.id ||
        !ownerUserId ||
        ownerUserId === user.id
      ) {
        setGraph(null);
        return;
      }
      try {
        const state = await getSocialGraphState(ownerUserId);
        setGraph({
          followersCount: state.followersCount,
          following: state.following,
          followingCount: state.followingCount,
        });
      } catch {
        setGraph(null);
      }
    };
    void loadGraph();
  }, [isAuthenticated, user?.id, ownerUserId]);

  const handleFollow = async () => {
    if (!ownerUserId || !graph) {
      return;
    }
    try {
      if (graph.following) {
        await unfollowUser(ownerUserId);
      } else {
        await followUser(ownerUserId);
      }
      const state = await getSocialGraphState(ownerUserId);
      setGraph({
        followersCount: state.followersCount,
        following: state.following,
        followingCount: state.followingCount,
      });
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("social.providerProfile.followUpdateFailed", {
            defaultValue: "Failed to update follow state",
          }),
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

  return (
    <section className="social-feed-page provider-business provider-business--wide">
      <ProviderHeader
        title={title}
        cityLabel={cityLabel}
        description={description}
        loading={profileLoading}
        coverUrl={profile?.coverPhotoUrl}
        logoUrl={profile?.logoUrl}
        stats={stats}
        graph={graph}
        showFollow={Boolean(graph && ownerUserId)}
        onFollowToggle={handleFollow}
      />
      <ProviderTabs />

      {mapPlace ? (
        <div className="provider-map-panel">
          <h2 className="social-provider-section-title provider-business__section-title">
            {t("provider.business.mapTitle", { defaultValue: "Location" })}
          </h2>
          <iframe
            title={t("provider.business.mapTitle", { defaultValue: "Location" })}
            className="provider-map-panel__frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
              `${Number(mapPlace.longitude) - 0.02},${Number(mapPlace.latitude) - 0.015},${Number(mapPlace.longitude) + 0.02},${Number(mapPlace.latitude) + 0.015}`,
            )}&layer=mapnik&marker=${encodeURIComponent(`${mapPlace.latitude},${mapPlace.longitude}`)}`}
          />
        </div>
      ) : null}

      <div className="provider-section">
        <h2 className="social-provider-section-title provider-business__section-title">
          {t("provider.business.placesTitle", { defaultValue: "Places" })}
        </h2>
        {places.length === 0 ? (
          <p className="provider-business__muted">
            {t("provider.business.noPlaces", {
              defaultValue: "No places listed yet.",
            })}
          </p>
        ) : (
          <div className="provider-places-grid">
            {places.map((p) => (
              <ProviderServiceCard key={p.id} place={p} />
            ))}
          </div>
        )}
      </div>

      <div className="provider-section">
        <h2 className="social-provider-section-title provider-business__section-title">
          {t("provider.business.eventsTitle", { defaultValue: "Upcoming events" })}
        </h2>
        {!upcomingEvents?.length ? (
          <p className="provider-business__muted">
            {t("provider.business.noEvents", {
              defaultValue: "No upcoming events scheduled.",
            })}
          </p>
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
      </div>

      <div className="provider-section">
        <h2 className="social-provider-section-title provider-business__section-title">
          {t("provider.business.reviewsTitle", { defaultValue: "Reviews" })}
        </h2>
        <ProviderReviewList blocks={reviewsByPlace} />
      </div>

      <h2 className="social-provider-section-title">
        {t("social.providerProfile.latest", { defaultValue: "Latest Posts" })}
      </h2>

      <div className="social-feed-list">
        {posts.length === 0 ? (
          <p>
            {t("social.providerProfile.noPosts", {
              defaultValue: "No posts yet.",
            })}
          </p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="social-feed-card">
              <h3>{post.title ?? "Post"}</h3>
              <p className="social-feed-card__meta">{post.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

export default ProviderProfilePage;
