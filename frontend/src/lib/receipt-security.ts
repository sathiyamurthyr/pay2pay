/**
 * Enterprise Receipt Security & Subdomain Routing Utilities
 * Guarantees customer-facing receipt isolation on dedicated subdomains:
 * - SMSPAY -> https://receipt.smspay.store
 * - Near4You -> https://receipt.near4you.store
 * - Pay2Pay -> https://receipt.pay2pay.in
 */

export interface ReceiptTokenPayload {
  tid: string;
  company_ref_id?: number;
  status?: string;
  orderId?: string;
  utr?: string;
  ts?: number;
}

/**
 * Deterministically resolves the dedicated customer-facing receipt base URL
 * for the given host or company code. Preserves local dev environment ports.
 */
export function resolveReceiptDomain(originOrHost?: string, companyCode?: string): string {
  let host = "";
  let protocol = "https:";

  if (typeof window !== "undefined") {
    protocol = window.location.protocol;
    host = (originOrHost || window.location.host || "").toLowerCase();
  } else {
    host = (originOrHost || "").toLowerCase();
  }

  // Preserve local development host and port
  if (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("0.0.0.0") ||
    host.includes("host.docker.internal")
  ) {
    const proto = protocol.startsWith("http") ? protocol : "http:";
    return `${proto}//${host}`;
  }

  const normalizedCompany = (companyCode || "").toUpperCase();

  if (
    host.includes("smspay") ||
    normalizedCompany === "SMSPAY" ||
    normalizedCompany === "SMS_PAY"
  ) {
    if (host) {
    const proto = protocol.startsWith("http") ? protocol : "https:";
    return `${proto}//${host}`;
  }
  return "";
  }

  if (
    host.includes("pay2pay") ||
    normalizedCompany === "PAY2PAY" ||
    normalizedCompany === "P2P"
  ) {
    return "https://receipt.pay2pay.in";
  }

  if (
    host.includes("near4you") ||
    normalizedCompany === "NEAR4YOU" ||
    normalizedCompany === "N4Y"
  ) {
    return "https://receipt.near4you.store";
  }

  if (host) {
    const proto = protocol.startsWith("http") ? protocol : "https:";
    return `${proto}//${host}`;
  }
  return "";
}

/**
 * Constructs the canonical public receipt capability URL on the isolated receipt subdomain.
 */
export function getPublicReceiptUrl(
  tokenOrTid: string,
  originOrHost?: string,
  companyCode?: string
): string {
  const base = resolveReceiptDomain(originOrHost, companyCode);
  const cleanToken = encodeURIComponent(String(tokenOrTid || "").trim());
  return `${base}/r/${cleanToken}`;
}

/**
 * Checks if the current or provided host is an isolated receipt subdomain.
 */
export function isReceiptSubdomain(host?: string): boolean {
  const h = (host || (typeof window !== "undefined" ? window.location.host : "")).toLowerCase();
  return (
    h.startsWith("receipt.") ||
    h.includes("receipt.smspay.store") ||
    h.includes("receipt.near4you.store") ||
    h.includes("receipt.pay2pay.in") ||
    h.includes("receipt.smspay.in") ||
    h.includes("receipt.near4you.in")
  );
}
