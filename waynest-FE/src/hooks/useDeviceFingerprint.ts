import { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

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

    let isMounted = true;

    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        if (!isMounted) return;
        localStorage.setItem(STORAGE_KEY, result.visitorId);
        setFingerprint(result.visitorId);
      })
      .catch(() => {
        if (!isMounted) return;
        setFingerprint(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { fingerprint };
};
