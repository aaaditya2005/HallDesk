import axios from "axios";
import notify from "../utils/toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Add authorization header to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Prevent caching for all requests
  config.headers['Cache-Control'] = 'no-cache';
  config.headers['Pragma'] = 'no-cache';
  return config;
});

let redirectingToLogin = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";
    const isAuthRequest = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");

    if (status === 401 && !isAuthRequest && !redirectingToLogin) {
      redirectingToLogin = true;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      notify.error("Your session has expired. Please log in again.");
      window.setTimeout(() => window.location.replace("/"), 100);
    }

    return Promise.reject(error);
  },
);

export default api;