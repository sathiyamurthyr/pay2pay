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
    company_name: "SATHUS TECHNOLOGY PRIVATE LIMITED",
    legal_name: "SATHUS TECHNOLOGY PRIVATE LIMITED",
    display_name: "Near4You",
    short_name: "N4U",
    logo_url: "/branding/logo.svg",
    favicon_url: "/branding/near4you-favicon.png",
    primary_colour: "#A20A3A",
    secondary_colour: "#EDC11E",
    website: "https://near4you.store",
    domains: ["near4you.store", "login.near4you.store", "admin.near4you.store", "receipt.near4you.store", "near4you.in", "admin.near4you.in", "receipt.near4you.in"],
  },
  PAY2PAY: {
    company_ref_id: 47,
    tenant_ref_id: 1,
    company_code: "PAY2PAY",
    company_name: "SUPER REX PRODUCTS PRIVATE LIMITED",
    legal_name: "SUPER REX PRODUCTS PRIVATE LIMITED",
    display_name: "Pay2Pay",
    short_name: "P2P",
    logo_url: "/branding/pay2pay-logo.png",
    favicon_url: "/branding/pay2pay-favicon.png",
    primary_colour: "#2563EB",
    secondary_colour: "#1E40AF",
    website: "https://pay2pay.in",
    domains: ["pay2pay.in", "login.pay2pay.in", "admin.pay2pay.in", "receipt.pay2pay.in", "pay2pay.com", "admin.pay2pay.com"],
  },
  SMSPAY: {
    company_ref_id: 2,
    tenant_ref_id: 1,
    company_code: "SMSPAY",
    company_name: "INSPEL TECHNOLOGIES SOLUTIONS PVT",
    legal_name: "INSPEL TECHNOLOGIES SOLUTIONS PVT",
    display_name: "SMSPAY",
    short_name: "SMSP",
    logo_url: "/branding/smspay-logo.svg",
    favicon_url: "/branding/smspay-favicon-32x32.png",
    primary_colour: "#0F3B7D",
    secondary_colour: "#D4AF37",
    website: "https://smspay.store",
    domains: ["smspay.store", "login.smspay.store", "admin.smspay.store", "receipt.smspay.store", "smspay.in", "login.smspay.in", "admin.smspay.in", "receipt.smspay.in"],
  },
};

export function resolveBrandingByHost(hostInput?: string, searchInput?: string): CompanyBrandingData | null {
  const raw = (hostInput || "").split(",")[0].toLowerCase().trim();
  const colonIdx = raw.lastIndexOf(":");
  const host = colonIdx > -1 && !raw.includes("]") ? raw.slice(0, colonIdx) : raw;
  const port = colonIdx > -1 && !raw.includes("]") ? raw.slice(colonIdx + 1) : "";

  if (searchInput) {
    try {
      const searchParams = new URLSearchParams(searchInput);
      const domainParam = (searchParams.get("domain") || searchParams.get("host") || "").toLowerCase();
      const companyParam = (searchParams.get("company") || "").toLowerCase();

      if (domainParam === "unknown.com" || companyParam === "unknown" || companyParam === "invalid") {
        return null;
      }
      if (domainParam.includes("pay2pay") || companyParam.includes("pay2pay")) return COMPANY_PRESETS.PAY2PAY;
      if (domainParam.includes("near4you") || companyParam.includes("near4you")) return COMPANY_PRESETS.NEAR4YOU;
      if (domainParam.includes("smspay") || companyParam.includes("smspay")) return COMPANY_PRESETS.SMSPAY;
    } catch {}
  }

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
    return COMPANY_PRESETS.PAY2PAY;
  }

  return null;
}
