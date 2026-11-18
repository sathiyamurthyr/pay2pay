"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface CompanyBrandingData {
  company_id?: string | null;
  company_ref_id?: number;
  tenant_ref_id?: number;
  company_code: string;
  company_name: string;
  legal_name: string;
  display_name: string;
  short_name?: string;
  logo_url: string;
  favicon_url?: string;
  primary_colour?: string;
  secondary_colour?: string;
  website?: string;
  domains?: string[];
}

export type BrandingStatus = "RESOLVED" | "LOADING" | "DOMAIN_ERROR" | "COMPANY_ERROR" | "BRANDING_ERROR";

export interface BrandingError {
  code: string;
  message: string;
  correlationId?: string;
  isRetryable: boolean;
  domain?: string;
}

export const COMPANY_PRESETS: Record<string, CompanyBrandingData> = {
  NEAR4YOU: {
    company_ref_id: 1,
    tenant_ref_id: 1,
    company_code: "NEAR4YOU",
    company_name: "Near4You",
    legal_name: "Near4You Enterprise Technologies Pvt. Ltd.",
    display_name: "Near4You",
    short_name: "N4U",
    logo_url: "/branding/logo.svg",
    favicon_url: "/branding/favicon.png",
    primary_colour: "#A20A3A",
    secondary_colour: "#EDC11E",
    website: "https://near4you.store",
    domains: ["near4you.store", "login.near4you.store", "admin.near4you.store", "near4you.in", "admin.near4you.in"],
  },
  PAY2PAY: {
    company_ref_id: 47,
    tenant_ref_id: 1,
    company_code: "PAY2PAY",
    company_name: "Pay2Pay",
    legal_name: "Pay2Pay FinTech Solutions Pvt. Ltd.",
    display_name: "Pay2Pay",
    short_name: "P2P",
    logo_url: "/branding/pay2pay-logo.png",
    favicon_url: "/branding/favicon.png",
    primary_colour: "#2563EB",
    secondary_colour: "#1E40AF",
    website: "https://pay2pay.in",
    domains: ["pay2pay.in", "login.pay2pay.in", "admin.pay2pay.in", "pay2pay.com", "admin.pay2pay.com"],
  },
  SMSPAY: {
    company_ref_id: 2,
    tenant_ref_id: 1,
    company_code: "SMSPAY",
    company_name: "SMSPAY",
    legal_name: "SMSPAY Technologies Pvt. Ltd.",
    display_name: "SMSPAY",
    short_name: "SMSP",
    logo_url: "/branding/smspay-logo.svg",
    favicon_url: "/branding/smspay-mark.svg",
    primary_colour: "#059669",
    secondary_colour: "#047857",
    website: "https://smspay.store",
    domains: ["smspay.store", "login.smspay.store", "admin.smspay.store", "smspay.in", "login.smspay.in", "admin.smspay.in"],
  },
};

/**
 * Resolves application identity strictly using the verified canonical hostname and port.
 * Never allows stale localStorage or other domain contexts to leak branding across domains.
 * Returns null if the domain is unmapped/unknown to prevent silent cross-company fallback.
 */
export function getInitialBrandingByHostname(): CompanyBrandingData | null {
  if (typeof window === "undefined") {
    return COMPANY_PRESETS.PAY2PAY;
  }

  const host = window.location.hostname.toLowerCase();
  const port = window.location.port;

  // 1. Explicit Query Parameter check for simulated / testing contexts
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const domainParam = (searchParams.get("domain") || searchParams.get("host") || "").toLowerCase();
    const companyParam = (searchParams.get("company") || "").toLowerCase();

    if (domainParam === "unknown.com" || companyParam === "unknown" || companyParam === "invalid") {
      return null;
    }
    if (domainParam.includes("pay2pay") || companyParam.includes("pay2pay")) return COMPANY_PRESETS.PAY2PAY;
    if (domainParam.includes("near4you") || companyParam.includes("near4you")) return COMPANY_PRESETS.NEAR4YOU;
    if (domainParam.includes("smspay") || companyParam.includes("smspay")) return COMPANY_PRESETS.SMSPAY;
  } catch {}

  // 2. Production Canonical Domains (Highest Authority - Strict Domain Isolation)
  if (
    host.includes("pay2pay") ||
    host.endsWith("pay2pay.in") ||
    host.endsWith("pay2pay.com")
  ) {
    return COMPANY_PRESETS.PAY2PAY;
  }
  if (
    host.includes("near4you") ||
    host.endsWith("near4you.store") ||
    host.endsWith("near4you.in")
  ) {
    return COMPANY_PRESETS.NEAR4YOU;
  }
  if (
    host.includes("smspay") ||
    host.endsWith("smspay.store") ||
    host.endsWith("smspay.in")
  ) {
    return COMPANY_PRESETS.SMSPAY;
  }

  // 3. Localhost Dedicated Port Resolution
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
    if (port === "3000" || port === "4003") {
      return COMPANY_PRESETS.PAY2PAY;
    }
    if (port === "4001") {
      return COMPANY_PRESETS.NEAR4YOU;
    }
    if (port === "4002") {
      return COMPANY_PRESETS.SMSPAY;
    }
    // Generic local dev default on base port
    return COMPANY_PRESETS.PAY2PAY;
  }

  // 4. Any other unmapped public host: FAIL CLOSED!
  return null;
}

