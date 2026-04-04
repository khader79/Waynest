import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProviderProfile } from "@/context/ProviderContext";
import { useProviderPageFollow } from "@/hooks/provider/useProviderPageFollow";
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
    stats,
  } = useProviderProfile();
  const { displayGraph, showFollow, handleFollow, viewerIsOwner } = useProviderPageFollow();

  const reviewsCount = useMemo(() => {
    if (!reviewsByPlace?.length) {
      return 0;
    }
    return reviewsByPlace.reduce((acc, block) => {
      const n = Array.isArray(block?.reviews) ? block.reviews.length : 0;
      return acc + n;
    }, 0);
  }, [reviewsByPlace]);

  useEffect(() => {
    if (!slug) {
      return;
    }
    void loadReviews(slug).catch(() => {});
  }, [slug, loadReviews]);

  return (
    <section className="social-feed-page provider-business provider-business--full">
      <div className="provider-business-shell provider-profile-page">
        <ProviderHeader
          title={profile?.displayName}
          cityLabel={profile?.city?.name ?? null}
          description={profile?.description ?? null}
          loading={profileLoading}
          coverUrl={profile?.coverPhotoUrl}
          logoUrl={profile?.logoUrl}
          stats={stats}
          graph={displayGraph}
          showFollow={showFollow}
          onFollowToggle={handleFollow}
          viewerIsOwner={viewerIsOwner}
        />
        <ProviderTabs />
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
      </div>
    </section>
  );
};

export default ProviderReviewsPage;
