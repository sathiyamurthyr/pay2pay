export type UserPortalRole = "RETAILER" | "DIST" | "SD" | "ADMIN" | "SUPER_ADMIN";

export interface PortalConfig {
  portal: UserPortalRole;
  prefix: string;
  dashboard: string;
  login: string;
}

export const PORTAL_CONFIGS: Record<UserPortalRole, PortalConfig> = {
  RETAILER: {
    portal: "RETAILER",
    prefix: "/retailer",
    dashboard: "/retailer/dashboard",
    login: "/retailer/login",
  },
  DIST: {
    portal: "DIST",
    prefix: "/dist",
    dashboard: "/dist/dashboard",
    login: "/dist/login",
  },
  SD: {
    portal: "SD",
    prefix: "/sd",
    dashboard: "/sd/dashboard",
    login: "/sd/login",
  },
  ADMIN: {
    portal: "RETAILER",
    prefix: "/retailer",
    dashboard: "/retailer/dashboard",
    login: "/retailer/login",
  },
  SUPER_ADMIN: {
    portal: "RETAILER",
    prefix: "/retailer",
    dashboard: "/retailer/dashboard",
    login: "/retailer/login",
  },
};

/**
 * Normalizes raw role string into authoritative UserPortalRole for the Retailer App.
 * In apps/retailer, any admin role safely normalizes to RETAILER to prevent routing to non-existent admin routes.
 */
export function normalizeUserRole(rawRole?: string | null): UserPortalRole {
  if (!rawRole) return "RETAILER";
  const upper = rawRole.trim().toUpperCase();

  // In the Retailer application, Admin/Super-Admin roles from cross-domain cookies must not hijack routing
  if (upper === "SUPER_ADMIN" || upper === "SUPERADMIN" || upper === "SUPER-ADMIN" || upper === "ADMIN") {
    return "RETAILER";
  }
  if (upper === "SD" || upper === "SUPER_DISTRIBUTOR" || upper === "SUPER DISTRIBUTOR") {
    return "SD";
  }
  if (upper === "DIST" || upper === "DISTRIBUTOR") {
    return "DIST";
  }
  return "RETAILER";
}

/**
 * Authoritative portal route resolver based on authenticated user role.
 * In apps/retailer, always falls back safely to RETAILER portal routes.
 */
export function resolvePortalRoute(rawRole?: string | null): PortalConfig {
  const role = normalizeUserRole(rawRole);
  return PORTAL_CONFIGS[role] || PORTAL_CONFIGS.RETAILER;
}

/**
 * Checks if a requested path is allowed for a given portal role
 */
export function isPathAllowedForRole(pathname: string, rawRole?: string | null): boolean {
  const role = normalizeUserRole(rawRole);
  const config = PORTAL_CONFIGS[role] || PORTAL_CONFIGS.RETAILER;

  // Legacy retailer-dashboard redirect is handled separately
  if (pathname === "/retailer-dashboard") {
    return true;
  }

  // Check if pathname starts with any portal prefix
  const allPrefixes = ["/retailer", "/dist", "/sd"];
  const targetPrefix = allPrefixes.find((prefix) => pathname.startsWith(prefix));

  if (!targetPrefix) {
    // Non-portal public routes (e.g. static assets, public pages)
    return true;
  }

  // If path matches a portal prefix, it must match the user's actual portal prefix
  return targetPrefix === config.prefix;
}
