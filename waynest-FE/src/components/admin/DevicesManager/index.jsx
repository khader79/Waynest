import { useTranslation } from "react-i18next";
import { useDevicesManager } from "@/hooks/admin/useDevicesManager";
import "./DevicesManager.css";

const DevicesManager = () => {
  const { t } = useTranslation();
  const {
    addDevice,
    currentFingerprint,
    devices,
    errorMessage,
    fingerprintInput,
    generateInviteLink,
    inviteLoading,
    loading,
    refreshDevices,
    removeDevice,
    setFingerprintInput,
  } = useDevicesManager();

  const handleSubmit = async (event) => {
    event.preventDefault();
    await addDevice();
  };

  return (
    <section className="devices-manager">
      <div className="devices-manager-header">
        <h2>
          {t("admin.devices.title", { defaultValue: "Allowed Devices" })}
        </h2>
        <div className="devices-manager-header-actions">
          <button
            type="button"
            className="devices-manager-invite-btn"
            onClick={() => void generateInviteLink()}
            disabled={inviteLoading}
          >
            {inviteLoading
              ? t("admin.devices.generating", {
                  defaultValue: "Generating...",
                })
              : t("admin.devices.generateInviteLink", {
                  defaultValue: "Generate Invite Link",
                })}
          </button>
          <button
            type="button"
            className="devices-manager-refresh"
            onClick={() => void refreshDevices()}
            disabled={loading}
          >
            {t("buttons.refresh", { defaultValue: "Refresh" })}
          </button>
        </div>
      </div>

      <div className="devices-manager-invite-info">
        {t("admin.devices.instructions", {
          defaultValue:
            "Generate a one-time invite link and share it with the person you want to allow. They open the link and their device is automatically added. Links expire after 24 hours.",
        })}
      </div>

      <form className="devices-manager-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="devices-manager-input"
          placeholder={
            currentFingerprint
              ? t("admin.devices.placeholderCurrent", {
                  defaultValue: "Leave empty to add this device",
                })
              : t("admin.devices.placeholderManual", {
                  defaultValue: "Enter device fingerprint manually",
                })
          }
          value={fingerprintInput}
          onChange={(event) => setFingerprintInput(event.target.value)}
        />

        <button
          type="submit"
          className="devices-manager-button"
          disabled={loading}
        >
          {loading
            ? t("admin.devices.adding", { defaultValue: "Adding..." })
            : t("admin.devices.addManually", {
                defaultValue: "Add Manually",
              })}
        </button>
      </form>

      {errorMessage && (
        <div className="devices-manager-error">{errorMessage}</div>
      )}

      <div className="devices-manager-table-wrapper">
        <table className="devices-manager-table">
          <thead>
            <tr>
              <th>{t("admin.devices.fingerprint", { defaultValue: "Fingerprint" })}</th>
              <th>{t("admin.devices.status", { defaultValue: "Status" })}</th>
              <th>{t("admin.devices.actions", { defaultValue: "Actions" })}</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={3} className="devices-manager-empty">
                  {t("admin.devices.empty", {
                    defaultValue:
                      "No devices allowed yet. Generate an invite link to add one.",
                  })}
                </td>
              </tr>
            ) : (
              devices.map((fingerprint) => (
                <tr key={fingerprint}>
                  <td className="devices-manager-fingerprint">
                    {fingerprint.slice(0, 16)}...
                  </td>
                  <td>
                    {currentFingerprint === fingerprint && (
                      <span className="devices-manager-badge">
                        {t("admin.devices.currentDevice", {
                          defaultValue: "Current Device",
                        })}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="devices-manager-delete"
                      onClick={() => void removeDevice(fingerprint)}
                      disabled={loading}
                    >
                      {t("buttons.remove", { defaultValue: "Remove" })}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DevicesManager;
