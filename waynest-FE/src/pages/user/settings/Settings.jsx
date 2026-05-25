import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FiSettings, FiSave, FiLock } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/api/user";
import "./Settings.css";

const Settings = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  const [pwSaving, setPwSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!newPassword || newPassword.length < 8) {
      toast.error(
        t("settings.passwordTooShort", {
          defaultValue: "Password must be at least 8 characters",
        }),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(
        t("settings.passwordMismatch", {
          defaultValue: "Passwords do not match",
        }),
      );
      return;
    }

    try {
      setPwSaving(true);
      await updateUserProfile(user.id, { password: newPassword });
      await refreshUser();
      toast.success(
        t("settings.passwordSaved", { defaultValue: "Password updated" }),
      );
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error(
        t("settings.savePasswordError", {
          defaultValue: "Failed to update password",
        }),
      );
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-hero">
        <div className="settings-hero-bg" />
        <FiSettings className="settings-hero-icon" size={26} />
        <h1 className="settings-hero-title">
          {t("settings.title", { defaultValue: "Account settings" })}
        </h1>
        <p className="settings-hero-sub">
          {t("settings.subtitle", {
            defaultValue: "Manage your account security and preferences",
          })}
        </p>
      </div>

      <div className="settings-content">
        <section className="settings-card">
          <div className="settings-card-header">
            <FiLock size={18} />
            <h2>
              {t("settings.passwordSection", { defaultValue: "Change password" })}
            </h2>
          </div>
          <form className="settings-form" onSubmit={handleChangePassword}>
            <label className="settings-field">
              <span>
                {t("settings.newPassword", { defaultValue: "New password" })}
              </span>
              <div className="settings-pw-wrap">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="settings-pw-toggle"
                  onClick={() => setShowNew(!showNew)}
                  tabIndex={-1}
                >
                  {showNew ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
              </div>
            </label>

            <label className="settings-field">
              <span>
                {t("settings.confirmPassword", {
                  defaultValue: "Confirm password",
                })}
              </span>
              <div className="settings-pw-wrap">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="settings-pw-toggle"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                >
                  {showConfirm ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
              </div>
            </label>

            <div className="settings-actions">
              <button
                type="submit"
                className="settings-save-btn"
                disabled={
                  pwSaving ||
                  newPassword !== confirmPassword ||
                  newPassword.length < 8
                }>
                <FiSave size={15} />
                {pwSaving
                  ? t("settings.saving", { defaultValue: "Saving..." })
                  : t("settings.savePassword", { defaultValue: "Save password" })}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Settings;
