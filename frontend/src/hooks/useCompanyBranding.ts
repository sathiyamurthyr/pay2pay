"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { COMPANY_PRESETS, resolveBrandingByHost } from "@/lib/company-branding";
import type { CompanyBrandingData } from "@/lib/company-branding";

export { COMPANY_PRESETS, resolveBrandingByHost };
export type { CompanyBrandingData };

export const CompanyBrandingHostContext = createContext<string>("");

export const CompanyBrandingProvider: React.FC<{ initialHost?: string; children: React.ReactNode }> = ({
  initialHost = "",
  children,
}) => {
  return React.createElement(CompanyBrandingHostContext.Provider, { value: initialHost }, children);
};

export type BrandingStatus = "RESOLVED" | "LOADING" | "DOMAIN_ERROR" | "COMPANY_ERROR" | "BRANDING_ERROR";

export interface BrandingError {
  code: string;
  message: string;
  correlationId?: string;
  isRetryable: boolean;
  domain?: string;
}

/**
 * Resolves application identity strictly using the verified canonical hostname and port.
 * Works on both SSR (using CompanyBrandingProvider initialHost) and browser.
 * Returns null if the domain is unmapped/unknown to prevent silent cross-company fallback.
 */
export function getInitialBrandingByHostname(ssrHost?: string): CompanyBrandingData | null {
  if (typeof window !== "undefined") {
    return resolveBrandingByHost(window.location.host, window.location.search);
  }
  if (ssrHost) {
    return resolveBrandingByHost(ssrHost);
  }
  return null;
}

export function useCompanyBranding() {
  const ssrHost = useContext(CompanyBrandingHostContext);
  const initial = getInitialBrandingByHostname(ssrHost);
  const [branding, setBranding] = useState<CompanyBrandingData | null>(initial);
  const [status, setStatus] = useState<BrandingStatus>(initial ? "RESOLVED" : "DOMAIN_ERROR");
  const [error, setError] = useState<BrandingError | null>(
    initial
      ? null
      : {
        code: "UNMAPPED_DOMAIN",
        message: `Application Identity Configuration Error: Hostname '${typeof window !== "undefined" ? window.location.hostname : ssrHost}' is not mapped to any registered company identity.`,
        domain: typeof window !== "undefined" ? window.location.hostname : ssrHost,
        isRetryable: true,
        correlationId: `cid-init-dom`
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
    } catch { }
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
          } catch { }
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
      if (host && host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0") {
        queryParams.set("domain", host);
      } else if (canonical.company_code) {
        queryParams.set("company", canonical.company_code);
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
          if (canonical?.company_code && data.company_code && data.company_code !== canonical.company_code) {
            throw new Error(`Cross-domain brand mismatch: Expected ${canonical.company_code}, received ${data.company_code}`);
          }

          setBranding(data);
          setStatus("RESOLVED");
          setError(null);

          // Store in company-scoped session cache
          if (typeof window !== "undefined" && data.company_code) {
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
    company_code: branding?.company_code || "",
    company_name: branding?.company_name || "",
    legal_name: branding?.legal_name || "",
    display_name: branding?.display_name || "",
    logo_url: branding?.logo_url || "",
    favicon_url: branding?.favicon_url || "",
    primary_colour: branding?.primary_colour || "",
    secondary_colour: branding?.secondary_colour || "",
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
    root.style.setProperty("--brand-surface", `${data.primary_colour}12`);
    root.style.setProperty("--brand-border", `${data.primary_colour}40`);
    root.style.setProperty("--accent", data.primary_colour);
    root.style.setProperty("--info", data.primary_colour);
    root.style.setProperty("--ent-primary", data.primary_colour);
    root.style.setProperty("--ent-primary-text", data.primary_colour);
    root.style.setProperty("--ent-primary-light", `${data.primary_colour}14`);
    root.style.setProperty("--ent-sidebar-active", data.primary_colour);
    root.style.setProperty("--ent-sidebar-active-bg", `${data.primary_colour}14`);
    root.style.setProperty("--ent-sidebar-category", data.primary_colour);
    root.style.setProperty("--ent-info", data.primary_colour);
    root.style.setProperty("--ent-info-text", data.primary_colour);
    root.style.setProperty("--ent-purple-text", data.primary_colour);
    root.style.setProperty("--p2p-primary-color", data.primary_colour);
    root.style.setProperty("--grid-primary", data.primary_colour);
    root.style.setProperty("--grid-search-focus-border", data.primary_colour);
    root.style.setProperty("--grid-search-focus-shadow", `${data.primary_colour}28`);
  }
  if (data.secondary_colour) {
    root.style.setProperty("--brand-secondary", data.secondary_colour);
    root.style.setProperty("--accent-hover", data.secondary_colour);
    root.style.setProperty("--accent-gold", data.secondary_colour);
    root.style.setProperty("--accent-orange", data.secondary_colour);
    root.style.setProperty("--ent-primary-hover", data.secondary_colour);
    root.style.setProperty("--grid-primary-hover", data.secondary_colour);
  }
  if (data.primary_colour && data.secondary_colour) {
    const richGrad = `linear-gradient(135deg, ${data.primary_colour} 0%, ${data.secondary_colour} 100%)`;
    root.style.setProperty("--brand-gradient", richGrad);
    root.style.setProperty("--gradient-rich", richGrad);
    root.style.setProperty("--gradient-rich-h", `linear-gradient(to right, ${data.primary_colour} 0%, ${data.secondary_colour} 100%)`);
  }

  root.style.setProperty("--text-primary", isNear4You ? "#292329" : "#0F172A");
  root.style.setProperty("--text-secondary", isNear4You ? "#625B60" : "#334155");
  root.style.setProperty("--border", isNear4You ? "#E8E2E5" : "#E2E8F0");
  root.setAttribute("data-company", data.company_code);

  try {
    window.dispatchEvent(new CustomEvent("p2p_branding_updated", { detail: data }));
  } catch {}

  if (data.display_name && !document.title.includes(data.display_name)) {
    document.title = `${data.display_name} - FinTech Platform`;
  }

  if (data.primary_colour) {
    let metaTheme = document.querySelector("meta[name='theme-color']") as HTMLMetaElement;
    if (!metaTheme) {
      metaTheme = document.createElement("meta");
      metaTheme.name = "theme-color";
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = data.primary_colour;
  }

  if (data.favicon_url) {
    const existingIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
    if (existingIcons.length > 0) {
      existingIcons.forEach((link) => {
        link.href = data.favicon_url!;
        if (data.favicon_url!.endsWith(".svg")) {
          link.type = "image/svg+xml";
        } else if (data.favicon_url!.endsWith(".png")) {
          link.type = "image/png";
        } else if (data.favicon_url!.endsWith(".ico")) {
          link.type = "image/x-icon";
        }
      });
    } else {
      const link = document.createElement("link");
      link.rel = "shortcut icon";
      link.href = data.favicon_url;
      if (data.favicon_url.endsWith(".svg")) {
        link.type = "image/svg+xml";
      } else if (data.favicon_url.endsWith(".png")) {
        link.type = "image/png";
      }
      document.head.appendChild(link);
    }

    const appleIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    const appleUrl = data.company_code === "SMSPAY"
      ? "/branding/smspay-icon-192.png"
      : data.company_code === "PAY2PAY"
        ? "/branding/pay2pay-icon-192.png"
        : "/branding/near4you-favicon.png";
    if (appleIcon) {
      appleIcon.href = appleUrl;
    }
  }
}
