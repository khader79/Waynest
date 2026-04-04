import axios from "axios";
import { clearStoredSession } from "@/utils/authStorage";
import { STORAGE_KEYS } from "@/utils/storageKeys";

/**
 * Resolves the API origin for axios + `resolveMediaUrl`.
 * - Dev: defaults to localhost:3001 when env is unset.
 * - Prod without env: same origin as the page (reverse proxy serves API + /uploads).
 * - Prod with env still pointing at localhost: baked builds often ship this; rewrite to
 *   the page host so uploads work when the app is opened via LAN/public IP.
 */
function resolveApiBaseUrl() {
  const fromEnv = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");

  let base = fromEnv;
  if (!base) {
    if (import.meta.env.DEV) {
      base = "http://localhost:3001";
    } else if (typeof window !== "undefined" && window.location?.origin) {
      base = window.location.origin;
    } else {
      base = "http://localhost:3001";
    }
  }

  if (import.meta.env.PROD && typeof window !== "undefined" && window.location?.hostname) {
    try {
      const parsed = new URL(base);
      const apiIsLoopback =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      const pageHost = window.location.hostname;
      const pageIsLoopback =
        pageHost === "localhost" || pageHost === "127.0.0.1";
      if (apiIsLoopback && !pageIsLoopback) {
        return `${window.location.protocol}//${window.location.host}`;
      }
    } catch {
      /* ignore invalid base */
    }
  }

  return base;
}

export const API_BASE_URL = resolveApiBaseUrl();

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  if ((config.method ?? "get").toLowerCase() === "get") {
    config.headers["Cache-Control"] = "no-cache";
    config.headers.Pragma = "no-cache";
  }

  const fingerprint = localStorage.getItem(STORAGE_KEYS.deviceFingerprint);
  const token = localStorage.getItem(STORAGE_KEYS.authToken);
  const guestTripToken = localStorage.getItem(STORAGE_KEYS.guestTripToken);

  if (fingerprint) {
    config.headers["x-device-fingerprint"] = fingerprint;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (guestTripToken && config.url?.includes("/trip-planner")) {
    config.headers["x-trip-guest-token"] = guestTripToken;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredSession();
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }

    return Promise.reject(error);
  },
);

export default client;
