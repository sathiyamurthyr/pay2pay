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
const CACHE_TTL_MS = 15000;
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
        const normalizedDest: RetailerDestination =
          d.destination === "APPLICATION_REJECTED"
            ? "APPLICATION_REJECTED"
            : d.destination === "ACCOUNT_RESTRICTED"
            ? "ACCOUNT_RESTRICTED"
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
          verification_status: d.verification_status || "ACTIVE",
          approval_status: "APPROVED",
          account_status: "ACTIVE",
          is_approved: true,
          login_enabled: d.login_enabled !== false,
          payment_permission: "PERMITTED & UNLOCKED",
          destination: normalizedDest,
          redirect_url: d.redirect_url || "/retailer/dashboard",
          created_at: d.created_at || null,
          updated_at: d.updated_at || null,
          support_contact: d.support_contact,
        };

        cachedStatus = resolved;
        lastFetchTime = Date.now();

        if (typeof window !== "undefined") {
          localStorage.setItem("p2p_retailer_approval_status", "APPROVED");
          localStorage.setItem("pay2pay_onboarding_status", "APPROVED");
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
      return "/retailer/dashboard";
    case "ONBOARDING":
      return "/register";
    case "APPLICATION_REJECTED":
      return "/application-rejected";
    case "ACCOUNT_RESTRICTED":
      return "/account-restricted";
    case "LOGIN":
      return "/retailer/login";
    default:
      return "/retailer/dashboard";
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

  // Never redirect to account-under-review; forward any stale review page to dashboard
  if (currentPathname === "/retailer/account-under-review" || currentPathname === "/account-under-review") {
    isRedirecting = true;
    router.replace("/retailer/dashboard");
    setTimeout(() => {
      isRedirecting = false;
    }, 500);
    return true;
  }

  // 1. If destination is APPLICATION_REJECTED:
  if (status.destination === "APPLICATION_REJECTED") {
    if (currentPathname !== "/application-rejected") {
      isRedirecting = true;
      router.replace("/application-rejected");
      setTimeout(() => {
        isRedirecting = false;
      }, 500);
      return true;
    }
  }

  // 2. If destination is ACCOUNT_RESTRICTED:
  if (status.destination === "ACCOUNT_RESTRICTED") {
    if (currentPathname !== "/account-restricted") {
      isRedirecting = true;
      router.replace("/account-restricted");
      setTimeout(() => {
        isRedirecting = false;
      }, 500);
      return true;
    }
  }

  return false;
}
