import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProviderProfile } from "@/context/ProviderContext";
import { useProviderPageFollow } from "@/hooks/provider/useProviderPageFollow";
import ProviderHeader from "@/components/provider/ProviderHeader";
import ProviderTabs from "@/components/provider/ProviderTabs";
import "@/pages/provider/provider-business.css";
import "@/pages/social/SocialFeed.css";

const eventHref = (event) => {
  const id = event?.id;
  return id ? `/events/${encodeURIComponent(id)}` : "#";
};

const ProviderPublicEventsPage = () => {
  const { t } = useTranslation();
  const { profile, upcomingEvents, profileLoading, stats } = useProviderProfile();
  const { displayGraph, followLoading, showFollow, handleFollow, viewerIsOwner } =
    useProviderPageFollow();

  const cityLabel = profile?.city?.name ?? null;
  const eventsCount = upcomingEvents?.length ?? 0;

  return (
    <section className="social-feed-page provider-business provider-business--full">
      <div className="provider-business-shell provider-profile-page">
        <ProviderHeader
          title={profile?.displayName}
          cityLabel={cityLabel}
          description={profile?.description ?? null}
          loading={profileLoading}
          coverUrl={profile?.coverPhotoUrl}
          logoUrl={profile?.logoUrl}
          stats={stats}
          graph={displayGraph}
          showFollow={showFollow}
          followLoading={followLoading}
          onFollowToggle={handleFollow}
          viewerIsOwner={viewerIsOwner}
        />
        <ProviderTabs showReviews={false} />
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
      </div>
    </section>
  );
};

export default ProviderPublicEventsPage;
