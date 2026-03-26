import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add device fingerprint to requests
api.interceptors.request.use((config) => {
  const fingerprint = localStorage.getItem('device_fingerprint');
  if (fingerprint) {
    config.headers['x-device-fingerprint'] = fingerprint;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:logout'));
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;