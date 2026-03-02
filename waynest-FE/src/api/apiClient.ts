import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Global API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export default apiClient;
