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
    display_name: "Near 4 You",
    short_name: "N4U",
    logo_url: "/branding/logo.svg",
    favicon_url: "/branding/favicon.png",
    primary_colour: "#A20A3A",
    secondary_colour: "#EDC11E",
    website: "https://near4you.store",
    domains: ["near4you.store", "login.near4you.store"],
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
    domains: ["pay2pay.in", "login.pay2pay.in"],
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
    domains: ["smspay.store", "login.smspay.store", "smspay.in", "login.smspay.in"],
  },
};

export function getInitialBrandingByHostname(): CompanyBrandingData {
  if (typeof window === "undefined") {
    return COMPANY_PRESETS.NEAR4YOU;
  }
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const domainParam = (searchParams.get("domain") || "").toLowerCase();
    if (domainParam.includes("pay2pay")) {
      return COMPANY_PRESETS.PAY2PAY;
    }
    if (domainParam.includes("smspay")) {
      return COMPANY_PRESETS.SMSPAY;
    }
    if (domainParam.includes("near4you")) {
      return COMPANY_PRESETS.NEAR4YOU;
    }
  } catch {}

  const host = window.location.hostname.toLowerCase();
  if (host.includes("pay2pay")) {
    return COMPANY_PRESETS.PAY2PAY;
  }
  if (host.includes("smspay")) {
    return COMPANY_PRESETS.SMSPAY;
  }
  return COMPANY_PRESETS.NEAR4YOU;
}

export function useCompanyBranding() {
  const [branding, setBranding] = useState<CompanyBrandingData>(getInitialBrandingByHostname());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchBranding() {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("accessToken") ||
              localStorage.getItem("token") ||
              localStorage.getItem("auth_token") ||
              localStorage.getItem("pay2pay_access_token") ||
              localStorage.getItem("p2p_access_token")
            : null;

        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const hostname = typeof window !== "undefined" ? window.location.hostname : "";
        const queryParams = new URLSearchParams();
        if (hostname) {
          queryParams.set("domain", hostname);
        }

        // Determine API endpoint
        let endpoint = `/api/v1/companies/branding?${queryParams.toString()}`;
        if (typeof window !== "undefined" && window.location.port === "3000") {
          // Dev environment local direct or proxied
          endpoint = `/api/v1/companies/branding?${queryParams.toString()}`;
        }

        const res = await fetch(endpoint, {
          headers,
          cache: "no-store",
        });

        if (res.ok) {
          const json = await res.json();
          if (json?.data && isMounted) {
            const data: CompanyBrandingData = json.data;
            setBranding((prev) => ({
              ...prev,
              ...data,
            }));

            // Dynamically inject CSS variables to root DOM
            if (typeof document !== "undefined") {
              const root = document.documentElement;
              if (data.primary_colour) {
                root.style.setProperty("--brand-primary", data.primary_colour);
                root.style.setProperty("--accent", data.primary_colour);
              }
              if (data.secondary_colour) {
                root.style.setProperty("--brand-secondary", data.secondary_colour);
                root.style.setProperty("--accent-gold", data.secondary_colour);
              }

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
