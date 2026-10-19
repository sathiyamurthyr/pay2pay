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

export function isJwtExpired(token?: string | null): boolean {
  if (!token) return true;
  try {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
    const parts = cleanToken.split(".");
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    const parsed = JSON.parse(jsonPayload);
    if (typeof parsed.exp === "number") {
      // 5-second buffer
      return parsed.exp * 1000 <= Date.now() + 5000;
    }
    return false;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cookieRole =
    request.cookies.get("p2p_user_role")?.value ||
    request.cookies.get("pay2pay_user_role")?.value;

  const rawRole = cookieRole || "RETAILER";

  const userRole = normalizeUserRole(rawRole);
  const portalConfig = resolvePortalRoute(userRole);

  const rawToken =
    request.cookies.get("p2p_access_token")?.value ||
    request.cookies.get("pay2pay_access_token")?.value ||
    request.cookies.get("pay2pay_auth_token")?.value ||
    request.cookies.get("p2p_sales_token")?.value ||
    request.cookies.get("pay2pay_sales_token")?.value ||
    request.cookies.get("access_token")?.value ||
    request.cookies.get("token")?.value ||
    request.headers.get("authorization");

  const hasToken = Boolean(rawToken && rawToken.trim().length > 10);
  const isExpired = hasToken ? isJwtExpired(rawToken) : false;
  const isAuthenticated = hasToken && !isExpired;

  // Helper to add security & no-cache headers to responses
  const applySecurityHeaders = (res: NextResponse) => {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");
    return res;
  };

  // Helper to wipe auth cookies when session is dead or expired
  const clearAuthCookies = (res: NextResponse) => {
    const cookieNames = [
      "p2p_access_token",
      "pay2pay_access_token",
      "pay2pay_auth_token",
      "p2p_sales_token",
      "pay2pay_sales_token",
      "access_token",
      "token",
      "p2p_user_role",
      "pay2pay_user_role",
      "p2p_session_locked",
      "p2p_session_id",
      "p2p_destination",
    ];
    cookieNames.forEach((name) => {
      res.cookies.set(name, "", { path: "/", maxAge: 0, expires: new Date(0) });
    });
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
    const res = NextResponse.next();
    if (hasToken && isExpired) {
      clearAuthCookies(res);
    }
    return applySecurityHeaders(res);
  }

  // If visiting receipt portal domain on root, rewrite directly to /r
  if (isReceiptDomain && (pathname === "/" || pathname === "")) {
    return applySecurityHeaders(NextResponse.rewrite(new URL("/r", request.url)));
  }

  // If visiting another public route (like /register or /r/token), allow
  if (isPublicRoute) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 2. Unauthenticated or session-expired user accessing ANY protected route -> Fail-closed redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL(portalConfig.login, request.url);
    if (isExpired) {
      loginUrl.searchParams.set("reason", "session_expired");
    }
    if (pathname !== "/" && pathname !== "/dashboard" && pathname !== "/retailer-dashboard") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    const res = NextResponse.redirect(loginUrl);
    if (isExpired) {
      clearAuthCookies(res);
    }
    return applySecurityHeaders(res);
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
    "/((?!api|_next/static|_next/image|branding|images|favicon.*|apple-touch-icon.*|icon.*|site\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp4)$|uploads).*)",
  ],
};
