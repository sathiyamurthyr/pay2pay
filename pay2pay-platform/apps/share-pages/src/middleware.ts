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
  if (upper === "ADMIN") {
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rawRole =
    request.cookies.get("p2p_user_role")?.value ||
    request.cookies.get("pay2pay_user_role")?.value ||
    "RETAILER";

  const userRole = normalizeUserRole(rawRole);
  const portalConfig = resolvePortalRoute(userRole);

  const token =
    request.cookies.get("p2p_access_token")?.value ||
    request.cookies.get("pay2pay_access_token")?.value ||
    request.cookies.get("pay2pay_auth_token")?.value ||
    request.headers.get("authorization");

  const isAuthenticated = Boolean(token && token.trim().length > 10);

  // Helper to add security & no-cache headers to responses
  const applySecurityHeaders = (res: NextResponse) => {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");
    return res;
  };

  // 1. Explicit Public Routes (Always accessible without authentication)
  const host = request.headers.get("host") || "";
  const isReceiptDomain = host.includes("receipt.pay2pay.in");
  const isReceiptRoute =
    isReceiptDomain ||
    pathname.startsWith("/r/") ||
    pathname === "/r" ||
    pathname.startsWith("/receipt");

  const isLoginRoute =
    pathname === "/retailer/login" ||
    pathname === "/login" ||
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

  // If user is already authenticated and visits a login page, redirect to active dashboard
  if (isLoginRoute) {
    if (isAuthenticated) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(portalConfig.dashboard, request.url))
      );
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // If visiting another public route (like /register), allow
  if (isPublicRoute) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 2. Unauthenticated user accessing ANY protected route -> Fail-closed redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL(portalConfig.login, request.url);
    if (pathname !== "/" && pathname !== "/dashboard" && pathname !== "/retailer-dashboard") {
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

  // 4. Role-based prefix boundary checks
  const allPrefixes = Object.values(PORTAL_CONFIGS).map((c) => c.prefix);
  const targetPrefix = allPrefixes.find((prefix) => pathname.startsWith(prefix));

  if (targetPrefix && targetPrefix !== portalConfig.prefix) {
    // If accessing another portal's prefixed routes (e.g. Retailer trying /admin/*), redirect to own dashboard
    return applySecurityHeaders(
      NextResponse.redirect(new URL(portalConfig.dashboard, request.url))
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Universal Matcher: Protect ALL routes except static files, images, icons, and API routes.
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|favicon\\.png|apple-touch-icon\\.png|icon\\.png|uploads).*)",
  ],
};
