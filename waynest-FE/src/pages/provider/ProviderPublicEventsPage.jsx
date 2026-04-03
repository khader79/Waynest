import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProviderProfile } from "@/context/ProviderContext";
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

  const cityLabel = profile?.city?.name ?? null;

  return (
    <section className="social-feed-page provider-business provider-business--wide">
      <ProviderHeader
        title={profile?.displayName}
        cityLabel={cityLabel}
        loading={profileLoading}
        coverUrl={profile?.coverPhotoUrl}
        logoUrl={profile?.logoUrl}
        stats={stats}
      />
      <ProviderTabs />
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
  );
};

export default ProviderPublicEventsPage;
