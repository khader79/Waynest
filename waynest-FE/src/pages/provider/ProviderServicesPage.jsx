import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProviderProfile } from "@/context/ProviderContext";
import { useProviderPageFollow } from "@/hooks/provider/useProviderPageFollow";
import ProviderHeader from "@/components/provider/ProviderHeader";
import ProviderTabs from "@/components/provider/ProviderTabs";
import ProviderServiceCard from "@/components/provider/ProviderServiceCard";
import "@/pages/provider/provider-business.css";
import "@/pages/social/SocialFeed.css";

const ProviderServicesPage = () => {
  const { t } = useTranslation();
  const {
    profile,
    places,
    placesLoading,
    loadServices,
    slug,
    profileLoading,
    stats,
  } = useProviderProfile();
  const { displayGraph, followLoading, showFollow, handleFollow, viewerIsOwner } =
    useProviderPageFollow();

  useEffect(() => {
    if (!slug) {
      return;
    }
    void loadServices(slug).catch(() => {});
  }, [slug, loadServices]);

  const cityLabel = profile?.city?.name ?? null;
  const placesCount = places.length;

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
      </div>
    </section>
  );
};

export default ProviderServicesPage;
