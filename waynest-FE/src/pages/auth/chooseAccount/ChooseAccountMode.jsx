import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import {
  getDefaultDashboardPath,
  resolvePersonalPathFromRedirect,
} from "@/utils/routing";
import { setProviderModeChosen } from "@/utils/providerModeStorage";
import { setActiveWorkspace } from "@/utils/activeWorkspaceStorage";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./ChooseAccountMode.css";

const ChooseAccountMode = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const redirectTo = location.state?.redirectTo;
  const personalPath = resolvePersonalPathFromRedirect(redirectTo);

  const firstName = user?.firstName?.trim();
  const username = user?.username?.trim();
  const personalLabel = firstName || username || "";
  const providerAccount = Array.isArray(user?.accounts)
    ? user.accounts.find((account) => account?.type === "provider")
    : null;
  const providerImageSource =
    providerAccount?.logoUrl || providerAccount?.coverPhotoUrl;
  const providerImageSrc = providerImageSource
    ? resolveMediaUrl(providerImageSource)
    : null;
  const personalAvatarSrc = getResolvedAvatarUrl(user);
  const personalLetter = (firstName?.[0] || username?.[0] || "?").toUpperCase();

  const commitChoiceAndNavigate = (path, workspace) => {
    if (user?.id) {
      setProviderModeChosen(user.id);
      setActiveWorkspace(user.id, workspace);
    }
    navigate(path);
  };

  return (
    <div className="choose-account-page container-center">
      <div className="choose-account-card">
        <div className="choose-account-header">
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
                <span className="choose-account-option__title">
                  {t("login.choosePersonal")}
                </span>
                {personalLabel ? (
                  <span className="choose-account-option__name">
                    {personalLabel}
                  </span>
                ) : null}
                <span className="choose-account-option__hint">
                  {t("login.choosePersonalHint")}
                </span>
              </div>
            </div>
          </button>

          {providerAccount ? (
            <button
              type="button"
              className="choose-account-option choose-account-option--provider"
              onClick={() =>
                commitChoiceAndNavigate(providerAccount.path, "provider")
              }>
              <div className="choose-account-option__row">
                <div className="choose-account-option__media">
                  {providerImageSrc ? (
                    <img
                      src={providerImageSrc}
                      alt={providerAccount.label || t("login.chooseProvider")}
                      className={
                        providerAccount.logoUrl
                          ? "choose-account-option__avatar choose-account-option__avatar--brand"
                          : "choose-account-option__avatar choose-account-option__avatar--brand choose-account-option__avatar--cover"
                      }
                    />
                  ) : (
                    <img
                      src="/images/waynest-icon.svg"
                      alt=""
                      className="choose-account-option__avatar choose-account-option__avatar--brand choose-account-option__avatar--fallbackImage"
                    />
                  )}
                </div>
                <div className="choose-account-option__body">
                  <span className="choose-account-option__title">
                    {t("login.chooseProvider")}
                  </span>
                  <span className="choose-account-option__name">
                    {providerAccount.label}
                  </span>
                  <span className="choose-account-option__hint">
                    {t("login.chooseProviderHint")}
                  </span>
                </div>
              </div>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ChooseAccountMode;
