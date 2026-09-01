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
  logo_url: string;
  favicon_url?: string;
  primary_colour?: string;
  secondary_colour?: string;
}

const DEFAULT_BRANDING: CompanyBrandingData = {
  company_code: "PAY2PAY",
  company_name: "Pay2Pay",
  legal_name: "SUPER REX PRODUCTS PRIVATE LIMITED",
  display_name: "Pay2Pay",
  logo_url: "/branding/logo.png",
  favicon_url: "/branding/favicon.png",
  primary_colour: "#2563EB",
  secondary_colour: "#1E40AF",
};

export function useCompanyBranding() {
  const [branding, setBranding] = useState<CompanyBrandingData>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchBranding() {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("accessToken") ||
              localStorage.getItem("token") ||
              localStorage.getItem("auth_token")
            : null;

        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("http://127.0.0.1:8000/api/v1/companies/branding", {
          headers,
        });

        if (res.ok) {
          const json = await res.json();
          if (json?.data && isMounted) {
            setBranding({
              ...DEFAULT_BRANDING,
              ...json.data,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic company branding, using default:", err);
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
