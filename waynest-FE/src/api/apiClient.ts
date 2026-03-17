import axios from "axios";

const normalizeBaseUrl = (raw: string | undefined) => {
  if (!raw) return "";

  const trimmed = raw.trim().replace(/\/+$/, "");

  try {
    const url = new URL(trimmed);

    // If base URL has no path (or just "/"), assume server uses "/api" prefix (e.g., serverless adapter).
    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/api";
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    // Fallback for non-standard values (keep as-is, minus trailing slashes)
    return trimmed;
  }
};

const apiClient = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_URL),
  timeout: 5000,
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
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);

export default apiClient;
