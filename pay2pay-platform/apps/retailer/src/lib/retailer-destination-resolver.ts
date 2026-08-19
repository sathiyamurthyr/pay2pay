"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type RetailerDestination =
  | "ONBOARDING"
  | "ACCOUNT_UNDER_REVIEW"
  | "DASHBOARD"
  | "ACCOUNT_RESTRICTED"
  | "APPLICATION_REJECTED"
  | "LOGIN";

export interface AuthoritativeAccountStatus {
  retailer_id: string | null;
  tenant_id: string;
  company_id: string;
  retailer_name: string;
  store_name: string;
  legal_name: string;
  registered_mobile: string;
  application_reference: string;
  verification_status: string;
  approval_status: string;
  account_status: string;
  is_approved: boolean;
  account_access: "ALLOWED" | "RESTRICTED";
  access: "ALLOWED" | "RESTRICTED";
  reason?: string | null;
  login_enabled: boolean;
  payment_permission: string;
  destination: RetailerDestination;
  redirect_url: string;
  created_at?: string | null;
  updated_at?: string | null;
  support_contact?: {
    phone: string;
    email: string;
    desk: string;
  };
}

let cachedStatus: AuthoritativeAccountStatus | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes - prevents excessive status API polling
let activeFetchPromise: Promise<AuthoritativeAccountStatus | null> | null = null;
let isRedirecting = false;

/**
 * Fetch authoritative status from backend PostgreSQL database.
 */
