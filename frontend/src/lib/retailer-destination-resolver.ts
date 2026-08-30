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
  company_name?: string;
  company_code?: string;
  retailer_name: string;
  store_name: string;
  legal_name: string;
  registered_mobile: string;
  application_reference: string;
  verification_status: string;
  approval_status: string;
  account_status: string;
  approve_status: boolean;
  active_status: boolean;
  status_message?: string;
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
const CACHE_TTL_MS = 10 * 1000; // 10 seconds TTL for fast reactive status transitions
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
      if ((json.status === "SUCCESS" || json.success === true) && json.data) {
        const d = json.data;
        const rawAccess = (d.account_access || d.access || "").toUpperCase();
        const rawStatus = (d.account_status || "").toUpperCase();
        const rawVerif = (d.verification_status || d.approval_status || "").toUpperCase();

        // 1. Authoritative approve_status & active_status evaluation
        const approveStatus = d.approve_status === true || json.approve_status === true;
        const activeStatus = d.active_status === true || json.active_status === true;
        const isBothTrue = approveStatus && activeStatus;

        const accessCat: "ALLOWED" | "RESTRICTED" = isBothTrue ? "ALLOWED" : "RESTRICTED";

        const normalizedDest: RetailerDestination =
          d.destination === "APPLICATION_REJECTED" || rawVerif === "REJECTED" || rawStatus === "REJECTED"
            ? "APPLICATION_REJECTED"
            : d.destination === "ONBOARDING"
            ? "ONBOARDING"
            : d.destination === "ACCOUNT_RESTRICTED" || rawStatus === "SUSPENDED" || rawStatus === "BLOCKED" || rawStatus === "HOLD"
            ? "ACCOUNT_RESTRICTED"
            : isBothTrue
            ? "DASHBOARD"
            : "ACCOUNT_UNDER_REVIEW";

        const defaultRedirectUrl =
          normalizedDest === "APPLICATION_REJECTED"
            ? "/application-rejected"
            : normalizedDest === "ONBOARDING"
            ? "/register"
            : normalizedDest === "ACCOUNT_RESTRICTED"
            ? "/retailer/account-restricted"
            : isBothTrue
            ? "/retailer/dashboard"
            : "/retailer/account-under-review";

        let dynamicMsg = d.status_message || json.message || "";
        if (!dynamicMsg) {
          if (approveStatus && activeStatus) {
            dynamicMsg = "Your account is approved and active.";
          } else if (!approveStatus && activeStatus) {
            dynamicMsg = "Your account approval is currently pending. Please wait for admin approval.";
          } else if (approveStatus && !activeStatus) {
            dynamicMsg = "Your account is approved but currently inactive. Please wait until your account is activated.";
          } else {
            dynamicMsg = "Your account approval and activation are currently pending. Please wait for admin approval and activation.";
          }
        }

        const resolved: AuthoritativeAccountStatus = {
          retailer_id: d.retailer_id || null,
          tenant_id: d.tenant_id || "00000000-0000-0000-0000-000000000001",
          company_id: d.company_id || "00000000-0000-0000-0000-000000000002",
          company_name: d.company_name || "Platform HQ Enterprise Ltd",
          company_code: d.company_code || "HQ_COMP",
          retailer_name: d.retailer_name || "Retailer Partner",
          store_name: d.store_name || "Retailer Outlet",
          legal_name: d.legal_name || "Retailer Outlet",
          registered_mobile: d.registered_mobile || (mobile ? `+91 ${mobile}` : "+91 --"),
          application_reference: d.application_reference || "APP-PENDING",
          verification_status: d.verification_status || (isBothTrue ? "ACTIVE" : "PENDING"),
          approval_status: d.approval_status || (approveStatus ? "APPROVED" : "PENDING"),
          account_status: d.account_status || (activeStatus ? "ACTIVE" : "INACTIVE"),
          approve_status: approveStatus,
          active_status: activeStatus,
          status_message: dynamicMsg,
          is_approved: approveStatus,
          account_access: accessCat,
          access: accessCat,
          reason: d.reason || null,
          login_enabled: d.login_enabled !== false,
          payment_permission: d.payment_permission || (isBothTrue ? "PERMITTED & UNLOCKED" : "PROHIBITED & LOCKED"),
          destination: normalizedDest,
          redirect_url: d.redirect_url || defaultRedirectUrl,
          created_at: d.created_at || null,
          updated_at: d.updated_at || null,
          support_contact: d.support_contact || {
            phone: "+91 8000 123 456",
            email: "support@pay2pay.in",
            desk: "24x7 Priority Support Desk",
          },
        };

        cachedStatus = resolved;
        lastFetchTime = Date.now();
        return resolved;
      }
      return cachedStatus;
    } catch {
      return cachedStatus;
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}

/**
 * Universal Post-Login Router:
 * Enforces strict routing: approve_status && active_status -> dashboard, else -> waiting page.
 */
