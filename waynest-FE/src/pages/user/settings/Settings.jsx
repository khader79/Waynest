import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/api/user";
import "./Settings.css";

const Settings = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  const [pwSaving, setPwSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Allowed-devices removed per UI decision — only password change remains.

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
    } catch (err) {
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
    <section className="settings-page">
      <h1 className="settings-title">
        {t("settings.title", { defaultValue: "Account settings" })}
      </h1>

      <section className="settings-section">
        <h2>
          {t("settings.passwordSection", { defaultValue: "Change password" })}
        </h2>
        <form className="settings-form" onSubmit={handleChangePassword}>
          <label className="settings-field">
            <span>
              {t("settings.newPassword", { defaultValue: "New password" })}
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
            />
          </label>

          <label className="settings-field">
            <span>
              {t("settings.confirmPassword", {
                defaultValue: "Confirm password",
              })}
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
            />
          </label>

          <div className="settings-actions">
            <button
              type="submit"
              disabled={
                pwSaving ||
                newPassword !== confirmPassword ||
                newPassword.length < 8
              }>
              {pwSaving
                ? t("settings.saving", { defaultValue: "Saving..." })
                : t("settings.savePassword", { defaultValue: "Save password" })}
            </button>
          </div>
        </form>
      </section>

      {/* Allowed devices section removed */}
    </section>
  );
};

export default Settings;
