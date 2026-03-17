import axios from "axios";

const baseURL = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

const apiClient = axios.create({
  baseURL,
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
