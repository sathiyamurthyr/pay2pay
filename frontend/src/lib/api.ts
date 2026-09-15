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
          // Inject retailer identity headers for cross-subdomain resolution
          const rCode = u.retailer_code || u.code || "";
          const rId = u.public_id || u.retailer_id || u.id || "";
          if (rCode && !config.headers["x-retailer-code"]) {
            config.headers["x-retailer-code"] = rCode;
          }
          if (rId && !config.headers["x-retailer-id"]) {
            config.headers["x-retailer-id"] = rId;
          }
          // Inject mobile for backend Strategy 7 fallback
          const mob = u.mobile_number || u.mobile || u.phone || "";
          if (mob && !config.headers["x-mobile"]) {
            config.headers["x-mobile"] = mob;
          }
        }
        // Fallback: read retailer identifier from dedicated localStorage keys
        if (!config.headers["x-retailer-code"]) {
          const rCodeFallback =
            localStorage.getItem("p2p_active_retailer_id") ||
            localStorage.getItem("p2p_retailer_code") ||
            localStorage.getItem("retailer_code") ||
            "";
          if (rCodeFallback) config.headers["x-retailer-code"] = rCodeFallback;
        }
        if (!config.headers["x-retailer-id"]) {
          const rIdFallback =
            localStorage.getItem("p2p_retailer_public_id") ||
            localStorage.getItem("retailer_id") ||
            "";
          if (rIdFallback) config.headers["x-retailer-id"] = rIdFallback;
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

      // IMPORTANT: Do NOT log out the user if the 401 error is from:
      // - a wrong PIN / MPIN / password / screen unlock
      // - payout / bulkpe / transfer calls (retailer identity errors)
      const isPinOrCredentialError =
        url.includes("/mpin") ||
        url.includes("/unlock") ||
        url.includes("/security") ||
        url.includes("/pin") ||
        url.includes("/payout") ||
        url.includes("/bulkpe") ||
        url.includes("/transfer") ||
        url.includes("/dmt") ||
        url.includes("/initiate") ||
        errorDetail.includes("pin") ||
        errorDetail.includes("mpin") ||
        errorDetail.includes("password") ||
        errorDetail.includes("retailer identity") ||
        errorDetail.includes("authenticated retailer");

      if (isPinOrCredentialError) {
        // DO NOT clear session — this is a transactional auth error, not a session expiry
        return Promise.reject(error);
      }

      // For genuine session-expiry 401s, clear cookies and session storage
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
          try {
            document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
          } catch {}
        });
      }

      // Only wipe session-specific keys, NOT retailer identity or access tokens
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.removeItem("p2p_session_locked");
          localStorage.removeItem("p2p_session_locked_at");
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
