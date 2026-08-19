// Shared Utilities & Helpers for Pay2Pay Platform

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(num);
}

export function formatMobileNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return mobile;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function truncateText(str: string, maxLength: number = 20): string {
  if (!str || str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

export function normalizeMobile(mobile: string): string {
  const clean = mobile.replace(/\D/g, "");
  if (clean.length > 10) return clean.slice(-10);
  return clean;
}

/**
 * Enterprise Banking Error Sanitizer
 * Ensures zero technical leakage, raw exception strings, or third-party vendor names
 * are exposed to customers or retailers. Maps raw/internal errors to predefined, friendly messages.
 */
export function sanitizeCustomerErrorMessage(rawError: any): string {
  if (!rawError) {
    return "Transaction could not be completed. If any amount was debited, it will be automatically refunded.";
  }

  let msg = "";
  if (typeof rawError === "string") {
    msg = rawError;
  } else if (typeof rawError === "object") {
    if (typeof rawError.friendly_message === "string" && rawError.friendly_message.trim()) {
      return rawError.friendly_message;
    }
    if (typeof rawError.customer_message === "string" && rawError.customer_message.trim()) {
      return rawError.customer_message;
    }
    if (typeof rawError.detail === "string") {
      msg = rawError.detail;
    } else if (Array.isArray(rawError.detail)) {
      msg = rawError.detail.map((e: any) => e.msg || e.message || "").filter(Boolean).join(", ");
    } else if (typeof rawError.message === "string") {
      msg = rawError.message;
    } else {
      msg = JSON.stringify(rawError);
    }
  }

  const lower = msg.toLowerCase();

  // 1. Connection / Network / Timeout / Server Unreachable failures
  if (
    lower.includes("failed to fetch") ||
    lower.includes("connection error") ||
    lower.includes("network error") ||
    lower.includes("unable to reach") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("net::err") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("server unreachable") ||
    lower.includes("network request failed") ||
    lower.includes("err_connection")
  ) {
    return "Unable to connect to the payment service. Please check your connection and try again.";
  }

  // 2. Insufficient Balance
  if (lower.includes("insufficient") || lower.includes("low balance") || lower.includes("wallet balance")) {
    return "Wallet balance is insufficient for this transaction.";
  }

  // 3. Limits
  if (lower.includes("daily limit") || lower.includes("daily transaction limit")) {
    return "Daily transaction limit exceeded.";
  }
  if (lower.includes("monthly limit") || lower.includes("beneficiary limit")) {
    return "Monthly transaction limit exceeded.";
  }
  if (lower.includes("limit")) {
    return "Transaction limit exceeded for this account.";
  }

  // 4. Beneficiary / Account / IFSC errors
  if (lower.includes("beneficiary") && (lower.includes("not found") || lower.includes("invalid") || lower.includes("failed"))) {
    return "Beneficiary verification failed. Please verify beneficiary details and try again.";
  }
  if (lower.includes("ifsc") || lower.includes("account number") || lower.includes("account details")) {
    return "Invalid beneficiary details. Please check account number and IFSC.";
  }

  // 5. Authentication / PIN errors
  if (lower.includes("mpin") || lower.includes("pin") || lower.includes("invalid operator transaction pin")) {
    return "Authentication Error: Invalid Security PIN.";
  }

  // 6. Frozen / Inactive Account
  if (lower.includes("frozen") || lower.includes("inactive") || lower.includes("suspended")) {
    return "Account or wallet is temporarily inactive. Please contact support.";
  }

  // 7. Duplicate / Idempotency
  if (lower.includes("duplicate") || lower.includes("idempotency") || lower.includes("already in progress")) {
    return "Duplicate transaction detected. Please check transaction history.";
  }

  // 8. Service / Vendor / Technical Outages / 5xx Errors / Vendor Names
  if (
    lower.includes("bulkpe") ||
    lower.includes("wowpe") ||
    lower.includes("cashfree") ||
    lower.includes("gateway") ||
    lower.includes("vendor") ||
    lower.includes("http 500") ||
    lower.includes("http 502") ||
    lower.includes("http 503") ||
    lower.includes("http 504") ||
    lower.includes("internal server error") ||
    lower.includes("unhandled exception") ||
    lower.includes("traceback") ||
    lower.includes("not activated") ||
    lower.includes("product disabled") ||
    lower.includes("axioserror") ||
    lower.includes("payout backend")
  ) {
    return "Payout service is temporarily unavailable. Please try again later.";
  }

  // Clean friendly string fallback
  if (msg.length > 0 && msg.length < 150 && !/[{<>]/.test(msg) && !lower.includes("error:") && !lower.includes("exception")) {
    return msg;
  }

  return "Transaction could not be completed. If any amount was debited, it will be automatically refunded.";
}

