import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ADMIN_ENDPOINTS, AUTH_ENDPOINTS } from "../../../../api/endpoints";
import { del, get, postJson, postNoBody } from "../../../../api/apiService";
import "./DevicesManager.css";

const DevicesManager = () => {
  const [devices, setDevices] = useState<string[]>([]);
  const [fingerprintInput, setFingerprintInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentFingerprint = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("device_fingerprint");
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await get(ADMIN_ENDPOINTS.ADMIN_DEVICES_LIST);
      setDevices(Array.isArray(data?.devices) ? data.devices : []);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setErrorMessage(msg ?? "Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let value = fingerprintInput.trim();

    if (!value && currentFingerprint) {
      value = currentFingerprint;
    }

    if (!value) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await postJson(ADMIN_ENDPOINTS.ADMIN_DEVICES_ADD, {
        fingerprint: value,
      });
      setDevices(Array.isArray(data?.devices) ? data.devices : devices);
      setFingerprintInput("");
      toast.success("Device added successfully");
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setErrorMessage(msg ?? "Failed to add device");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fingerprint: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await del(ADMIN_ENDPOINTS.ADMIN_DEVICES_DELETE, {
        fingerprint,
      });
      setDevices(Array.isArray(data?.devices) ? data.devices : devices);
      toast.success("Device removed");
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setErrorMessage(msg ?? "Failed to remove device");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    try {
      const data = (await postNoBody(AUTH_ENDPOINTS.INVITE_CREATE)) as {
        token: string;
        expiresAt: string;
      };
      const inviteUrl = `${window.location.origin}/invite?token=${data.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(
        "Invite link copied! Valid for 24 hours. Share it with the person you want to add.",
        { autoClose: 6000 },
      );
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? "Failed to generate invite link");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <section className="devices-manager">
      <div className="devices-manager-header">
        <h2>Allowed Devices</h2>
        <div className="devices-manager-header-actions">
          <button
            type="button"
            className="devices-manager-invite-btn"
            onClick={handleGenerateInvite}
            disabled={inviteLoading}>
            {inviteLoading ? "Generating…" : "Generate Invite Link"}
          </button>
          <button
            type="button"
            className="devices-manager-refresh"
            onClick={fetchDevices}
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

      <form className="devices-manager-form" onSubmit={handleAdd}>
        <input
          type="text"
          className="devices-manager-input"
          placeholder={
            currentFingerprint
              ? "Leave empty to add this device"
              : "Enter device fingerprint manually"
          }
          value={fingerprintInput}
          onChange={(e) => setFingerprintInput(e.target.value)}
        />
        <button
          type="submit"
          className="devices-manager-button"
          disabled={loading}>
          {loading ? "Adding…" : "Add Manually"}
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
                    {fingerprint.slice(0, 16)}…
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
                      onClick={() => handleDelete(fingerprint)}
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