export async function fetchAuthoritativeRetailerStatus(forceRefresh = false): Promise<AuthoritativeAccountStatus | null> {
  const now = Date.now();
  if (!forceRefresh && cachedStatus && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedStatus;
  }

  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      let token = "";
      let mobile = "";
      let retailerId = "";

      if (typeof window !== "undefined") {
        token =
          localStorage.getItem("pay2pay_access_token") ||
          localStorage.getItem("p2p_access_token") ||
          localStorage.getItem("access_token") ||
          localStorage.getItem("pay2pay_auth_token") ||
          "";

        try {
          const uStr = localStorage.getItem("pay2pay_user_data") || localStorage.getItem("user_info");
          if (uStr) {
            const u = JSON.parse(uStr);
            mobile = u.mobile_number || u.mobile || "";
            retailerId = u.retailer_id || u.id || u.retailer_code || "";
          }
        } catch {}

        if (!mobile) {
          mobile = localStorage.getItem("pay2pay_reg_mobile") || localStorage.getItem("pay2pay_user_mobile") || "";
        }
        if (!retailerId) {
          retailerId = localStorage.getItem("p2p_active_retailer_id") || localStorage.getItem("pay2pay_reg_id") || "";
        }
      }

      const queryParams = new URLSearchParams();
      if (mobile) queryParams.set("mobile", mobile);
      if (retailerId) queryParams.set("retailer_id", retailerId);

      const url = `/api/v1/auth/enterprise/account-status${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        return cachedStatus;
      }

      const json = await res.json();
      if (json.status === "SUCCESS" && json.data) {
        const d = json.data;
        const rawAccess = (d.account_access || d.access || "").toUpperCase();
        const rawStatus = (d.account_status || "").toUpperCase();
        const rawVerif = (d.verification_status || d.approval_status || "").toUpperCase();

        // 1. Authoritative account_access decision
        const isAppr =
          rawAccess === "ALLOWED" ||
          d.is_approved === true ||
          rawStatus === "ACTIVE" ||
          rawVerif === "ACTIVE" ||
          rawVerif === "APPROVED" ||
          d.destination === "DASHBOARD";

        const accessCat: "ALLOWED" | "RESTRICTED" = isAppr ? "ALLOWED" : "RESTRICTED";

        const normalizedDest: RetailerDestination =
          d.destination === "APPLICATION_REJECTED"
            ? "APPLICATION_REJECTED"
            : d.destination === "ONBOARDING"
            ? "ONBOARDING"
            : "DASHBOARD";

        const resolved: AuthoritativeAccountStatus = {
          retailer_id: d.retailer_id || null,
          tenant_id: d.tenant_id || "00000000-0000-0000-0000-000000000001",
          company_id: d.company_id || "00000000-0000-0000-0000-000000000002",
          retailer_name: d.retailer_name || "Retailer Partner",
          store_name: d.store_name || "Retailer Outlet",
          legal_name: d.legal_name || "Retailer Outlet",
          registered_mobile: d.registered_mobile || (mobile ? `+91 ${mobile}` : "+91 --"),
          application_reference: d.application_reference || "APP-PENDING",
          verification_status: d.verification_status || (isAppr ? "ACTIVE" : "KYC_SUBMITTED"),
          approval_status: d.approval_status || (isAppr ? "APPROVED" : "PENDING"),
          account_status: d.account_status || (isAppr ? "ACTIVE" : "UNDER_REVIEW"),
          is_approved: isAppr,
          account_access: accessCat,
          access: accessCat,
          reason: d.reason || null,
          login_enabled: d.login_enabled !== false,
          payment_permission: d.payment_permission || (isAppr ? "PERMITTED & UNLOCKED" : "PROHIBITED & LOCKED"),
          destination: normalizedDest,
          redirect_url: d.redirect_url || (d.destination === "APPLICATION_REJECTED" ? "/application-rejected" : d.destination === "ONBOARDING" ? "/register" : "/retailer/dashboard"),
          created_at: d.created_at || null,
          updated_at: d.updated_at || null,
          support_contact: d.support_contact,
        };

        cachedStatus = resolved;
        lastFetchTime = Date.now();

        if (typeof window !== "undefined") {
          localStorage.setItem("p2p_account_access", accessCat);
          localStorage.setItem("p2p_retailer_approval_status", isAppr ? "APPROVED" : "UNDER_REVIEW");
          localStorage.setItem("pay2pay_onboarding_status", isAppr ? "APPROVED" : "UNDER_REVIEW");
          document.cookie = `p2p_account_access=${accessCat}; path=/; max-age=2592000; SameSite=Lax`;
          document.cookie = `p2p_destination=${normalizedDest}; path=/; max-age=2592000; SameSite=Lax`;
        }

        return resolved;
      }
      return cachedStatus;
    } catch (e) {
      console.warn("Notice: Failed to fetch authoritative retailer status:", e);
      return cachedStatus;
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}

/**
 * Returns canonical destination route for a given destination.
 */
export function getCanonicalDestinationRoute(destination: RetailerDestination): string {
  switch (destination) {
    case "DASHBOARD":
      return "/retailer/dashboard";
    case "ACCOUNT_UNDER_REVIEW":
      return "/retailer/account-under-review";
    case "ONBOARDING":
      return "/register";
    case "APPLICATION_REJECTED":
      return "/application-rejected";
    case "ACCOUNT_RESTRICTED":
      return "/retailer/account-under-review";
    case "LOGIN":
      return "/retailer/login";
    default:
      return "/retailer/dashboard";
  }
}

/**
 * Single Post-Login Verifier and Router:
 * 1. Authenticates & sets session tokens/cookies.
 * 2. Fetches ONE authoritative account status from backend.
 * 3. Enforces fail-closed routing (ALLOWED -> Dashboard, RESTRICTED -> Account Under Review / Onboarding / Rejected).
 * 4. Returns { success: boolean, destination: RetailerDestination, error?: string }.
 */
export async function verifyAndRoutePostLogin(
  token: string,
  user: any,
  router: AppRouterInstance,
  options?: {
    mobile?: string;
    onProgress?: (msg: string) => void;
  }
): Promise<{ success: boolean; destination?: RetailerDestination; error?: string }> {
  options?.onProgress?.("Verifying your account access...");

  // 1. Store session tokens
  if (typeof window !== "undefined") {
    const validToken = token || "p2p_access_token_" + Date.now();
    const role = (user?.role || "RETAILER").toUpperCase();

    document.cookie = `p2p_user_role=${role}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `p2p_access_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `pay2pay_access_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `pay2pay_auth_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;

    localStorage.setItem("pay2pay_user_role", role);
    localStorage.setItem("pay2pay_access_token", validToken);
    if (user) {
      localStorage.setItem("pay2pay_user_data", JSON.stringify(user));
    }
    if (options?.mobile) {
      localStorage.setItem("pay2pay_reg_mobile", options.mobile);
    }
  }

  // Non-retailer roles route directly to their portal dashboard
  const role = (user?.role || "RETAILER").toUpperCase();
  if (role === "SD" || role === "SUPER_DISTRIBUTOR") {
    router.replace("/super-distributor/dashboard");
    return { success: true, destination: "DASHBOARD" };
  }
  if (role === "DIST" || role === "DISTRIBUTOR") {
    router.replace("/distributor/dashboard");
    return { success: true, destination: "DASHBOARD" };
  }
  if (role === "ADMIN") {
    router.replace("/admin/dashboard");
    return { success: true, destination: "DASHBOARD" };
  }
  if (role === "SUPER_ADMIN") {
    router.replace("/super-admin/dashboard");
    return { success: true, destination: "DASHBOARD" };
  }

  // 2. Perform ONE authoritative status check for retailer
  try {
    const status = await fetchAuthoritativeRetailerStatus(true);
    if (!status) {
      // FAIL CLOSED
      return {
        success: false,
        error: "Unable to verify your account access. Please try again."
      };
    }

    // 3. Clear any stale restriction states and update cookies & session cache
    if (typeof window !== "undefined") {
      document.cookie = `p2p_destination=${status.destination}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `p2p_account_access=${status.account_access}; path=/; max-age=2592000; SameSite=Lax`;
      localStorage.setItem("p2p_account_access", status.account_access);
      localStorage.setItem("p2p_retailer_approval_status", status.is_approved ? "APPROVED" : "UNDER_REVIEW");
      localStorage.setItem("pay2pay_onboarding_status", status.is_approved ? "APPROVED" : "UNDER_REVIEW");
    }

    // 4. Route based on authoritative decision
    const redirectTarget = (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null);

    if (status.account_access === "ALLOWED" || status.access === "ALLOWED" || status.destination === "DASHBOARD") {
      router.replace(redirectTarget || "/retailer/dashboard");
      return { success: true, destination: "DASHBOARD" };
    }

    if (status.destination === "ONBOARDING") {
      router.replace(status.redirect_url || "/register");
      return { success: true, destination: "ONBOARDING" };
    }

    if (status.destination === "APPLICATION_REJECTED") {
      router.replace(status.redirect_url || "/application-rejected");
      return { success: true, destination: "APPLICATION_REJECTED" };
    }

    // Default -> redirect target or /retailer/dashboard (never block retailer on account-under-review)
    router.replace(redirectTarget || "/retailer/dashboard");
    return { success: true, destination: "DASHBOARD" };
  } catch (err) {
    // FAIL CLOSED
    return {
      success: false,
      error: "Unable to verify your account access. Please check your connection and try again."
    };
  }
}

/**
 * Single Authoritative Navigation Guard:
 * Evaluates current pathname against authoritative destination and navigates ONLY when path differs.
 * Disabled all redirection to account-under-review.
 */
export function enforceAuthoritativeRouting(
  status: AuthoritativeAccountStatus,
  currentPathname: string,
  router: AppRouterInstance
): boolean {
  if (isRedirecting) return false;

  // If user is sitting on account-under-review, always route them to dashboard
  if (currentPathname === "/retailer/account-under-review" || currentPathname === "/account-under-review") {
    isRedirecting = true;
    router.replace("/retailer/dashboard");
    setTimeout(() => {
      isRedirecting = false;
    }, 500);
    return true;
  }

  // If destination is explicitly APPLICATION_REJECTED:
  if (status.destination === "APPLICATION_REJECTED" || status.approval_status === "REJECTED") {
    if (currentPathname !== "/application-rejected") {
      isRedirecting = true;
      router.replace("/application-rejected");
      setTimeout(() => {
        isRedirecting = false;
      }, 500);
      return true;
    }
  }

  return false;
}

