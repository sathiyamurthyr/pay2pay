// Shared Authentication & Permission SDK for Pay2Pay Platform

import { AuthUser, UserRole } from "@pay2pay/types";
import { STORAGE_KEYS } from "@pay2pay/constants";

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasRequiredRole(user: AuthUser | null, allowedRoles: UserRole[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

export function logoutUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    window.location.href = "/login";
  }
}
