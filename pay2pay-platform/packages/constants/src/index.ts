// Shared Constants & Enums for Pay2Pay Platform

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export const APP_DOMAINS = {
  WEBSITE: "https://pay2pay.in",
  SUPER_ADMIN: "https://super.pay2pay.in",
  ADMIN: "https://admin.pay2pay.in",
  SUPER_DISTRIBUTOR: "https://sd.pay2pay.in",
  DISTRIBUTOR: "https://dist.pay2pay.in",
  RETAILER: "https://ret.pay2pay.in",
  SHARE_PAGES: "https://share.pay2pay.in",
  AUTH: "https://auth.pay2pay.in",
  API: "https://api.pay2pay.in"
} as const;

export const TRANSFER_MODES = ["IMPS", "NEFT", "RTGS", "UPI"] as const;

export const TRANSACTION_STATUSES = {
  SUCCESS: "SUCCESS",
  PENDING: "PENDING",
  FAILED: "FAILED",
  REVERSED: "REVERSED"
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: "pay2pay_auth_token",
  USER_DATA: "pay2pay_user_data",
  THEME_MODE: "pay2pay_theme_mode"
} as const;
