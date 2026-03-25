import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/core/providers/AuthContext";
import { getApiErrorMessage } from "@/core/utils/errors";
import { PostCard, Stories } from "@/modules/public/layout/facebook/Layout";
import {
  fetchSocialFeed,
  saveSocialPost,
  toggleSocialLike,
  type SocialPost,
} from "@/services/social/social.service";
import { fetchPublicEvents, fetchPublicPlaces } from "@/services/catalog/catalog.service";
import {
  fetchPublicTripBrowse,
  type PublicTripBrowseItem,
} from "@/services/tripPlanner/tripPlanner.service";
import "../social/SocialFeed.css";
import "./LandingPage.css";

type DiscoveryPlace = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  cityName: string;
  type: string;
  slug?: string | null;
};

type DiscoveryEvent = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  venueName: string;
  startDate?: string;
  slug?: string | null;
};

const extractPlaces = (payload: unknown): DiscoveryPlace[] => {
  const rows =
    Array.isArray(payload)
      ? payload
      : payload &&
          typeof payload === "object" &&
          Array.isArray((payload as { data?: unknown[] }).data)
        ? (payload as { data: unknown[] }).data
        : [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map((row) => ({
      id: String(row.id ?? ""),
      name: typeof row.name === "string" ? row.name : "",
      description: typeof row.description === "string" ? row.description : "",
      imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
      cityName:
        row.city && typeof row.city === "object" && typeof (row.city as { name?: unknown }).name === "string"
          ? ((row.city as { name: string }).name ?? "")
          : "",
      type: typeof row.type === "string" ? row.type : "",
      slug: typeof row.slug === "string" ? row.slug : null,
    }))
    .filter((place) => Boolean(place.id && place.name));
};

const extractEvents = (payload: unknown): DiscoveryEvent[] => {
  const rows =
    Array.isArray(payload)
      ? payload
      : payload &&
          typeof payload === "object" &&
          Array.isArray((payload as { data?: unknown[] }).data)
        ? (payload as { data: unknown[] }).data
        : [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map((row) => {
      const venue =
        row.venue && typeof row.venue === "object" ? (row.venue as Record<string, unknown>) : null;
      const venueCity =
        venue?.city && typeof venue.city === "object"
          ? (venue.city as Record<string, unknown>)
          : null;

      return {
        id: String(row.id ?? ""),
        title: typeof row.title === "string" ? row.title : "",
        description: typeof row.description === "string" ? row.description : "",
        imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
        venueName:
          (typeof venueCity?.name === "string" && venueCity.name) ||
          (typeof venue?.name === "string" && venue.name) ||
          "",
        startDate: typeof row.startDate === "string" ? row.startDate : undefined,
        slug: typeof row.slug === "string" ? row.slug : null,
      };
    })
    .filter((event) => Boolean(event.id && event.title));
};

const GuestHome = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<DiscoveryPlace[]>([]);
  const [events, setEvents] = useState<DiscoveryEvent[]>([]);
  const [publicTrips, setPublicTrips] = useState<PublicTripBrowseItem[]>([]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const [placesPayload, eventsPayload, browsePayload] = await Promise.all([
          fetchPublicPlaces(),
          fetchPublicEvents(),
          fetchPublicTripBrowse(6),
        ]);

        if (!active) {
          return;
        }

        setPlaces(extractPlaces(placesPayload).slice(0, 6));
        setEvents(
          extractEvents(eventsPayload)
            .sort((left, right) => {
              const leftTime = left.startDate ? new Date(left.startDate).getTime() : Number.POSITIVE_INFINITY;
              const rightTime = right.startDate ? new Date(right.startDate).getTime() : Number.POSITIVE_INFINITY;
              return leftTime - rightTime;
            })
            .slice(0, 4),
        );
        setPublicTrips(Array.isArray(browsePayload.items) ? browsePayload.items.slice(0, 4) : []);
      } catch (error) {
        if (active) {
          toast.error(
            getApiErrorMessage(
              error,
              t("landing.loadFailed", {
                defaultValue: "Could not load the public home.",
              }),
            ),
          );
          setPlaces([]);
          setEvents([]);
          setPublicTrips([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  const metrics = useMemo(
    () => [
      {
        key: "places",
        value: places.length,
        label: t("landing.metrics.places", { defaultValue: "Featured places" }),
      },
      {
        key: "events",
        value: events.length,
        label: t("landing.metrics.events", { defaultValue: "Upcoming events" }),
      },
      {
        key: "trips",
        value: publicTrips.length,
        label: t("landing.metrics.trips", { defaultValue: "Shared public trips" }),
      },
    ],
    [events.length, places.length, publicTrips.length, t],
  );

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__content">
          <span className="landing-hero__badge">
            {t("landing.hero.badge", {
              defaultValue: "Waynest for discovery and AI trip planning",
            })}
          </span>

          <h1>
            {t("landing.hero.title", {
              defaultValue: "Explore the platform first. Join when you want the social travel layer.",
            })}
          </h1>

          <p className="landing-hero__text">
            {t("landing.hero.description", {
              defaultValue:
                "Browse real places, upcoming events, providers, and public trip ideas. When you are ready for stories, chat, saved plans, and people, sign in.",
            })}
          </p>

          <div className="landing-hero__actions">
            <Link to="/explore" className="btn-primary">
              {t("landing.hero.explore", { defaultValue: "Explore now" })}
            </Link>
            <Link to="/plan" className="btn-secondary">
              {t("landing.hero.plan", { defaultValue: "Open planner" })}
            </Link>
            <Link to="/register" className="landing-hero__ghost">
              {t("landing.hero.join", { defaultValue: "Create account" })}
            </Link>
          </div>
        </div>

        <div className="landing-hero__stats">
          {metrics.map((metric) => (
            <article key={metric.key} className="landing-metric-card">
              <strong>{loading ? "..." : metric.value}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__header">
          <div>
            <p className="landing-section__eyebrow">
              {t("landing.sections.placesEyebrow", { defaultValue: "Places" })}
            </p>
            <h2>{t("landing.sections.placesTitle", { defaultValue: "Start with places worth opening" })}</h2>
          </div>
          <Link to="/explore" className="landing-inline-link">
            {t("landing.sections.viewAllPlaces", { defaultValue: "Open explore" })}
          </Link>
        </div>

        {loading ? (
          <div className="landing-empty-panel">
            {t("common.loading", { defaultValue: "Loading…" })}
          </div>
        ) : places.length === 0 ? (
          <div className="landing-empty-panel">
            {t("landing.empty.places", { defaultValue: "No places are available right now." })}
          </div>
        ) : (
          <div className="landing-card-grid">
            {places.map((place) => (
              <article key={place.id} className="landing-discovery-card">
                {place.imageUrl ? (
                  <img
                    src={place.imageUrl}
                    alt={place.name}
                    className="landing-discovery-card__image"
                  />
                ) : (
                  <div className="landing-discovery-card__image landing-discovery-card__image--placeholder">
                    <span>{place.type || t("landing.placeLabel", { defaultValue: "Place" })}</span>
                  </div>
                )}
                <div className="landing-discovery-card__body">
                  <strong>{place.name}</strong>
                  <span>{place.cityName || place.type || t("landing.placeLabel", { defaultValue: "Place" })}</span>
                  <p>{place.description || t("landing.placeFallback", { defaultValue: "Open the place to see details." })}</p>
                  <Link
                    to={`/places/${encodeURIComponent(place.slug?.trim() ? place.slug : place.id)}`}
                    className="landing-inline-link">
                    {t("landing.actions.viewPlace", { defaultValue: "View place" })}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="landing-grid">
        <article className="landing-panel">
          <div className="landing-section__header">
            <div>
              <p className="landing-section__eyebrow">
                {t("landing.sections.eventsEyebrow", { defaultValue: "Events" })}
              </p>
              <h2>{t("landing.sections.eventsTitle", { defaultValue: "Upcoming events" })}</h2>
            </div>
          </div>

          {loading ? (
            <div className="landing-empty-panel">
              {t("common.loading", { defaultValue: "Loading…" })}
            </div>
          ) : events.length === 0 ? (
            <div className="landing-empty-panel">
              {t("landing.empty.events", { defaultValue: "No upcoming events are available right now." })}
            </div>
          ) : (
            <div className="landing-stack">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${encodeURIComponent(event.slug?.trim() ? event.slug : event.id)}`}
                  className="landing-list-card">
                  <div className="landing-list-card__copy">
                    <strong>{event.title}</strong>
                    <span>{event.venueName || t("landing.eventLabel", { defaultValue: "Event" })}</span>
                  </div>
                  <small>
                    {event.startDate
                      ? new Date(event.startDate).toLocaleDateString()
                      : t("landing.eventAnyTime", { defaultValue: "Open details" })}
                  </small>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="landing-panel">
          <div className="landing-section__header">
            <div>
              <p className="landing-section__eyebrow">
                {t("landing.sections.tripsEyebrow", { defaultValue: "Public trips" })}
              </p>
              <h2>{t("landing.sections.tripsTitle", { defaultValue: "Routes travelers shared publicly" })}</h2>
            </div>
          </div>

          {loading ? (
            <div className="landing-empty-panel">
              {t("common.loading", { defaultValue: "Loading…" })}
            </div>
          ) : publicTrips.length === 0 ? (
            <div className="landing-empty-panel">
              {t("landing.empty.trips", { defaultValue: "No public trips have been shared yet." })}
            </div>
          ) : (
            <div className="landing-stack">
              {publicTrips.map((trip) => (
                <Link
                  key={trip.shareSlug}
                  to={`/trip/${encodeURIComponent(trip.shareSlug)}`}
                  className="landing-list-card">
                  <div className="landing-list-card__copy">
                    <strong>
                      {trip.title?.trim()
                        ? trip.title
                        : t("tripPlanner.savedPlans", { defaultValue: "Saved plan" })}
                    </strong>
                    <span>
                      {t("landing.sharedBy", {
                        defaultValue: "By @{{username}}",
                        username: trip.username,
                      })}
                    </span>
                  </div>
                  <small>{new Date(trip.createdAt).toLocaleDateString()}</small>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
};

const SignedInHome = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<SocialPost[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const payload = await fetchSocialFeed("for-you");
        if (active) {
          setPosts(Array.isArray(payload) ? payload.slice(0, 8) : []);
        }
      } catch (error) {
        if (active) {
          toast.error(
            getApiErrorMessage(
              error,
              t("social.feed.loadFailed", { defaultValue: "Failed to load social feed" }),
            ),
          );
          setPosts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  const uniqueAuthors = useMemo(() => {
    const names = new Set<string>();
    posts.forEach((post) => {
      const name = post.author?.username?.trim();
      if (name) {
        names.add(name);
      }
    });
    return names.size;
  }, [posts]);

  return (
    <main className="landing-page landing-page--signed">
      <section className="landing-home-banner">
        <div className="landing-home-banner__copy">
          <p className="landing-section__eyebrow">
            {t("landing.member.eyebrow", { defaultValue: "Signed-in home" })}
          </p>
          <h1>{t("landing.member.title", { defaultValue: "Your Waynest home is now social, live, and focused." })}</h1>
          <p>
            {t("landing.member.description", {
              defaultValue:
                "Stories and feed stay in the center, while the sidebar keeps saved plans, connection requests, and conversations close without crowding the page.",
            })}
          </p>
        </div>
        <div className="landing-home-banner__meta">
          <div className="landing-home-banner__metric">
            <strong>{loading ? "..." : posts.length}</strong>
            <span>{t("landing.member.posts", { defaultValue: "Recent posts" })}</span>
          </div>
          <div className="landing-home-banner__metric">
            <strong>{loading ? "..." : uniqueAuthors}</strong>
            <span>{t("landing.member.travelers", { defaultValue: "Active travelers" })}</span>
          </div>
          <div className="landing-home-banner__actions">
            <Link to="/plan" className="btn-primary">
              {t("landing.member.plan", { defaultValue: "Open planner" })}
            </Link>
            <Link to="/social" className="btn-secondary">
              {t("landing.member.feed", { defaultValue: "Full community feed" })}
            </Link>
          </div>
        </div>
      </section>

      <Stories posts={posts} />

      {loading ? (
        <p className="social-loading">
          {t("social.feed.loading", { defaultValue: "Loading feed..." })}
        </p>
      ) : posts.length === 0 ? (
        <div className="landing-empty-panel">
          <strong>{t("social.feed.empty", { defaultValue: "No posts in this feed yet." })}</strong>
          <span>
            {t("landing.member.empty", {
              defaultValue: "Your social home will fill up as travelers start publishing plans.",
            })}
          </span>
          <div className="landing-empty-panel__actions">
            <Link to="/plan" className="btn-primary">
              {t("landing.member.emptyAction", { defaultValue: "Create a trip first" })}
            </Link>
          </div>
        </div>
      ) : (
        <div className="social-post-list">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isAuthenticated={isAuthenticated}
              toggleSocialLike={toggleSocialLike}
              saveSocialPost={saveSocialPost}
            />
          ))}
        </div>
      )}
    </main>
  );
};

const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.role !== "ADMIN") {
    return <SignedInHome />;
  }

  return <GuestHome />;
};

export default LandingPage;
