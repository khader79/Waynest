import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { resolveMediaUrl } from "@/utils/mediaUrl";

/**
 * @param {{
 *   title?: string,
 *   cityLabel?: string | null,
 *   description?: string | null,
 *   loading?: boolean,
 *   coverUrl?: string | null,
 *   logoUrl?: string | null,
 *   stats?: {
 *     totalPlaces?: number,
 *     totalBookings?: number,
 *     totalReviews?: number,
 *     averageRating?: number,
 *   } | null,
 *   graph?: { followersCount: number, followingCount: number, following: boolean } | null,
 *   showFollow?: boolean,
 *   onFollowToggle?: () => void,
 *   showShare?: boolean,
 * }} props
 */
const ProviderHeader = ({
  title,
  cityLabel,
  description = null,
  loading = false,
  coverUrl = null,
  logoUrl = null,
  stats = null,
  graph = null,
  showFollow = false,
  onFollowToggle,
  showShare = true,
}) => {
  const { t } = useTranslation();
  const location = useLocation();

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${location.pathname}${location.search}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(
        t("provider.business.linkCopied", { defaultValue: "Link copied to clipboard" }),
      );
    } catch {
      toast.error(
        t("provider.business.linkCopyFailed", { defaultValue: "Could not copy link" }),
      );
    }
  };

  const displayTitle = loading
    ? t("provider.business.loadingTitle", { defaultValue: "Loading…" })
    : title || t("social.providerProfile.title", { defaultValue: "Provider Profile" });

  const coverResolved =
    coverUrl && typeof coverUrl === "string" && coverUrl.trim()
      ? resolveMediaUrl(coverUrl.trim())
      : null;
  const logoResolved =
    logoUrl && typeof logoUrl === "string" && logoUrl.trim()
      ? resolveMediaUrl(logoUrl.trim())
      : null;

  const heroStyle = coverResolved
    ? {
        backgroundImage: `linear-gradient(120deg, rgba(15,18,28,0.88), rgba(15,18,28,0.5)), url(${coverResolved})`,
      }
    : undefined;

  return (
    <header
      className={`provider-hero${coverResolved ? " provider-hero--cover" : " provider-hero--plain"}`}
      style={heroStyle}
    >
      <div className="provider-hero__inner">
        <div className="provider-hero__identity">
          {logoResolved ? (
            <div className="provider-hero__logo-wrap">
              <img src={logoResolved} alt="" className="provider-hero__logo" />
            </div>
          ) : null}
          <div className="provider-hero__titles">
            <h1 className="provider-business__title provider-hero__title">{displayTitle}</h1>
            {cityLabel ? <p className="provider-business__subtitle">{cityLabel}</p> : null}
            {description ? (
              <p className="provider-hero__description">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="provider-hero__actions">
          {showShare ? (
            <button type="button" className="provider-hero__btn" onClick={handleCopyLink}>
              {t("provider.business.sharePage", { defaultValue: "Share page" })}
            </button>
          ) : null}
          {showFollow && graph ? (
            <button type="button" className="provider-hero__btn provider-hero__btn--primary" onClick={onFollowToggle}>
              {graph.following
                ? t("social.unfollow", { defaultValue: "Unfollow" })
                : t("social.follow", { defaultValue: "Follow" })}
            </button>
          ) : null}
        </div>
      </div>

      {stats ? (
        <ul className="provider-hero__stats" aria-label={t("provider.business.statsLabel", { defaultValue: "Stats" })}>
          <li>
            <strong>{stats.totalPlaces ?? 0}</strong>
            <span>{t("provider.business.statPlaces", { defaultValue: "Places" })}</span>
          </li>
          <li>
            <strong>{Number(stats.averageRating ?? 0).toFixed(1)}</strong>
            <span>{t("provider.business.statRating", { defaultValue: "Avg rating" })}</span>
          </li>
          <li>
            <strong>{stats.totalReviews ?? 0}</strong>
            <span>{t("provider.business.statReviews", { defaultValue: "Reviews" })}</span>
          </li>
          <li>
            <strong>{stats.totalBookings ?? 0}</strong>
            <span>{t("provider.business.statBookings", { defaultValue: "Bookings" })}</span>
          </li>
        </ul>
      ) : null}

      {graph ? (
        <div className="provider-hero__social-stats">
          <div className="social-provider-stat">
            <strong>{graph.followersCount}</strong>
            <span>{t("social.providerProfile.followers", { defaultValue: "Followers" })}</span>
          </div>
          <div className="social-provider-stat">
            <strong>{graph.followingCount}</strong>
            <span>{t("social.providerProfile.following", { defaultValue: "Following" })}</span>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default ProviderHeader;
