import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Link, useLocation } from "react-router-dom";
import { useProviderProfile } from "@/context/ProviderContext";
import { useAuth } from "@/context/AuthContext";
import { resolveMediaUrl } from "@/utils/mediaUrl";

const ACCOUNT_PUBLIC_PREFIX = "/account/provider/public";
const ACCOUNT_PROVIDER_PREFIX = "/account/provider";

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
 *   followLoading?: boolean,
 *   onFollowToggle?: () => void,
 *   showShare?: boolean,
 *   viewerIsOwner?: boolean,
 *   ownerUsername?: string | null,
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
  followLoading = false,
  onFollowToggle,
  showShare = true,
  viewerIsOwner = false,
  ownerUsername = null,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { slug: profileSlug } = useProviderProfile();

  const handleCopyLink = async () => {
    let pathWithSearch = `${location.pathname}${location.search}`;
    if (profileSlug && typeof profileSlug === "string") {
      if (location.pathname.startsWith(ACCOUNT_PUBLIC_PREFIX)) {
        const rest =
          location.pathname.slice(ACCOUNT_PUBLIC_PREFIX.length) || "";
        pathWithSearch = `/p/${encodeURIComponent(profileSlug.trim())}${rest}${location.search}`;
      } else if (location.pathname.startsWith(ACCOUNT_PROVIDER_PREFIX)) {
        const rest =
          location.pathname.slice(ACCOUNT_PROVIDER_PREFIX.length) || "";
        pathWithSearch = `/p/${encodeURIComponent(profileSlug.trim())}${rest}${location.search}`;
      }
    }
    const url = `${window.location.origin}${pathWithSearch}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(
        t("provider.business.linkCopied", {
          defaultValue: "Link copied to clipboard",
        }),
      );
    } catch {
      toast.error(
        t("provider.business.linkCopyFailed", {
          defaultValue: "Could not copy link",
        }),
      );
    }
  };

  const displayTitle = loading
    ? t("provider.business.loadingTitle", { defaultValue: "Loading…" })
    : title ||
      t("social.providerProfile.title", { defaultValue: "Provider Profile" });

  const coverResolved =
    coverUrl && typeof coverUrl === "string" && coverUrl.trim()
      ? resolveMediaUrl(coverUrl.trim())
      : null;
  const logoResolved =
    logoUrl && typeof logoUrl === "string" && logoUrl.trim()
      ? resolveMediaUrl(logoUrl.trim())
      : null;

  const ownerHandle =
    typeof ownerUsername === "string" && ownerUsername.trim()
      ? ownerUsername.trim()
      : null;

  const ownerProfileTo = ownerHandle
    ? `/u/${encodeURIComponent(ownerHandle)}`
    : null;

  const fromPath = `${location.pathname}${location.search}`;
  const messageTo = isAuthenticated ? "/social" : "/login";
  const messageState = isAuthenticated ? undefined : { from: fromPath };
  const searchTo = `/search?q=${encodeURIComponent(displayTitle)}`;

  const coverStyle = coverResolved
    ? {
        backgroundImage: `linear-gradient(120deg, var(--provider-hero-cover-overlay-start), var(--provider-hero-cover-overlay-end)), url(${coverResolved})`,
      }
    : undefined;

  return (
    <header
      className={`provider-hero${coverResolved ? " provider-hero--cover" : " provider-hero--plain"}`}>
      <div
        className={`provider-hero__cover${coverResolved ? "" : " provider-hero__cover--fallback"}`}
        style={coverStyle}
        aria-hidden
      />

      <div className="provider-hero__sheet">
        <div className="provider-hero__inner">
          <div className="provider-hero__identity">
            {logoResolved ? (
              <div className="provider-hero__logo-wrap">
                <img
                  src={logoResolved}
                  alt=""
                  className="provider-hero__logo"
                />
              </div>
            ) : null}
            <div className="provider-hero__titles">
              <p className="provider-hero__eyebrow">
                {t("provider.business.profileEyebrow", {
                  defaultValue: "Business page",
                })}
              </p>
              <h1 className="provider-business__title provider-hero__title">
                {displayTitle}
              </h1>

              {graph ? (
                <div className="provider-hero__connections" role="list">
                  <span className="provider-hero__connection" role="listitem">
                    <strong>{graph.followersCount}</strong>
                    <span>
                      {t("social.providerProfile.followers", {
                        defaultValue: "Followers",
                      })}
                    </span>
                  </span>
                  <span className="provider-hero__connection" role="listitem">
                    <strong>{graph.followingCount}</strong>
                    <span>
                      {t("social.providerProfile.following", {
                        defaultValue: "Following",
                      })}
                    </span>
                  </span>
                </div>
              ) : null}

              {ownerProfileTo ? (
                <p className="provider-hero__ownerLine">
                  <span>
                    {t("provider.business.managedBy", {
                      defaultValue: "Managed by",
                    })}
                  </span>
                  <Link
                    to={ownerProfileTo}
                    className="provider-hero__ownerLink">
                    @{ownerHandle}
                  </Link>
                </p>
              ) : null}

              {cityLabel ? (
                <p className="provider-business__subtitle">{cityLabel}</p>
              ) : null}
              {description ? (
                <p className="provider-hero__description">{description}</p>
              ) : null}
            </div>
          </div>

          <div className="provider-hero__actions">
            {!viewerIsOwner ? (
              <Link
                to={messageTo}
                state={messageState}
                className="provider-hero__btn provider-hero__btn--message">
                {t("social.message", { defaultValue: "Message" })}
              </Link>
            ) : null}

            {showFollow ? (
              <button
                type="button"
                className="provider-hero__btn provider-hero__btn--primary provider-hero__btn--follow"
                onClick={onFollowToggle}
                disabled={followLoading}
                aria-busy={followLoading || undefined}
                aria-label={
                  graph?.following
                    ? t("social.unfollow", { defaultValue: "Unfollow" })
                    : t("social.follow", { defaultValue: "Follow" })
                }>
                {graph?.following
                  ? t("social.unfollow", { defaultValue: "Following" })
                  : t("social.follow", { defaultValue: "Follow" })}
              </button>
            ) : null}

            <Link
              to={searchTo}
              className="provider-hero__btn provider-hero__btn--search">
              {t("common.search", { defaultValue: "Search" })}
            </Link>

            {showShare ? (
              <button
                type="button"
                className="provider-hero__btn provider-hero__btn--share"
                onClick={handleCopyLink}>
                {t("provider.business.sharePage", { defaultValue: "Share" })}
              </button>
            ) : null}

            {viewerIsOwner ? (
              <span className="provider-hero__own-pill" role="status">
                {t("provider.business.yourBusinessPage", {
                  defaultValue: "Your business page",
                })}
              </span>
            ) : null}
          </div>
        </div>

        {stats ? (
          <ul
            className="provider-hero__stats"
            aria-label={t("provider.business.statsLabel", {
              defaultValue: "Stats",
            })}>
            <li>
              <strong>{stats.totalPlaces ?? 0}</strong>
              <span>
                {t("provider.business.statPlaces", { defaultValue: "Places" })}
              </span>
            </li>
            <li>
              <strong>{Number(stats.averageRating ?? 0).toFixed(1)}</strong>
              <span>
                {t("provider.business.statRating", {
                  defaultValue: "Avg rating",
                })}
              </span>
            </li>
            <li>
              <strong>{stats.totalReviews ?? 0}</strong>
              <span>
                {t("provider.business.statReviews", {
                  defaultValue: "Reviews",
                })}
              </span>
            </li>
          </ul>
        ) : null}
      </div>
    </header>
  );
};

export default ProviderHeader;
