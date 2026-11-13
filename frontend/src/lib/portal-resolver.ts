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
    portal: "ADMIN",
    prefix: "/admin",
    dashboard: "/admin/dashboard",
    login: "/admin/login",
  },
  SUPER_ADMIN: {
    portal: "SUPER_ADMIN",
    prefix: "/super-admin",
    dashboard: "/super-admin/dashboard",
    login: "/super-admin/login",
  },
};

export function normalizeUserType(
  userTypeRefId?: number | string | null,
  rawRole?: string | null
): UserPortalRole {
  if (userTypeRefId !== undefined && userTypeRefId !== null && String(userTypeRefId).trim() !== "") {
    const numId = Number(userTypeRefId);
    if (numId === 1) return "ADMIN";
    if (numId === 2) return "RETAILER";
    if (numId === 3) return "DIST";
    if (numId === 4) return "SD";
  }
  return normalizeUserRole(rawRole);
}

/**
 * Normalizes raw role string into authoritative UserPortalRole
 */
export function normalizeUserRole(rawRole?: string | null): UserPortalRole {
  if (!rawRole) return "RETAILER";
  const upper = rawRole.trim().toUpperCase();

  if (upper === "SUPER_ADMIN" || upper === "SUPERADMIN" || upper === "SUPER-ADMIN") {
    return "SUPER_ADMIN";
  }
  if (upper === "ADMIN" || upper === "PLATFORM_ADMIN" || upper === "OPERATIONS_ADMIN") {
    return "ADMIN";
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
 * Authoritative portal route resolver based on authenticated user role or user_type_ref_id
 */
export function resolvePortalRoute(
  rawRoleOrId?: string | number | null,
  fallbackRole?: string | null
): PortalConfig {
  const role =
    typeof rawRoleOrId === "number" || (typeof rawRoleOrId === "string" && !isNaN(Number(rawRoleOrId)) && rawRoleOrId.trim() !== "")
      ? normalizeUserType(rawRoleOrId, fallbackRole)
      : normalizeUserRole(rawRoleOrId);
  return PORTAL_CONFIGS[role];
}

/**
 * Checks if a requested path is allowed for a given portal role
 */
export function isPathAllowedForRole(pathname: string, rawRole?: string | null): boolean {
  const role = normalizeUserRole(rawRole);
  const config = PORTAL_CONFIGS[role];

  // Legacy retailer-dashboard redirect is handled separately
  if (pathname === "/retailer-dashboard") {
    return role === "RETAILER";
  }

  // Check if pathname starts with any portal prefix
  const allPrefixes = Object.values(PORTAL_CONFIGS).map((c) => c.prefix);
  const targetPrefix = allPrefixes.find((prefix) => pathname.startsWith(prefix));

  if (!targetPrefix) {
    // Non-portal public routes (e.g. static assets, public pages)
    return true;
  }

  // If path matches a portal prefix, it must match the user's actual portal prefix
  return targetPrefix === config.prefix;
}
