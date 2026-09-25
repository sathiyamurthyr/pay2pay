import axios from "axios";
import { getApiBaseUrl } from "./api-config";

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to attach Access Token to all requests
apiClient.interceptors.request.use(
  (config) => {
    if (config.url && config.url.startsWith("/api/v1")) {
      config.url = config.url.replace(/^\/api\/v1/, "");
    }
    if (typeof window !== "undefined") {
      const cookies = document.cookie.split("; ");
      const tokenCookie = cookies.find((row) =>
        row.startsWith("p2p_sales_token=") ||
        row.startsWith("pay2pay_sales_token=") ||
        row.startsWith("p2p_access_token=") ||
        row.startsWith("pay2pay_access_token=") ||
        row.startsWith("access_token=")
      );
      const cookieToken = tokenCookie ? tokenCookie.split("=")[1] : null;

      const token =
        cookieToken ||
        sessionStorage.getItem("p2p_sales_token") ||
        localStorage.getItem("p2p_sales_token") ||
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("access_token");

      if (token && token.trim().length > 10) {
        config.headers.Authorization = `Bearer ${token.trim()}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for 401 Unauthorized handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = String(error.config?.url || "");
    const isAuthVerifyEndpoint = url.includes("/sales/auth/me") || url.includes("/auth/me");

    // Only redirect if explicitly verifying session on /auth/me and failed with 401
    if (error.response?.status === 401 && isAuthVerifyEndpoint) {
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        // Clear auth cookie and redirect
        document.cookie = "p2p_sales_token=; path=/; max-age=0";
        document.cookie = "pay2pay_sales_token=; path=/; max-age=0";
        sessionStorage.removeItem("p2p_sales_token");
        localStorage.removeItem("p2p_sales_token");
        window.location.replace(`/login?reason=session_expired&redirect=${encodeURIComponent(window.location.pathname)}`);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
