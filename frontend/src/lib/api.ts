import axios from "axios";
import { getApiBaseUrl } from "./api-config";
import { attachApiPayloadSecurity } from "./api-payload-crypto";

const API_BASE_URL = getApiBaseUrl();

// Module-level timestamp guard to permanently eliminate redirect loops across storage wipes
let globalLast401RedirectTime = 0;

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
      const path = window.location.pathname.toLowerCase();
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
      let token: string | null = null;

      // 1. Check portal-specific token first
      if (portTokenKey) {
        const specificCookie = cookies.find((row) => row.startsWith(`${portTokenKey}=`));
        if (specificCookie) {
          const val = specificCookie.split("=")[1]?.trim();
          if (val && val.length > 10) token = val;
        }
        if (!token) {
          const ls = localStorage.getItem(portTokenKey)?.trim();
          if (ls && ls.length > 10) token = ls;
        }
      }

      // If on admin route but p2p_admin_token is absent, check p2p_super_admin_token
      if (!token && (isAdminHost || path.startsWith("/admin"))) {
        const saCookie = cookies.find((row) => row.startsWith("p2p_super_admin_token="));
        if (saCookie) {
          const val = saCookie.split("=")[1]?.trim();
          if (val && val.length > 10) token = val;
        }
        if (!token) {
          const ls = localStorage.getItem("p2p_super_admin_token")?.trim();
          if (ls && ls.length > 10) token = ls;
        }
      }

      // 2. Comprehensive role-safe fallback across all known token keys
      if (!token) {
        const candidateKeys = (isAdminHost || path.startsWith("/admin") || isSuperAdminHost || path.startsWith("/super-admin"))
          ? [
              "p2p_admin_token",
              "p2p_super_admin_token",
              "p2p_token",
              "pay2pay_token",
              "p2p_access_token",
              "pay2pay_access_token",
              "pay2pay_auth_token",
              "access_token",
              "token",
            ]
          : [
              "p2p_retailer_token",
              "p2p_admin_token",
              "p2p_super_admin_token",
              "p2p_token",
              "pay2pay_token",
              "p2p_access_token",
              "pay2pay_access_token",
              "pay2pay_auth_token",
              "p2p_sales_token",
              "pay2pay_sales_token",
              "access_token",
              "token",
            ];

        for (const k of candidateKeys) {
          const c = cookies.find((row) => row.startsWith(`${k}=`));
          if (c) {
            const v = c.split("=")[1]?.trim();
            if (v && v.length > 10) {
              token = v;
              break;
            }
          }
          const ls = localStorage.getItem(k)?.trim();
          if (ls && ls.length > 10) {
            token = ls;
            break;
          }
        }
      }

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

// Interceptor for response handling: gracefully reject errors without wiping cookies or triggering reload loops
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Critical: NEVER wipe cookies or localStorage and NEVER trigger window.location.replace here.
    // In Next.js SPA architecture, route protection is enforced at the navigation boundary by middleware.ts.
    // Client-side API calls must cleanly reject so that UI components show appropriate feedback without infinite auto-reload loops.
    return Promise.reject(error);
  }
);

// Attach transparent End-to-End API Payload Encryption and Decryption
attachApiPayloadSecurity(apiClient);

export default apiClient;
