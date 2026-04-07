import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { fetchProviderProfile, getCachedProviderProfile } from "@/api/provider";
import { getDefaultDashboardPath, resolvePersonalPathFromRedirect } from "@/utils/routing";
import { setProviderModeChosen } from "@/utils/providerModeStorage";
import { setActiveWorkspace } from "@/utils/activeWorkspaceStorage";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "@/pages/auth/login/Login.css";
import "./ChooseAccountMode.css";

const ChooseAccountMode = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const redirectTo = location.state?.redirectTo;
  const personalPath = resolvePersonalPathFromRedirect(redirectTo);

  const [providerVisual, setProviderVisual] = useState(
    /** @type {{ logoUrl: string | null; coverPhotoUrl: string | null; displayName: string } | null} */ (
      () => getCachedProviderProfile()
    ),
  );
  const [providerImageFailed, setProviderImageFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchProviderProfile()
      .then((payload) => {
        if (!active || !payload || typeof payload !== "object") {
          return;
        }
        setProviderVisual(payload);
      })
      .catch(() => {
        if (active) {
          setProviderVisual({ logoUrl: null, coverPhotoUrl: null, displayName: "" });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const firstName = user?.firstName?.trim();
  const username = user?.username?.trim();
  const personalLabel = firstName || username || "";
  const providerImageSource = providerVisual?.logoUrl || providerVisual?.coverPhotoUrl;
  const providerImageSrc = providerImageSource ? resolveMediaUrl(providerImageSource) : null;
  const personalAvatarSrc = getResolvedAvatarUrl(user);
  const personalLetter = (firstName?.[0] || username?.[0] || "?").toUpperCase();

  useEffect(() => {
    setProviderImageFailed(false);
  }, [providerImageSrc]);

  const commitChoiceAndNavigate = (path, workspace) => {
    if (user?.id) {
      setProviderModeChosen(user.id);
      setActiveWorkspace(user.id, workspace);
    }
    navigate(path);
  };

  return (
    <div className="choose-account-page container-center">
      <div className="choose-account-card login-card">
        <div className="login-header">
          <h1>{t("login.chooseAccountTitle")}</h1>
          <p>{t("login.chooseAccountSubtitle")}</p>
        </div>

        <div className="choose-account-actions">
          <button
            type="button"
            className="choose-account-option choose-account-option--personal"
            onClick={() => commitChoiceAndNavigate(personalPath, "personal")}>
            <div className="choose-account-option__row">
              <div className="choose-account-option__media">
                {personalAvatarSrc ? (
                  <img
                    src={personalAvatarSrc}
                    alt={personalLabel || t("login.choosePersonal")}
                    className="choose-account-option__avatar choose-account-option__avatar--circle"
                    onError={handleAvatarImageError}
                  />
                ) : (
                  <span
                    className="choose-account-option__avatar choose-account-option__avatar--circle choose-account-option__avatar--fallback choose-account-option__avatar--personal"
                    aria-hidden>
                    {personalLetter}
                  </span>
                )}
              </div>
              <div className="choose-account-option__body">
                <span className="choose-account-option__title">{t("login.choosePersonal")}</span>
                {personalLabel ? (
                  <span className="choose-account-option__name">{personalLabel}</span>
                ) : null}
                <span className="choose-account-option__hint">{t("login.choosePersonalHint")}</span>
              </div>
            </div>
          </button>

          <button
            type="button"
            className="choose-account-option choose-account-option--provider"
            onClick={() =>
              commitChoiceAndNavigate(getDefaultDashboardPath("PROVIDER"), "provider")
            }>
            <div className="choose-account-option__row">
              <div className="choose-account-option__media">
                {providerImageSrc && !providerImageFailed ? (
                  <img
                    src={providerImageSrc}
                    alt={providerVisual?.displayName || t("login.chooseProvider")}
                    onError={() => setProviderImageFailed(true)}
                    className={
                      providerVisual?.logoUrl
                        ? "choose-account-option__avatar choose-account-option__avatar--brand"
                        : "choose-account-option__avatar choose-account-option__avatar--brand choose-account-option__avatar--cover"
                    }
                  />
                ) : providerVisual === null ? (
                  <span
                    className="choose-account-option__avatar choose-account-option__avatar--brand choose-account-option__avatar--skeleton"
                    aria-hidden
                  />
                ) : (
                  <img
                    src="/images/waynest icon.svg"
                    alt=""
                    className="choose-account-option__avatar choose-account-option__avatar--brand choose-account-option__avatar--fallbackImage"
                  />
                )}
              </div>
              <div className="choose-account-option__body">
                <span className="choose-account-option__title">{t("login.chooseProvider")}</span>
                {providerVisual?.displayName ? (
                  <span className="choose-account-option__name">{providerVisual.displayName}</span>
                ) : null}
                <span className="choose-account-option__hint">{t("login.chooseProviderHint")}</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseAccountMode;
