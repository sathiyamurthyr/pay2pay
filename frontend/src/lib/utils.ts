import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Normalizes phone numbers according to enterprise search rules:
 * 1. Remove all spaces
 * 2. Remove hyphens (-)
 * 3. Remove parentheses ()
 * 4. Remove dots (.)
 * 5. Remove "+" symbols
 * 6. Remove country code prefixes (e.g. +91, 91, 0) when applicable
 * 7. Trim whitespace
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";

  // 1-5 & 7. Strip spaces, hyphens, parens, dots, +, and non-digits
  let clean = phone.toString().trim().replace(/[\s\-\(\)\.\+]/g, "").replace(/\D/g, "");

  // 6. Strip country code prefix (91 or 0) for 10-digit mobile numbers
  if (clean.length === 12 && clean.startsWith("91")) {
    clean = clean.slice(2);
  } else if (clean.length === 11 && clean.startsWith("0")) {
    clean = clean.slice(1);
  } else if (clean.length > 10 && clean.startsWith("91")) {
    clean = clean.slice(2);
  }

  return clean;
}

/**
 * Normalizes text/phone search query and performs intelligent matching across multiple fields:
 * - Case-insensitive match for Names & IDs
 * - Normalized phone match for Customer/Alternate/WhatsApp/Beneficiary/Agent Mobile
 */
export function isNormalizedMatch(query: string, ...targets: (string | null | undefined)[]): boolean {
  if (!query) return true;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true;

  const lowerQuery = trimmedQuery.toLowerCase();
  const normQuery = normalizePhoneNumber(trimmedQuery);

  for (const target of targets) {
    if (!target) continue;

    const lowerTarget = target.toLowerCase();
    if (lowerTarget.includes(lowerQuery)) {
      return true;
    }

    if (normQuery.length >= 3) {
      const normTarget = normalizePhoneNumber(target);
      if (normTarget.length >= 3 && normTarget.includes(normQuery)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Formats any raw UUID or long ID string into a clean, human-readable Short Customer ID.
 * Example:
 * - "8f64d450-8b7c-4414-a998-52f1d99e01b1" -> "CUST-8F64D450"
 * - "011b2d7f-9426-4444-8888-000000000001" -> "CUST-011B2D7F"
 * - "CUST-1001" -> "CUST-1001"
 */
export function formatShortCustomerId(id?: string | null): string {
  if (!id) return "CUST-LIVE";
  const str = id.toString().trim();
  if (str.startsWith("CUST-") && str.length <= 15 && !str.includes("-", 5)) return str;
  if (str.includes("-")) {
    const parts = str.split("-");
    const segment = parts[0].startsWith("CUST") ? (parts[1] || parts[0]) : parts[0];
    if (segment && segment.length >= 4) {
      return `CUST-${segment.toUpperCase()}`;
    }
  }
  if (str.length > 12) {
    return `CUST-${str.slice(0, 8).toUpperCase()}`;
  }
  return str.startsWith("CUST-") ? str : `CUST-${str.toUpperCase()}`;
}

