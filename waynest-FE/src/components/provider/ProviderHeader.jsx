import { useTranslation } from "react-i18next";

/**
 * @param {{
 *   title?: string,
 *   cityLabel?: string | null,
 *   loading?: boolean,
 *   graph?: { followersCount: number, followingCount: number, following: boolean } | null,
 *   showFollow?: boolean,
 *   onFollowToggle?: () => void,
 * }} props
 */
const ProviderHeader = ({
  title,
  cityLabel,
  loading = false,
  graph = null,
  showFollow = false,
  onFollowToggle,
}) => {
  const { t } = useTranslation();

  return (
    <div className="social-feed-header social-provider-header">
      <div className="social-provider-header__left">
        <h1 className="provider-business__title">
          {loading
            ? t("provider.business.loadingTitle", { defaultValue: "Loading…" })
            : title ||
              t("social.providerProfile.title", { defaultValue: "Provider Profile" })}
        </h1>
        {cityLabel ? (
          <p className="provider-business__subtitle">{cityLabel}</p>
        ) : null}

        {graph ? (
          <div className="social-provider-stats">
            <div className="social-provider-stat">
              <strong>{graph.followersCount}</strong>
              <span>
                {t("social.providerProfile.followers", { defaultValue: "Followers" })}
              </span>
            </div>
            <div className="social-provider-stat">
              <strong>{graph.followingCount}</strong>
              <span>
                {t("social.providerProfile.following", { defaultValue: "Following" })}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {showFollow && graph ? (
        <div className="social-provider-actions">
          <button
            type="button"
            className="social-feed-header__btn"
            onClick={onFollowToggle}
          >
            {graph.following
              ? t("social.unfollow", { defaultValue: "Unfollow" })
              : t("social.follow", { defaultValue: "Follow" })}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ProviderHeader;
