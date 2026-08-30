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

      try {
        const userStr =
          localStorage.getItem("user_info") ||
          localStorage.getItem("user") ||
          localStorage.getItem("auth_user") ||
          localStorage.getItem("pay2pay_user_data");
        if (userStr) {
          const u = JSON.parse(userStr);
          const uRef = u.user_ref_id || u.retailer_ref_id || u.ref_id;
          const uType = u.user_type_ref_id || 2;
          if (uRef) config.headers["x-user-ref-id"] = String(uRef);
          if (uType) config.headers["x-user-type-ref-id"] = String(uType);
        }
      } catch {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for 401 Unauthorized handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      const errorDetail = (
        error.response?.data?.detail ||
        error.response?.data?.message ||
        ""
      ).toLowerCase();

      // IMPORTANT: Do NOT log out the user if the 401 error is from a wrong PIN / MPIN / password or screen unlock!
      const isPinOrCredentialError =
        url.includes("/mpin") ||
        url.includes("/unlock") ||
        url.includes("/security") ||
        url.includes("/pin") ||
        url.includes("/payout") ||
        url.includes("/transfer") ||
        url.includes("/dmt") ||
        errorDetail.includes("pin") ||
        errorDetail.includes("mpin") ||
        errorDetail.includes("password");

      if (isPinOrCredentialError) {
        return Promise.reject(error);
      }

      if (typeof document !== "undefined") {
        const cookieNames = [
          "p2p_access_token",
          "pay2pay_access_token",
          "pay2pay_auth_token",
          "p2p_user_role",
          "pay2pay_user_role",
          "p2p_session_locked",
          "p2p_session_id",
          "p2p_destination",
          "token",
          "access_token",
        ];
        cookieNames.forEach((name) => {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
        });
      }

      if (typeof localStorage !== "undefined") {
        try {
          localStorage.clear();
        } catch {}
      }

      if (typeof sessionStorage !== "undefined") {
        try {
          sessionStorage.clear();
        } catch {}
      }

      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.replace(`/retailer/login?reason=session_expired&redirect=${encodeURIComponent(window.location.pathname)}`);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
