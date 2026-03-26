import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { STORAGE_KEYS } from "@/core/constants/storageKeys";
import { getApiErrorMessage } from "@/core/utils/errors";
import { copyTextToClipboard } from "@/core/utils/clipboard";
import { createInviteLink } from "@/modules/public/api/auth";
import { devicesAdminService } from "@/modules/admin/api";

export const useDevicesManager = () => {
  const [devices, setDevices] = useState([]);
  const [fingerprintInput, setFingerprintInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const currentFingerprint = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem(STORAGE_KEYS.deviceFingerprint);
  }, []);

  const refreshDevices = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await devicesAdminService.list();
      setDevices(Array.isArray(data?.devices) ? data.devices : []);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Failed to load devices"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshDevices();
  }, []);

  const addDevice = async () => {
    let fingerprint = fingerprintInput.trim();

    if (!fingerprint && currentFingerprint) {
      fingerprint = currentFingerprint;
    }

    if (!fingerprint) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await devicesAdminService.add(fingerprint);
      setDevices((currentDevices) =>
      Array.isArray(data.devices) ? data.devices : currentDevices
      );
      setFingerprintInput("");
      toast.success("Device added successfully");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Failed to add device"));
    } finally {
      setLoading(false);
    }
  };

  const removeDevice = async (fingerprint) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await devicesAdminService.remove(fingerprint);
      setDevices((currentDevices) =>
      Array.isArray(data.devices) ? data.devices : currentDevices
      );
      toast.success("Device removed");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Failed to remove device"));
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = async () => {
    setInviteLoading(true);

    try {
      const invite = await createInviteLink();
      const inviteUrl = `${window.location.origin}/invite?token=${invite.token}`;
      await copyTextToClipboard(inviteUrl);
      toast.success(
        "Invite link copied! Valid for 24 hours. Share it with the person you want to add.",
        { autoClose: 6000 }
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to generate invite link"));
    } finally {
      setInviteLoading(false);
    }
  };

  return {
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
    setFingerprintInput
  };
};