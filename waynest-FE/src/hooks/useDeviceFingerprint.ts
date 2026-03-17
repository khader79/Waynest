import { useEffect, useState } from "react";

const STORAGE_KEY = "device_fingerprint";

export const useDeviceFingerprint = () => {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      setFingerprint(existing);
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
      localStorage.setItem(STORAGE_KEY, newFingerprint);
      setFingerprint(newFingerprint);
    } else {
      setFingerprint(null);
    }
  }, []);

  return { fingerprint };
};
