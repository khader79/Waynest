import { useEffect } from "react";
import { STORAGE_KEYS } from "@/core/constants/storageKeys";

export const useDeviceFingerprint = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const existing = localStorage.getItem(STORAGE_KEYS.deviceFingerprint);
    if (existing) {
      return;
    }

    const generateFingerprint = () => {
      try {
        const navigatorInfo = typeof navigator !== "undefined"
          ? `${navigator.userAgent}|${navigator.language}`
          : "unknown-navigator";
        const screenInfo =
          typeof screen !== "undefined"
            ? `${screen.width}x${screen.height}|${screen.colorDepth}`
            : "unknown-screen";
        const timezone =
          typeof Intl !== "undefined" && Intl.DateTimeFormat
            ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown-timezone"
            : "unknown-timezone";

        const raw = `${navigatorInfo}|${screenInfo}|${timezone}`;
        return btoa(unescape(encodeURIComponent(raw)));
      } catch {
        return null;
      }
    };

    const newFingerprint = generateFingerprint();

    if (newFingerprint) {
      localStorage.setItem(STORAGE_KEYS.deviceFingerprint, newFingerprint);
    }
  }, []);
};
