"use client";

import { useState, useEffect } from "react";

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
 */
export function getInitialBrandingByHostname(): CompanyBrandingData {
  if (typeof window === "undefined") {
    return COMPANY_PRESETS.PAY2PAY;
  }

  const host = window.location.hostname.toLowerCase();
  const port = window.location.port;

  // 1. Production Canonical Domains (Highest Authority - Strict Domain Isolation)
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

  // 2. Localhost Dedicated Port Resolution
  if (port === "3000" || port === "4003") {
    return COMPANY_PRESETS.PAY2PAY;
  }
  if (port === "4001") {
    return COMPANY_PRESETS.NEAR4YOU;
  }
  if (port === "4002") {
    return COMPANY_PRESETS.SMSPAY;
  }

  // 3. Localhost Query Parameter (Only for explicit local dev preview on localhost)
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const companyParam = (searchParams.get("company") || searchParams.get("domain") || "").toLowerCase();
      if (companyParam.includes("pay2pay")) return COMPANY_PRESETS.PAY2PAY;
      if (companyParam.includes("near4you")) return COMPANY_PRESETS.NEAR4YOU;
      if (companyParam.includes("smspay")) return COMPANY_PRESETS.SMSPAY;
    } catch {}
  }

  // 4. Default to Pay2Pay platform standard
  return COMPANY_PRESETS.PAY2PAY;
}

export function useCompanyBranding() {
  const [branding, setBranding] = useState<CompanyBrandingData>(getInitialBrandingByHostname());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchBranding() {
      try {
        const canonical = getInitialBrandingByHostname();

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

        const hostname = typeof window !== "undefined" ? window.location.hostname : "";
        const queryParams = new URLSearchParams();

        // Pass authoritative domain corresponding to canonical branding
        if (canonical.company_code === "PAY2PAY") {
          queryParams.set("domain", "pay2pay.in");
          queryParams.set("company", "PAY2PAY");
        } else if (canonical.company_code === "NEAR4YOU") {
          queryParams.set("domain", "near4you.store");
          queryParams.set("company", "NEAR4YOU");
        } else if (canonical.company_code === "SMSPAY") {
          queryParams.set("domain", "smspay.store");
          queryParams.set("company", "SMSPAY");
        } else if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
          queryParams.set("domain", hostname);
        }

        const endpoint = `/api/v1/companies/branding?${queryParams.toString()}`;

        const res = await fetch(endpoint, {
          headers,
          cache: "no-store",
        });

        if (res.ok) {
          const json = await res.json();
          if (json?.data && isMounted) {
            const data: CompanyBrandingData = json.data;

            // Brand safety validation: Disallow cross-domain brand collision
            if (canonical.company_code && data.company_code && data.company_code !== canonical.company_code) {
              return;
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

            setBranding((prev) => ({
              ...prev,
              ...data,
            }));

            // Dynamically inject CSS variables to root DOM
            if (typeof document !== "undefined") {
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

              // Update document title if present
              if (data.display_name && !document.title.includes(data.display_name)) {
                document.title = `${data.display_name} - Enterprise FinTech Platform`;
              }

              // Update favicon dynamically
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
          }
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic company branding, using domain default:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchBranding();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    ...branding,
    isLoading,
    branding,
  };
}
