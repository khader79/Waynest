import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useProviderProfile } from "@/context/ProviderContext";
import { useAuth } from "@/context/AuthContext";
import { useGlobalShare } from "@/context/GlobalShareContext";
import { getApiErrorMessage } from "@/utils/errors";
import { createConversation, fetchInbox } from "@/api/social";
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
 *   messageTargetUserId?: string | null,
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
  messageTargetUserId = null,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { openShare } = useGlobalShare();
  const { slug: profileSlug } = useProviderProfile();
  const [messageLoading, setMessageLoading] = useState(false);

  const displayTitle = loading
    ? t("provider.business.loadingTitle", { defaultValue: "Loading…" })
    : title ||
      t("social.providerProfile.title", { defaultValue: "Provider Profile" });

  const handleSharePage = () => {
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

    openShare({
      dialogTitle: t("provider.business.sharePage", {
        defaultValue: "Share",
      }),
      title: displayTitle,
      text:
        description?.trim() ||
        cityLabel?.trim() ||
        t("provider.business.profileEyebrow", {
          defaultValue: "Business page",
        }),
      url,
    });
  };

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

  const messageParticipantId =
    typeof messageTargetUserId === "string" && messageTargetUserId.trim()
      ? messageTargetUserId.trim()
      : null;

  const safeMessageParticipantId =
    messageParticipantId &&
    !(user?.id && String(user.id) === String(messageParticipantId))
      ? messageParticipantId
      : null;

  const fromPath = `${location.pathname}${location.search}`;

  const coverStyle = coverResolved
    ? {
        backgroundImage: `linear-gradient(120deg, var(--provider-hero-cover-overlay-start), var(--provider-hero-cover-overlay-end)), url(${coverResolved})`,
      }
    : undefined;

  const findDirectConversationId = useCallback(async (peerUserId) => {
    const inbox = await fetchInbox();
    const direct = Array.isArray(inbox)
      ? inbox.find((conv) => {
          if (!conv || conv.isGroup || !Array.isArray(conv.members)) {
            return false;
          }
          return conv.members.some(
            (member) =>
              member?.userId && String(member.userId) === String(peerUserId),
          );
        })
      : null;
    return direct?.id ?? null;
  }, []);

  const handleMessage = useCallback(async () => {
    if (viewerIsOwner || !safeMessageParticipantId || messageLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", { state: { from: fromPath } });
      return;
    }

    setMessageLoading(true);
    try {
      let conversationId = null;
      try {
        conversationId = await findDirectConversationId(
          safeMessageParticipantId,
        );
      } catch {
        conversationId = null;
      }

      if (!conversationId) {
        const created = await createConversation({
          participantIds: [safeMessageParticipantId],
        });
        conversationId =
          created?.conversation?.id ?? created?.conversationId ?? null;
      }

      if (!conversationId) {
        toast.error(
          t("social.inbox.createFailed", {
            defaultValue: "Failed to open chat",
          }),
        );
        return;
      }

      navigate(`/inbox/${encodeURIComponent(String(conversationId))}`);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.inbox.createFailed", {
            defaultValue: "Failed to open chat",
          }),
        ),
      );
    } finally {
      setMessageLoading(false);
    }
  }, [
    viewerIsOwner,
    safeMessageParticipantId,
    messageLoading,
    isAuthenticated,
    navigate,
    fromPath,
    findDirectConversationId,
    t,
  ]);

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
              <button
                type="button"
                className="provider-hero__btn provider-hero__btn--message"
                onClick={handleMessage}
                disabled={messageLoading || !safeMessageParticipantId}
                aria-busy={messageLoading || undefined}>
                {messageLoading
                  ? t("social.inbox.opening", {
                      defaultValue: "Opening...",
                    })
                  : t("social.message", { defaultValue: "Message" })}
              </button>
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

            {showShare ? (
              <button
                type="button"
                className="provider-hero__btn provider-hero__btn--share"
                onClick={handleSharePage}>
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
