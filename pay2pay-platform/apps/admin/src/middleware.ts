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
  SUPER_ADMIN: {
    portal: "SUPER_ADMIN",
    prefix: "/super-admin",
    dashboard: "/dashboard",
    login: "/login",
  },
  ADMIN: {
    portal: "ADMIN",
    prefix: "/admin",
    dashboard: "/dashboard",
    login: "/login",
  },
  SD: {
    portal: "SD",
    prefix: "/sd",
    dashboard: "/dashboard",
    login: "/login",
  },
  DIST: {
    portal: "DIST",
    prefix: "/dist",
    dashboard: "/dashboard",
    login: "/login",
  },
  RETAILER: {
    portal: "RETAILER",
    prefix: "/retailer",
    dashboard: "/dashboard",
    login: "/login",
  },
};

export function normalizeUserRole(rawRole?: string | null): UserPortalRole {
  if (!rawRole) return "ADMIN";
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
  return "ADMIN";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Immediately bypass all static files, assets, manifests, icons, images, and API routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/branding") ||
    pathname.startsWith("/images") ||
    pathname === "/site.webmanifest" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const rawRole =
    request.cookies.get("p2p_user_role")?.value ||
    request.cookies.get("pay2pay_user_role")?.value ||
    "ADMIN";

  const userRole = normalizeUserRole(rawRole);
  const portalConfig = PORTAL_CONFIGS[userRole] || PORTAL_CONFIGS.ADMIN;

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

  // Redirect legacy login aliases to /login
  if (
    pathname === "/retailer/login" ||
    pathname === "/dist/login" ||
    pathname === "/sd/login" ||
    pathname === "/admin/login" ||
    pathname === "/super-admin/login"
  ) {
    const canonicalLogin = new URL("/login", request.url);
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (redirectParam) {
      canonicalLogin.searchParams.set("redirect", redirectParam);
    }
    return applySecurityHeaders(NextResponse.redirect(canonicalLogin));
  }

  const isLoginRoute = pathname === "/login";

  const isPublicRoute =
    isLoginRoute ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/design-system") ||
    pathname === "/403";

  // If user is already authenticated and visits the login page, redirect to active dashboard
  if (isLoginRoute) {
    if (isAuthenticated) {
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      if (redirectParam && redirectParam.startsWith("/") && redirectParam !== "/login") {
        return applySecurityHeaders(
          NextResponse.redirect(new URL(redirectParam, request.url))
        );
      }
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

  // Unauthenticated user accessing ANY protected route -> Fail-closed redirect to /login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/" && pathname !== "/dashboard" && pathname !== "/retailer-dashboard") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // Authenticated Root/Dashboard aliases -> redirect to canonical portal dashboard
  if (pathname === "/" || pathname === "/retailer-dashboard" || pathname === "/admin-dashboard") {
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
