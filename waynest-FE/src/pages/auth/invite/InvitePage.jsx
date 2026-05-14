import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInviteActivation } from "@/hooks/public/useInviteActivation";
import "./InvitePage.css";

const InvitePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message, status } = useInviteActivation();

  return (
    <div className="invite-page container-center">
      <div className="invite-card">
        {status === "loading" && (
          <>
            <div className="invite-spinner" />
            <p className="invite-message">
              {t("invite.activating", {
                defaultValue: "Activating your device...",
              })}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="invite-icon invite-icon--success">✓</div>
            <h1 className="invite-title">
              {t("invite.deviceActivated", {
                defaultValue: "Device Activated",
              })}
            </h1>
            <p className="invite-message">{message}</p>
            <button className="invite-btn" onClick={() => navigate("/login")}>
              {t("invite.goToLogin", { defaultValue: "Go to Login" })}
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="invite-icon invite-icon--error">✕</div>
            <h1 className="invite-title">
              {t("invite.linkInvalid", { defaultValue: "Link Invalid" })}
            </h1>
            <p className="invite-message">{message}</p>
            <Link to="/" className="invite-btn invite-btn--secondary">
              {t("invite.goToHome", { defaultValue: "Go to Home" })}
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
