import axios from "axios";
import { getApiBaseUrl } from "./api-config";
import { attachApiPayloadSecurity } from "./api-payload-crypto";

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
      const port = window.location.port;
      const path = window.location.pathname;
      const host = window.location.hostname.toLowerCase();
      const isAdminHost = host.startsWith("admin.") || host.includes("admin.smspay.store") || host.includes("admin.near4you.store") || host.includes("admin.pay2pay.in");
      const isSuperAdminHost = port === "4003" || host.startsWith("super-admin.") || host.startsWith("superadmin.");
      const isRetailerHost = host.startsWith("retailer.");

      let portTokenKey: string | null = null;
      let portUserKey: string | null = null;
      if (port === "4001" || isRetailerHost || path.startsWith("/retailer")) {
        portTokenKey = "p2p_retailer_token";
        portUserKey = "p2p_retailer_user";
      } else if (port === "4002" || isAdminHost || path.startsWith("/admin")) {
        portTokenKey = "p2p_admin_token";
        portUserKey = "p2p_admin_user";
      } else if (isSuperAdminHost || path.startsWith("/super-admin")) {
        portTokenKey = "p2p_super_admin_token";
        portUserKey = "p2p_super_admin_user";
      }

      const cookies = document.cookie.split("; ");
      let cookieToken: string | null = null;

      if (portTokenKey) {
        const specificCookie = cookies.find((row) => row.startsWith(`${portTokenKey}=`));
        if (specificCookie) {
          cookieToken = specificCookie.split("=")[1];
        }
      }

      if (!cookieToken) {
        const tokenCookie = cookies.find((row) =>
          row.startsWith("p2p_access_token=") ||
          row.startsWith("pay2pay_access_token=") ||
          row.startsWith("pay2pay_auth_token=") ||
          row.startsWith("p2p_sales_token=") ||
          row.startsWith("pay2pay_sales_token=") ||
          row.startsWith("access_token=") ||
          row.startsWith("token=")
        );
        cookieToken = tokenCookie ? tokenCookie.split("=")[1] : null;
      }

      const token =
        cookieToken ||
        (portTokenKey ? localStorage.getItem(portTokenKey) : null) ||
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
          (portUserKey ? localStorage.getItem(portUserKey) : null) ||
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
          const rCode = (u.retailer_code || u.code || "").trim();
          const rId = (u.public_id || u.retailer_id || u.id || "").trim();
          if (rCode && rCode !== "authenticated_session" && !config.headers["x-retailer-code"]) {
            config.headers["x-retailer-code"] = rCode;
          }
          if (rId && rId !== "authenticated_session" && !config.headers["x-retailer-id"]) {
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

      // Non-critical auxiliary endpoints that should NEVER log out the user or trigger redirect loops
      const skipRedirect = Boolean(error.config?.headers?.["x-skip-auth-redirect"]);
      const isAuxiliaryEndpoint =
        skipRedirect ||
        url.includes("/favorites") ||
        url.includes("/admin/favorites") ||
        url.includes("/branding") ||
        url.includes("/notifications") ||
        url.includes("/public-key") ||
        url.includes("/soundbox");

      if (isAuxiliaryEndpoint) {
        return Promise.reject(error);
      }

      // For genuine session/token expiry 401s, clear cookies and session storage
      if (typeof document !== "undefined") {
        const cookieNames = [
          "p2p_access_token",
          "pay2pay_access_token",
          "pay2pay_auth_token",
          "p2p_sales_token",
          "pay2pay_sales_token",
          "p2p_admin_token",
          "p2p_retailer_token",
          "p2p_super_admin_token",
          "p2p_sd_token",
          "p2p_dist_token",
          "p2p_token",
          "pay2pay_token",
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

      if (typeof localStorage !== "undefined") {
        try {
          const lsKeys = [
            "p2p_access_token",
            "pay2pay_access_token",
            "pay2pay_auth_token",
            "p2p_sales_token",
            "pay2pay_sales_token",
            "p2p_admin_token",
            "p2p_retailer_token",
            "p2p_super_admin_token",
            "p2p_sd_token",
            "p2p_dist_token",
            "token",
            "access_token",
            "user_info",
            "pay2pay_user_data",
            "p2p_session_locked",
            "p2p_session_locked_at",
            "p2p_session_last_active",
            "p2p_session_start_time"
          ];
          lsKeys.forEach((k) => localStorage.removeItem(k));
        } catch {}
      }

      if (typeof sessionStorage !== "undefined") {
        try {
          sessionStorage.clear();
        } catch {}
      }

      if (typeof window !== "undefined") {
        if (window.location.pathname.includes("/login")) {
          return Promise.reject(error);
        }

        // Prevent rapid redirect loops (debounce 10s)
        const now = Date.now();
        const lastRedirect = Number(window.sessionStorage?.getItem("p2p_last_401_redirect") || 0);
        if (now - lastRedirect < 10000) {
          return Promise.reject(error);
        }
        try {
          window.sessionStorage?.setItem("p2p_last_401_redirect", String(now));
        } catch {}

        const currentPath = window.location.pathname;
        const host = window.location.hostname.toLowerCase();
        const isAdminHost = host.startsWith("admin.") || host.includes("admin.smspay.store") || host.includes("admin.near4you.store") || host.includes("admin.pay2pay.in");
        const isSuperAdminHost = window.location.port === "4003" || host.startsWith("super-admin.") || host.startsWith("superadmin.");

        let loginPath = "/retailer/login";
        if (isAdminHost || currentPath.startsWith("/admin")) loginPath = "/admin/login";
        else if (isSuperAdminHost || currentPath.startsWith("/super-admin")) loginPath = "/super-admin/login";
        else if (currentPath.startsWith("/sd")) loginPath = "/sd/login";
        else if (currentPath.startsWith("/dist")) loginPath = "/dist/login";

        window.location.replace(`${loginPath}?reason=session_expired&redirect=${encodeURIComponent(currentPath)}`);
      }
    }
    return Promise.reject(error);
  }
);

// Attach transparent End-to-End API Payload Encryption and Decryption
attachApiPayloadSecurity(apiClient);

export default apiClient;
