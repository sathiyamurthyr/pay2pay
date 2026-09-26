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
    dashboard: "/dashboard",
    login: "/login",
  },
  DIST: {
    portal: "DIST",
    prefix: "",
    dashboard: "/dashboard",
    login: "/login",
  },
  SD: {
    portal: "SD",
    prefix: "/sd",
    dashboard: "/dashboard",
    login: "/login",
  },
  ADMIN: {
    portal: "ADMIN",
    prefix: "/admin",
    dashboard: "/admin/dashboard",
    login: "/login",
  },
  SUPER_ADMIN: {
    portal: "SUPER_ADMIN",
    prefix: "/super-admin",
    dashboard: "/super-admin/dashboard",
    login: "/login",
  },
};

export function normalizeUserRole(rawRole?: string | null): UserPortalRole {
  if (!rawRole) return "DIST";
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
  return "DIST";
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
    "DIST";

  const userRole = normalizeUserRole(rawRole);
  const portalConfig = resolvePortalRoute(userRole);

  const token =
    request.cookies.get("p2p_access_token")?.value ||
    request.cookies.get("pay2pay_access_token")?.value ||
    request.cookies.get("pay2pay_auth_token")?.value ||
    request.cookies.get("p2p_sales_token")?.value ||
    request.cookies.get("pay2pay_sales_token")?.value ||
    request.cookies.get("access_token")?.value ||
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
  const isLoginRoute =
    pathname === "/retailer/login" ||
    pathname === "/login" ||
    pathname === "/dist/login";

  const isPublicRoute =
    isLoginRoute ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/account-under-review") ||
    pathname.startsWith("/account-restricted") ||
    pathname.startsWith("/application-rejected") ||
    pathname.startsWith("/design-system") ||
    pathname === "/403";

  // If user is already authenticated and visits a login page, redirect to active dashboard
  if (isLoginRoute) {
    if (isAuthenticated) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/dashboard", request.url))
      );
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // If visiting another public route, allow
  if (isPublicRoute) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 2. Unauthenticated user accessing protected route -> Fail-closed redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/" && pathname !== "/dashboard") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // 3. Authenticated Root -> redirect to canonical portal dashboard
  if (pathname === "/") {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", request.url))
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