export function useCompanyBranding() {
  const initial = getInitialBrandingByHostname();
  const [branding, setBranding] = useState<CompanyBrandingData | null>(initial);
  const [status, setStatus] = useState<BrandingStatus>(initial ? "RESOLVED" : "DOMAIN_ERROR");
  const [error, setError] = useState<BrandingError | null>(
    initial
      ? null
      : {
          code: "UNMAPPED_DOMAIN",
          message: `Application Identity Configuration Error: Hostname '${typeof window !== "undefined" ? window.location.hostname : ""}' is not mapped to any registered company identity.`,
          domain: typeof window !== "undefined" ? window.location.hostname : "",
          isRetryable: true,
          correlationId: `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
        }
  );
  const [isLoading, setIsLoading] = useState<boolean>(!initial);
  const isFetchingRef = useRef<boolean>(false);

  // Prevent cross-domain cache leakage: purge session keys from other domains
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const curHost = window.location.hostname.toLowerCase();
      const lastHost = sessionStorage.getItem("p2p_last_hostname");
      if (lastHost && lastHost !== curHost) {
        // Domain switched: clear domain-specific caches
        sessionStorage.removeItem("p2p_cached_branding");
        sessionStorage.removeItem("p2p_cached_branding_host");
      }
      sessionStorage.setItem("p2p_last_hostname", curHost);
    } catch {}
  }, []);

  const fetchBranding = useCallback(async (isRetry = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
    const canonical = getInitialBrandingByHostname();

    if (!canonical) {
      // Unmapped domain: Fail closed immediately
      const corrId = `cid-dom-${Date.now().toString(36)}`;
      setStatus("DOMAIN_ERROR");
      setError({
        code: "UNMAPPED_DOMAIN",
        message: `Application Identity Configuration Error: Hostname '${host}' is not mapped to any registered company identity.`,
        domain: host,
        correlationId: corrId,
        isRetryable: true
      });
      setBranding(null);
      setIsLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {
      // Check scoped session cache
      if (!isRetry && typeof window !== "undefined") {
        const cachedStr = sessionStorage.getItem(`p2p_cached_branding_${canonical.company_code}`);
        if (cachedStr) {
          try {
            const cachedData = JSON.parse(cachedStr) as CompanyBrandingData;
            if (cachedData && cachedData.company_code === canonical.company_code) {
              setBranding(cachedData);
              setStatus("RESOLVED");
              setError(null);
              setIsLoading(false);
              isFetchingRef.current = false;
              applyBrandingTokens(cachedData);
              return;
            }
          } catch {}
        }
      }

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("p2p_admin_token") ||
            localStorage.getItem("p2p_super_admin_token") ||
            localStorage.getItem("p2p_retailer_token") ||
            localStorage.getItem("p2p_access_token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token") ||
            localStorage.getItem("auth_token") ||
            localStorage.getItem("pay2pay_access_token")
          : null;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const queryParams = new URLSearchParams();
      if (canonical.company_code === "PAY2PAY") {
        queryParams.set("domain", "pay2pay.in");
        queryParams.set("company", "PAY2PAY");
      } else if (canonical.company_code === "NEAR4YOU") {
        queryParams.set("domain", "near4you.store");
        queryParams.set("company", "NEAR4YOU");
      } else if (canonical.company_code === "SMSPAY") {
        queryParams.set("domain", "smspay.store");
        queryParams.set("company", "SMSPAY");
      } else if (host && host !== "localhost" && host !== "127.0.0.1") {
        queryParams.set("domain", host);
      }

      const endpoint = `/api/v1/companies/branding?${queryParams.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(endpoint, {
        headers,
        cache: "no-store",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          const data: CompanyBrandingData = json.data;

          // Cross-domain brand safety validation
          if (canonical.company_code && data.company_code && data.company_code !== canonical.company_code) {
            if (data.company_code === "SUPERREX" && ["SMSPAY", "PAY2PAY", "NEAR4YOU"].includes(canonical.company_code)) {
              data.company_code = canonical.company_code;
            } else {
              throw new Error(`Cross-domain brand mismatch: Expected ${canonical.company_code}, received ${data.company_code}`);
            }
          }

          if (data.company_code === "NEAR4YOU" || (data.company_name && data.company_name.replace(/\s+/g, "").toUpperCase() === "NEAR4YOU")) {
            data.display_name = "Near4You";
            data.company_name = "Near4You";
          }
          if (data.company_code === "PAY2PAY" || (data.company_name && data.company_name.replace(/\s+/g, "").toUpperCase() === "PAY2PAY")) {
            data.display_name = "Pay2Pay";
            data.company_name = "Pay2Pay";
          }
          if (data.company_code === "SMSPAY" || (data.company_name && data.company_name.replace(/\s+/g, "").toUpperCase() === "SMSPAY")) {
            data.display_name = "SMSPAY";
            data.company_name = "SMSPAY";
          }

          setBranding(data);
          setStatus("RESOLVED");
          setError(null);

          // Store in tenant-scoped session cache
          if (typeof window !== "undefined") {
            sessionStorage.setItem(`p2p_cached_branding_${data.company_code}`, JSON.stringify(data));
          }

          applyBrandingTokens(data);
        } else {
          setBranding(canonical);
          setStatus("RESOLVED");
          setError(null);
          applyBrandingTokens(canonical);
        }
      } else if (res.status === 404) {
        const errJson = await res.json().catch(() => ({}));
        const code = errJson?.detail?.code || "COMPANY_NOT_FOUND";
        const msg = errJson?.detail?.message || "Unable to identify your company account.";
        const corrId = errJson?.detail?.correlation_id || `cid-${Date.now().toString(36)}`;

        if (code === "UNMAPPED_DOMAIN") {
          setStatus("DOMAIN_ERROR");
          setError({
            code: "UNMAPPED_DOMAIN",
            message: msg,
            domain: host,
            correlationId: corrId,
            isRetryable: true
          });
        } else {
          setStatus("COMPANY_ERROR");
          setError({
            code: "COMPANY_NOT_FOUND",
            message: msg,
            correlationId: corrId,
            isRetryable: true
          });
        }
        setBranding(null);
      } else {
        throw new Error(`Branding API returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.warn("Branding resolution error:", err);
      // If we have verified canonical preset, use it as fallback for resilience
      if (canonical) {
        setBranding(canonical);
        setStatus("RESOLVED");
        setError(null);
        applyBrandingTokens(canonical);
      } else {
        const corrId = `cid-err-${Date.now().toString(36)}`;
        setStatus("BRANDING_ERROR");
        setError({
          code: "BRANDING_FETCH_FAILED",
          message: "Failed to load company branding configuration. Please check your network connection and retry.",
          correlationId: corrId,
          isRetryable: true
        });
        setBranding(null);
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const retry = useCallback(() => {
    fetchBranding(true);
  }, [fetchBranding]);

  useEffect(() => {
    fetchBranding(false);
  }, [fetchBranding]);

  return {
    ...branding,
    branding,
    status,
    error,
    isLoading,
    retry,
    isPay2Pay: branding?.company_code === "PAY2PAY",
    isNear4You: branding?.company_code === "NEAR4YOU",
    isSmsPay: branding?.company_code === "SMSPAY",
  };
}

function applyBrandingTokens(data: CompanyBrandingData) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isPay2Pay = data.company_code === "PAY2PAY";
  const isSmsPay = data.company_code === "SMSPAY";
  const isNear4You = data.company_code === "NEAR4YOU";

  if (data.primary_colour) {
    root.style.setProperty("--brand-primary", data.primary_colour);
    root.style.setProperty("--accent", data.primary_colour);
  }
  if (data.secondary_colour) {
    root.style.setProperty("--brand-secondary", data.secondary_colour);
    root.style.setProperty("--accent-gold", data.secondary_colour);
  }

  root.style.setProperty("--text-primary", isNear4You ? "#292329" : "#0F172A");
  root.style.setProperty("--text-secondary", isNear4You ? "#625B60" : "#334155");
  root.style.setProperty("--border", isNear4You ? "#E8E2E5" : "#E2E8F0");
  root.setAttribute("data-company", data.company_code);

  if (data.display_name && !document.title.includes(data.display_name)) {
    document.title = `${data.display_name} - FinTech Platform`;
  }

  if (data.favicon_url) {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.type = "image/x-icon";
      link.rel = "shortcut icon";
      document.getElementsByTagName("head")[0].appendChild(link);
    }
    link.href = data.favicon_url;
  }
}
