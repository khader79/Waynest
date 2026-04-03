import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProviderProfile } from "@/context/ProviderContext";
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
  } = useProviderProfile();

  useEffect(() => {
    if (!slug) {
      return;
    }
    void loadServices(slug).catch(() => {});
  }, [slug, loadServices]);

  const cityLabel = profile?.city?.name ?? null;

  return (
    <section className="social-feed-page provider-business">
      <ProviderHeader
        title={profile?.displayName}
        cityLabel={cityLabel}
        loading={profileLoading}
      />
      <ProviderTabs />
      <h2 className="social-provider-section-title">
        {t("provider.business.placesTitle", { defaultValue: "Places" })}
      </h2>
      {placesLoading ? (
        <p>{t("common.loading", { defaultValue: "Loading…" })}</p>
      ) : places.length === 0 ? (
        <p>
          {t("provider.business.noPlaces", {
            defaultValue: "No places listed yet.",
          })}
        </p>
      ) : (
        places.map((p) => <ProviderServiceCard key={p.id} place={p} />)
      )}
    </section>
  );
};

export default ProviderServicesPage;
