import type { FormEvent } from "react";
import { useDevicesManager } from "../../hooks/useDevicesManager";
import "./DevicesManager.css";

const DevicesManager = () => {
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await addDevice();
  };

  return (
    <section className="devices-manager">
      <div className="devices-manager-header">
        <h2>Allowed Devices</h2>
        <div className="devices-manager-header-actions">
          <button
            type="button"
            className="devices-manager-invite-btn"
            onClick={() => void generateInviteLink()}
            disabled={inviteLoading}>
            {inviteLoading ? "Generating..." : "Generate Invite Link"}
          </button>
          <button
            type="button"
            className="devices-manager-refresh"
            onClick={() => void refreshDevices()}
            disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="devices-manager-invite-info">
        Generate a one-time invite link and share it with the person you want
        to allow. They open the link and their device is automatically added.
        Links expire after 24 hours.
      </div>

      <form className="devices-manager-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="devices-manager-input"
          placeholder={
            currentFingerprint
              ? "Leave empty to add this device"
              : "Enter device fingerprint manually"
          }
          value={fingerprintInput}
          onChange={(event) => setFingerprintInput(event.target.value)}
        />
        <button
          type="submit"
          className="devices-manager-button"
          disabled={loading}>
          {loading ? "Adding..." : "Add Manually"}
        </button>
      </form>

      {errorMessage && (
        <div className="devices-manager-error">{errorMessage}</div>
      )}

      <div className="devices-manager-table-wrapper">
        <table className="devices-manager-table">
          <thead>
            <tr>
              <th>Fingerprint</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={3} className="devices-manager-empty">
                  No devices allowed yet. Generate an invite link to add one.
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
                        Current Device
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="devices-manager-delete"
                      onClick={() => void removeDevice(fingerprint)}
                      disabled={loading}>
                      Remove
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
