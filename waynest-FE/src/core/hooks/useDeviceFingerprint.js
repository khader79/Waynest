/**
 * useDeviceFingerprint - Global hook for device fingerprinting
 * Generates and stores a unique device fingerprint for analytics and rate limiting
 */

import { useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { STORAGE_KEYS } from '@/core/constants/storageKeys';

export const useDeviceFingerprint = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const existing = localStorage.getItem(STORAGE_KEYS.deviceFingerprint);
    if (existing) {
      return;
    }

    const generateLegacyFingerprint = () => {
      try {
        const navigatorInfo =
        typeof navigator !== 'undefined' ?
        `${navigator.userAgent}|${navigator.language}` :
        'unknown-navigator';
        const screenInfo =
        typeof screen !== 'undefined' ?
        `${screen.width}x${screen.height}|${screen.colorDepth}` :
        'unknown-screen';
        const timezone =
        typeof Intl !== 'undefined' && Intl.DateTimeFormat ?
        Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown-timezone' :
        'unknown-timezone';

        const raw = `${navigatorInfo}|${screenInfo}|${timezone}`;
        return btoa(unescape(encodeURIComponent(raw)));
      } catch {
        return null;
      }
    };

    let isCancelled = false;

    const setFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();

        if (!isCancelled && result.visitorId) {
          localStorage.setItem(STORAGE_KEYS.deviceFingerprint, result.visitorId);
          return;
        } else {
          const fallback = generateLegacyFingerprint();
          if (!isCancelled && fallback) {
            localStorage.setItem(STORAGE_KEYS.deviceFingerprint, fallback);
          }
        }
      } catch {
        const fallbackFingerprint = generateLegacyFingerprint();
        if (!isCancelled && fallbackFingerprint) {
          localStorage.setItem(
            STORAGE_KEYS.deviceFingerprint,
            fallbackFingerprint
          );
        }
      }
    };

    void setFingerprint();

    return () => {
      isCancelled = true;
    };
  }, []);
};