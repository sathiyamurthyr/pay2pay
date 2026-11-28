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
        row.startsWith("p2p_access_token=") ||
        row.startsWith("pay2pay_access_token=") ||
        row.startsWith("pay2pay_auth_token=")
      );
      const cookieToken = tokenCookie ? tokenCookie.split("=")[1] : null;

      const token =
        cookieToken ||
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("pay2pay_auth_token") ||
        localStorage.getItem("access_token");

      if (token && token.trim().length > 10) {
        config.headers.Authorization = `Bearer ${token.trim()}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let adminLast401RedirectTime = 0;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url = String(error.config?.url || "");
      const errorData = error.response?.data;
      const errorDetail = String(
        typeof errorData === "string"
          ? errorData
          : errorData?.detail || errorData?.message || ""
      ).toLowerCase();

      const isTransactionalPinError =
        (url.includes("/mpin") || url.includes("/unlock")) &&
        (errorDetail.includes("pin") || errorDetail.includes("mpin") || errorDetail.includes("wrong") || errorDetail.includes("incorrect"));

      if (isTransactionalPinError) {
        return Promise.reject(error);
      }

      // Non-critical auxiliary endpoints that should NEVER log out the user or trigger redirect loops
      const isAuxiliaryEndpoint =
        url.includes("/favorites") ||
        url.includes("/admin/favorites") ||
        url.includes("/admin/verification") ||
        url.includes("/verification") ||
        url.includes("/requests") ||
        url.includes("/menus") ||
        url.includes("/branding") ||
        url.includes("/notifications") ||
        url.includes("/public-key") ||
        url.includes("/soundbox") ||
        url.includes("/session") ||
        url.includes("/security") ||
        url.includes("/announcements");

      if (isAuxiliaryEndpoint) {
        return Promise.reject(error);
      }

      if (typeof window !== "undefined") {
        const p = window.location.pathname.toLowerCase();
        const s = window.location.search.toLowerCase();
        if (
          p.includes("/login") ||
          p.includes("/register") ||
          p.includes("/logout") ||
          s.includes("reason=") ||
          s.includes("logout")
        ) {
          return Promise.reject(error);
        }

        const now = Date.now();
        if (now - adminLast401RedirectTime < 15000) {
          return Promise.reject(error);
        }
        adminLast401RedirectTime = now;
      }

      if (typeof document !== "undefined") {
        const cookieNames = [
          "p2p_access_token",
          "pay2pay_access_token",
          "pay2pay_auth_token",
          "p2p_sales_token",
          "pay2pay_sales_token",
          "p2p_user_role",
          "pay2pay_user_role",
          "p2p_session_locked",
          "p2p_session_id",
          "token",
          "access_token",
        ];
        cookieNames.forEach((name) => {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
          try {
            document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
          } catch {}
        });
      }

      // Critical: In SPA architecture, NEVER trigger window.location.replace on background 401s.
      // Auto-redirecting causes fatal reload loops on background/auxiliary API calls.
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
