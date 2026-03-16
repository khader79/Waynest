import { useEffect, useMemo, useState } from "react";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { del, get, postJson } from "../../../../api/apiService";
import "./DevicesManager.css";

const DevicesManager = () => {
  const [devices, setDevices] = useState<string[]>([]);
  const [fingerprintInput, setFingerprintInput] = useState("");
  const [loading, setLoading] = useState(false);
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
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || "Failed to load devices",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAdd = async (e: React.ChangeEvent) => {
    e.preventDefault();
    const value = fingerprintInput.trim();
    if (!value) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await postJson(ADMIN_ENDPOINTS.ADMIN_DEVICES_ADD, {
        fingerprint: value,
      });
      setDevices(Array.isArray(data?.devices) ? data.devices : devices);
      setFingerprintInput("");
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || "Failed to add device");
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
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || "Failed to remove device",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="devices-manager">
      <div className="devices-manager-header">
        <h2>Allowed Devices</h2>
        <button
          type="button"
          className="devices-manager-refresh"
          onClick={fetchDevices}
          disabled={loading}>
          Refresh
        </button>
      </div>

      <form className="devices-manager-form" onSubmit={handleAdd}>
        <input
          type="text"
          className="devices-manager-input"
          placeholder="Enter device fingerprint"
          value={fingerprintInput}
          onChange={(e) => setFingerprintInput(e.target.value)}
        />
        <button
          type="submit"
          className="devices-manager-button"
          disabled={loading}>
          Add Device
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
            {devices.length === 0 && (
              <tr>
                <td colSpan={3} className="devices-manager-empty">
                  No devices found
                </td>
              </tr>
            )}
            {devices.map((fingerprint) => (
              <tr key={fingerprint}>
                <td>{fingerprint.slice(0, 12)}</td>
                <td>
                  {currentFingerprint === fingerprint && (
                    <span className="devices-manager-badge">جهازك الحالي</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="devices-manager-delete"
                    onClick={() => handleDelete(fingerprint)}
                    disabled={loading}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DevicesManager;
