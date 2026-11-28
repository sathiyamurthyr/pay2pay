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
      const cookies = document.cookie ? document.cookie.split("; ") : [];
      const tokenCookie = cookies.find((row) =>
        row.startsWith("p2p_access_token=") ||
        row.startsWith("pay2pay_access_token=") ||
        row.startsWith("pay2pay_auth_token=") ||
        row.startsWith("p2p_sales_token=") ||
        row.startsWith("pay2pay_sales_token=") ||
        row.startsWith("access_token=") ||
        row.startsWith("token=")
      );
      const cookieToken = tokenCookie ? tokenCookie.split("=")[1]?.trim() : null;

      const token =
        cookieToken ||
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("pay2pay_auth_token") ||
        localStorage.getItem("p2p_sales_token") ||
        localStorage.getItem("pay2pay_sales_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

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
      const url = String(error.config?.url || "");
      const errorData = error.response?.data;
      const errorDetail = String(
        typeof errorData === "string"
          ? errorData
          : errorData?.detail || errorData?.message || ""
      ).toLowerCase();

      // Check if this error is explicitly a token/session expiry or missing auth
      const isExplicitTokenExpiry =
        errorDetail.includes("token has expired") ||
        errorDetail.includes("token expired") ||
        errorDetail.includes("jwt expired") ||
        errorDetail.includes("invalid token") ||
        errorDetail.includes("not authenticated") ||
        errorDetail.includes("could not validate credentials") ||
        errorDetail.includes("session expired") ||
        errorDetail.includes("token_expired");

      // Check if this is a transactional wrong-PIN/MPIN attempt inside a modal dialog
      const isTransactionalPinError =
        !isExplicitTokenExpiry &&
        (url.includes("/mpin/verify") || url.includes("/verify-pin") || url.includes("/unlock")) &&
        (errorDetail.includes("pin") || errorDetail.includes("mpin") || errorDetail.includes("wrong") || errorDetail.includes("incorrect"));

      if (isTransactionalPinError) {
        // User entered a wrong transaction MPIN: do NOT wipe session
        return Promise.reject(error);
      }

      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
