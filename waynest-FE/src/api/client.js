import axios from "axios";
import { clearStoredSession } from "@/utils/authStorage";
import { STORAGE_KEYS } from "@/utils/storageKeys";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
)
  .trim()
  .replace(/\/+$/, "");

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