export async function verifyAndRoutePostLogin(
  firstArg: any,
  secondArg?: any,
  thirdArg?: any,
  fourthArg?: any
): Promise<{ success: boolean; destination: RetailerDestination }> {
  let router: AppRouterInstance = typeof window !== "undefined" ? (window as any).__next_router : null;
  let options: { mobile?: string; token?: string; userData?: any; onProgress?: (msg: string) => void } = {};

  if (typeof firstArg === "string") {
    options.token = firstArg;
    options.userData = secondArg;
    router = thirdArg;
    if (fourthArg) {
      options.mobile = fourthArg.mobile;
      options.onProgress = fourthArg.onProgress;
    }
  } else {
    router = firstArg;
    if (secondArg) {
      options = secondArg;
    }
  }

  // 1. Synchronously persist credentials & role
  if (typeof window !== "undefined") {
    const role = "RETAILER";
    const validToken =
      options?.token ||
      localStorage.getItem("pay2pay_access_token") ||
      localStorage.getItem("p2p_access_token") ||
      `p2p_sess_${Date.now()}`;
    const user = options?.userData;
    const now = Date.now();

    document.cookie = `p2p_user_role=${role}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `pay2pay_user_role=${role}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `p2p_access_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `pay2pay_auth_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;

    localStorage.setItem("pay2pay_user_role", role);
    localStorage.setItem("pay2pay_access_token", validToken);
    localStorage.setItem("p2p_session_start_time", String(now));
    localStorage.setItem("p2p_session_last_active", String(now));
    localStorage.removeItem("p2p_session_locked");
    localStorage.removeItem("p2p_session_locked_at");

    if (user) {
      localStorage.setItem("pay2pay_user_data", JSON.stringify(user));
      localStorage.setItem("user_info", JSON.stringify(user));
      const rCode = user.retailer_code || user.code || user.retailer_id || user.id || options?.mobile || "";
      if (rCode) {
        localStorage.setItem("p2p_active_retailer_id", rCode);
        localStorage.setItem("p2p_retailer_code", rCode);
      }
    }
  }

  try {
    const status = await fetchAuthoritativeRetailerStatus(true);
    const redirectTarget = (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null);
    const targetDashboard = redirectTarget || "/retailer/dashboard";

    if (status) {
      const isBothTrue = status.approve_status === true && status.active_status === true;

      if (typeof window !== "undefined") {
        document.cookie = `p2p_destination=${status.destination}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `p2p_account_access=${status.account_access}; path=/; max-age=2592000; SameSite=Lax`;
      }

      if (status.destination === "ONBOARDING") {
        const dest = status.redirect_url || "/register";
        if (typeof window !== "undefined") window.location.href = dest;
        else router.replace(dest);
        return { success: true, destination: "ONBOARDING" };
      }

      if (status.destination === "APPLICATION_REJECTED" || status.approval_status === "REJECTED") {
        const dest = status.redirect_url || "/application-rejected";
        if (typeof window !== "undefined") window.location.href = dest;
        else router.replace(dest);
        return { success: true, destination: "APPLICATION_REJECTED" };
      }

      if (status.destination === "ACCOUNT_RESTRICTED") {
        const dest = status.redirect_url || "/retailer/account-restricted";
        if (typeof window !== "undefined") window.location.href = dest;
        else router.replace(dest);
        return { success: true, destination: "ACCOUNT_RESTRICTED" };
      }

      if (isBothTrue) {
        if (typeof window !== "undefined") {
          window.location.href = targetDashboard;
        } else {
          router.replace(targetDashboard);
        }
        return { success: true, destination: "DASHBOARD" };
      } else {
        const waitingUrl = "/retailer/account-under-review";
        if (typeof window !== "undefined") {
          window.location.href = waitingUrl;
        } else {
          router.replace(waitingUrl);
        }
        return { success: true, destination: "ACCOUNT_UNDER_REVIEW" };
      }
    }

    // Default: Route to waiting page for safety if status unavailable
    const waitingUrl = "/retailer/account-under-review";
    if (typeof window !== "undefined") {
      window.location.href = waitingUrl;
    } else {
      router.replace(waitingUrl);
    }
    return { success: true, destination: "ACCOUNT_UNDER_REVIEW" };
  } catch (err) {
    const waitingUrl = "/retailer/account-under-review";
    if (typeof window !== "undefined") {
      window.location.href = waitingUrl;
    } else {
      router.replace(waitingUrl);
    }
    return { success: true, destination: "ACCOUNT_UNDER_REVIEW" };
  }
}

/**
 * Single Authoritative Navigation Guard:
 * Evaluates current pathname against authoritative destination and navigates ONLY when path differs.
 */
export function enforceAuthoritativeRouting(
  status: AuthoritativeAccountStatus,
  currentPathname: string,
  router: AppRouterInstance
): boolean {
  if (isRedirecting) return false;

  if (status.destination === "APPLICATION_REJECTED" || status.approval_status === "REJECTED") {
    if (currentPathname !== "/application-rejected") {
      isRedirecting = true;
      router.replace("/application-rejected");
      setTimeout(() => { isRedirecting = false; }, 500);
      return true;
    }
  } else if (status.destination === "ACCOUNT_RESTRICTED") {
    if (currentPathname !== "/retailer/account-restricted" && currentPathname !== "/account-restricted") {
      isRedirecting = true;
      router.replace("/retailer/account-restricted");
      setTimeout(() => { isRedirecting = false; }, 500);
      return true;
    }
  } else if (status.approve_status !== true || status.active_status !== true) {
    if (currentPathname !== "/retailer/account-under-review" && currentPathname !== "/account-under-review") {
      isRedirecting = true;
      router.replace("/retailer/account-under-review");
      setTimeout(() => { isRedirecting = false; }, 500);
      return true;
    }
  } else {
    // If user is on waiting page and is both approved and active, automatically redirect to dashboard
    if (currentPathname === "/retailer/account-under-review" || currentPathname === "/account-under-review") {
      isRedirecting = true;
      router.replace("/retailer/dashboard");
      setTimeout(() => { isRedirecting = false; }, 500);
      return true;
    }
  }

  return false;
}
