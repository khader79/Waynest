import axios from "axios";

const baseURL = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

const apiClient = axios.create({
  baseURL,
  timeout: 90000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const fingerprint = localStorage.getItem("device_fingerprint");
    if (fingerprint) {
      config.headers = config.headers ?? {};
      config.headers["x-device-fingerprint"] = fingerprint;
    }

    const guestTripToken = localStorage.getItem("waynest_guest_trip_token");
    if (guestTripToken) {
      config.headers = config.headers ?? {};
      config.headers["x-trip-guest-token"] = guestTripToken;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/register")
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default apiClient;
