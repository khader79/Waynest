import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProviderProfile } from "@/context/ProviderContext";
import ProviderHeader from "@/components/provider/ProviderHeader";
import ProviderTabs from "@/components/provider/ProviderTabs";
import ProviderReviewList from "@/components/provider/ProviderReviewList";
import "@/pages/provider/provider-business.css";
import "@/pages/social/SocialFeed.css";

const ProviderReviewsPage = () => {
  const { t } = useTranslation();
  const {
    profile,
    reviewsByPlace,
    reviewsLoading,
    loadReviews,
    slug,
    profileLoading,
  } = useProviderProfile();

  useEffect(() => {
    if (!slug) {
      return;
    }
    void loadReviews(slug).catch(() => {});
  }, [slug, loadReviews]);

  return (
    <section className="social-feed-page provider-business">
      <ProviderHeader
        title={profile?.displayName}
        cityLabel={profile?.city?.name ?? null}
        loading={profileLoading}
      />
      <ProviderTabs />
      <h2 className="social-provider-section-title">
        {t("provider.business.reviewsTitle", { defaultValue: "Reviews" })}
      </h2>
      {reviewsLoading ? (
        <p>{t("common.loading", { defaultValue: "Loading…" })}</p>
      ) : (
        <ProviderReviewList blocks={reviewsByPlace} />
      )}
    </section>
  );
};

export default ProviderReviewsPage;
