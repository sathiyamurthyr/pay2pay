import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export function resolvePortalRoute(rawRole?: string | null): PortalConfig {
  const role = normalizeUserRole(rawRole);
  return PORTAL_CONFIGS[role];
}

/**
 * Safely decodes JWT claims without external dependencies in Edge runtime
 */
function getJwtClaims(token?: string | null): Record<string, any> | null {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const portMatch = host.match(/:(\d+)$/);
  const incomingPort = portMatch ? portMatch[1] : request.nextUrl.port || "";

  // ── Dedicated Port Portal Enforcement ──
  // Port 4001: Retailer Portal
  // Port 4002: Admin Portal
  // Port 4003: Super Admin Portal
  let forcedPortal: PortalConfig | null = null;
  if (incomingPort === "4001") {
    forcedPortal = PORTAL_CONFIGS.RETAILER;
  } else if (incomingPort === "4002") {
    forcedPortal = PORTAL_CONFIGS.ADMIN;
  } else if (incomingPort === "4003") {
    forcedPortal = PORTAL_CONFIGS.SUPER_ADMIN;
  }

  // ── Logout Route Handler: Clears ALL session cookies & redirects to appropriate login ──
  if (pathname === "/logout") {
    const defaultLogin = forcedPortal ? forcedPortal.login : "/login";
    const res = NextResponse.redirect(new URL(`${defaultLogin}?logout=true`, request.url));
    const allCookieNames = [
      "p2p_token", "pay2pay_token", "p2p_access_token", "pay2pay_access_token", "pay2pay_auth_token",
      "p2p_sales_token", "pay2pay_sales_token", "p2p_retailer_token", "p2p_dist_token", "p2p_sd_token", "p2p_admin_token", "p2p_super_admin_token",
      "p2p_user_role", "pay2pay_user_role", "p2p_user_type_ref_id", "pay2pay_user_type_ref_id",
      "p2p_user_role_4001", "p2p_user_role_4002", "p2p_user_role_4003",
      "p2p_active_role", "p2p_active_destination", "p2p_destination", "p2p_account_access",
      "p2p_active_retailer_id", "p2p_retailer_code", "p2p_retailer_approval_status",
      "p2p_active_distributor_id", "p2p_distributor_code", "p2p_distributor_ref_id",
      "p2p_active_super_distributor_id", "p2p_super_distributor_code", "p2p_super_distributor_ref_id",
      "p2p_session_locked", "p2p_session_locked_at", "p2p_session_last_active", "p2p_session_start_time", "p2p_session_id",
      "token", "access_token"
    ];
    allCookieNames.forEach((name) => {
      res.cookies.set(name, "", { path: "/", maxAge: 0, expires: new Date(0), sameSite: "lax" });
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    return res;
  }

  // ── Port-Aware Token and Role Resolution ──
  let token: string | undefined;
  let resolvedRole: UserPortalRole = "RETAILER";
  let isAuthenticated = false;

  if (forcedPortal) {
    if (incomingPort === "4001") {
      // Retailer portal preference
      token = request.cookies.get("p2p_retailer_token")?.value;
      if (!token) {
        const candidate =
          request.cookies.get("p2p_token")?.value ||
          request.cookies.get("p2p_access_token")?.value ||
          request.cookies.get("pay2pay_access_token")?.value ||
          request.cookies.get("access_token")?.value;
        if (candidate) {
          const claims = getJwtClaims(candidate);
          const cRole = normalizeUserRole(Array.isArray(claims?.roles) ? claims.roles[0] : claims?.role);
          const cType = Number(claims?.user_type_ref_id);
          // Only accept candidate if it is a RETAILER or general user (not Admin/SD/Dist)
          if (cRole === "RETAILER" || cType === 2) {
            token = candidate;
          }
        }
      }
      resolvedRole = "RETAILER";
      isAuthenticated = Boolean(token && token.trim().length > 10);
    } else if (incomingPort === "4002") {
      // Admin portal preference
      token = request.cookies.get("p2p_admin_token")?.value;
      if (!token) {
        const candidate =
          request.cookies.get("p2p_token")?.value ||
          request.cookies.get("p2p_access_token")?.value ||
          request.cookies.get("pay2pay_access_token")?.value ||
          request.cookies.get("access_token")?.value;
        if (candidate) {
          const claims = getJwtClaims(candidate);
          const cRole = normalizeUserRole(Array.isArray(claims?.roles) ? claims.roles[0] : claims?.role);
          const cType = Number(claims?.user_type_ref_id);
          if (cRole === "ADMIN" || cRole === "SUPER_ADMIN" || cType === 1) {
            token = candidate;
          }
        }
      }
      const claims = getJwtClaims(token);
      const cRole = normalizeUserRole(Array.isArray(claims?.roles) ? claims.roles[0] : claims?.role);
      resolvedRole = cRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
      isAuthenticated = Boolean(token && token.trim().length > 10);
    } else if (incomingPort === "4003") {
      // Super Admin portal preference
      token = request.cookies.get("p2p_super_admin_token")?.value;
      if (!token) {
        const candidate =
          request.cookies.get("p2p_token")?.value ||
          request.cookies.get("p2p_access_token")?.value ||
          request.cookies.get("pay2pay_access_token")?.value ||
          request.cookies.get("access_token")?.value;
        if (candidate) {
          const claims = getJwtClaims(candidate);
          const cRole = normalizeUserRole(Array.isArray(claims?.roles) ? claims.roles[0] : claims?.role);
          const cType = Number(claims?.user_type_ref_id);
          if (cRole === "SUPER_ADMIN" || (cType === 1 && cRole === "SUPER_ADMIN")) {
            token = candidate;
          }
        }
      }
      resolvedRole = "SUPER_ADMIN";
      isAuthenticated = Boolean(token && token.trim().length > 10);
    }
  } else {
    // Generic fallback (e.g. port 3000 or production domain without port)
    token =
      request.cookies.get("p2p_token")?.value ||
      request.cookies.get("pay2pay_token")?.value ||
      request.cookies.get("p2p_access_token")?.value ||
      request.cookies.get("pay2pay_access_token")?.value ||
      request.cookies.get("pay2pay_auth_token")?.value ||
      request.cookies.get("p2p_sales_token")?.value ||
      request.cookies.get("pay2pay_sales_token")?.value ||
      request.cookies.get("access_token")?.value ||
      request.cookies.get("token")?.value ||
      request.headers.get("authorization");

    isAuthenticated = Boolean(token && token.trim().length > 10);

    const jwtClaims = getJwtClaims(token);
    const jwtUserType = jwtClaims?.user_type_ref_id;
    const cookieUserType =
      request.cookies.get("p2p_user_type_ref_id")?.value ||
      request.cookies.get("pay2pay_user_type_ref_id")?.value;
    const rawUserType = jwtUserType !== undefined ? jwtUserType : cookieUserType;
    const jwtRole = Array.isArray(jwtClaims?.roles) ? jwtClaims.roles[0] : jwtClaims?.role;
    const cookieRole =
      request.cookies.get("p2p_user_role")?.value ||
      request.cookies.get("pay2pay_user_role")?.value;

    if (rawUserType !== undefined && rawUserType !== null && String(rawUserType).trim() !== "") {
      const numId = Number(rawUserType);
      if (numId === 1) {
        const explicitRole = normalizeUserRole(jwtRole || cookieRole);
        resolvedRole = explicitRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
      } else if (numId === 2) resolvedRole = "RETAILER";
      else if (numId === 3) resolvedRole = "DIST";
      else if (numId === 4) resolvedRole = "SD";
      else resolvedRole = normalizeUserRole(jwtRole || cookieRole);
    } else {
      resolvedRole = normalizeUserRole(jwtRole || cookieRole);
    }
  }

  const portalConfig = forcedPortal || resolvePortalRoute(resolvedRole);

  // Helper to add security & no-cache headers to responses
  const applySecurityHeaders = (res: NextResponse) => {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");

    // Sync authoritative role cookies if authenticated and not in forced portal mode
    if (isAuthenticated && !forcedPortal) {
      res.cookies.set("p2p_user_role", resolvedRole, { path: "/", maxAge: 2592000, sameSite: "lax" });
      res.cookies.set("pay2pay_user_role", resolvedRole, { path: "/", maxAge: 2592000, sameSite: "lax" });
    }
    return res;
  };

  // 0. Static media & branding files (Always allow direct fetch)
  const isStaticOrMedia =
    pathname.startsWith("/branding") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/uploads") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|webmanifest|mp4)$/i);

  if (isStaticOrMedia) {
    return NextResponse.next();
  }

  // 1. Explicit Public Routes (Always accessible without authentication)
  const isReceiptDomain = host.includes("receipt.near4you.store");
  const isReceiptRoute =
    isReceiptDomain ||
    pathname.startsWith("/r/") ||
    pathname === "/r" ||
    pathname.startsWith("/receipt");

  const isLoginRoute =
    pathname === "/login" ||
    pathname === "/retailer/login" ||
    pathname === "/dist/login" ||
    pathname === "/sd/login" ||
    pathname === "/admin/login" ||
    pathname === "/super-admin/login";

  const isPublicRoute =
    isReceiptRoute ||
    isLoginRoute ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/design-system") ||
    pathname.startsWith("/api/public") ||
    pathname === "/403";

  // Handle logout parameter on login page: /login?logout=true or /login?reason=...
  const isLogoutQuery = request.nextUrl.searchParams.has("logout") || request.nextUrl.searchParams.get("reason") === "session_terminated";
  if (isLoginRoute && isLogoutQuery) {
    const res = NextResponse.next();
    const allCookieNames = [
      "p2p_token", "pay2pay_token", "p2p_access_token", "pay2pay_access_token", "pay2pay_auth_token",
      "p2p_sales_token", "pay2pay_sales_token", "p2p_retailer_token", "p2p_dist_token", "p2p_sd_token", "p2p_admin_token", "p2p_super_admin_token",
      "p2p_user_role", "pay2pay_user_role", "p2p_user_type_ref_id", "pay2pay_user_type_ref_id",
      "p2p_user_role_4001", "p2p_user_role_4002", "p2p_user_role_4003",
      "p2p_active_role", "p2p_active_destination", "p2p_destination", "p2p_account_access",
      "p2p_active_retailer_id", "p2p_retailer_code", "p2p_retailer_approval_status",
      "p2p_active_distributor_id", "p2p_distributor_code", "p2p_distributor_ref_id",
      "p2p_active_super_distributor_id", "p2p_super_distributor_code", "p2p_super_distributor_ref_id",
      "p2p_session_locked", "p2p_session_locked_at", "p2p_session_last_active", "p2p_session_start_time", "p2p_session_id",
      "token", "access_token"
    ];
    allCookieNames.forEach((name) => {
      res.cookies.set(name, "", { path: "/", maxAge: 0, expires: new Date(0), sameSite: "lax" });
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    return res;
  }

  // ── Port Enforced Login Redirection ──
  if (isLoginRoute) {
    if (isAuthenticated) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(portalConfig.dashboard, request.url))
      );
    }
    // If unauthenticated and on a dedicated port:
    if (forcedPortal) {
      // If user navigated to generic /login or wrong portal login, direct to this port's login
      if (pathname !== forcedPortal.login) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL(forcedPortal.login, request.url))
        );
      }
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // If visiting receipt portal domain on root, rewrite directly to /r
  if (isReceiptDomain && (pathname === "/" || pathname === "")) {
    return applySecurityHeaders(NextResponse.rewrite(new URL("/r", request.url)));
  }

  // If visiting another public route (like /register or /r/token), allow
  if (isPublicRoute) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 2. Unauthenticated user accessing ANY protected route -> Fail-closed redirect
  if (!isAuthenticated) {
    const loginTarget = forcedPortal ? forcedPortal.login : "/login";
    const loginUrl = new URL(loginTarget, request.url);
    if (pathname !== "/" && pathname !== "/dashboard" && pathname !== "/retailer-dashboard" && pathname !== "/admin-dashboard") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // 3. Authenticated Root/Dashboard aliases -> redirect to canonical portal dashboard
  if (pathname === "/" || pathname === "/dashboard" || pathname === "/retailer-dashboard") {
    return applySecurityHeaders(
      NextResponse.redirect(new URL(portalConfig.dashboard, request.url))
    );
  }

  if (pathname === "/admin-dashboard") {
    return applySecurityHeaders(
      NextResponse.redirect(new URL(PORTAL_CONFIGS.ADMIN.dashboard, request.url))
    );
  }

  // 4. Role-based and Port-based prefix boundary checks
  const allPrefixes = Object.values(PORTAL_CONFIGS).map((c) => c.prefix);
  const targetPrefix = allPrefixes.find((prefix) => pathname.startsWith(prefix));

  if (forcedPortal) {
    // Port 4001: Retailer only
    if (incomingPort === "4001" && targetPrefix && targetPrefix !== "/retailer") {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(PORTAL_CONFIGS.RETAILER.dashboard, request.url))
      );
    }
    // Port 4002: Admin only
    if (incomingPort === "4002" && targetPrefix && targetPrefix !== "/admin") {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(PORTAL_CONFIGS.ADMIN.dashboard, request.url))
      );
    }
    // Port 4003: Super Admin (can access /super-admin and /admin)
    if (incomingPort === "4003" && targetPrefix && targetPrefix !== "/super-admin" && targetPrefix !== "/admin") {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(PORTAL_CONFIGS.SUPER_ADMIN.dashboard, request.url))
      );
    }
  } else {
    // Standard role prefix boundary check
    if (targetPrefix && targetPrefix !== portalConfig.prefix) {
      if (resolvedRole === "SUPER_ADMIN" && targetPrefix === "/admin") {
        return applySecurityHeaders(NextResponse.next());
      }
      return applySecurityHeaders(
        NextResponse.redirect(new URL(portalConfig.dashboard, request.url))
      );
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Universal Matcher: Protect ALL routes except Next.js internals, static files, images, icons, and API routes.
     */
    "/((?!api|_next|branding|images|favicon.*|apple-touch-icon.*|icon.*|site\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp4)$|uploads).*)",
  ],
};
