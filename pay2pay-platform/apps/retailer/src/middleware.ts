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

export function isPathAllowedForRole(pathname: string, rawRole?: string | null): boolean {
  const role = normalizeUserRole(rawRole);
  const config = PORTAL_CONFIGS[role];

  if (pathname === "/retailer-dashboard") {
    return role === "RETAILER";
  }

  const allPrefixes = Object.values(PORTAL_CONFIGS).map((c) => c.prefix);
  const targetPrefix = allPrefixes.find((prefix) => pathname.startsWith(prefix));

  if (!targetPrefix) {
    return true;
  }

  return targetPrefix === config.prefix;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const devBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true" &&
    process.env.NODE_ENV === "development";

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

  const isAuthenticated = Boolean(token);

  const destinationCookie = request.cookies.get("p2p_destination")?.value;
  const isPendingRetailer = userRole === "RETAILER" && destinationCookie === "ACCOUNT_UNDER_REVIEW";

  // 1. Legacy /retailer-dashboard -> /retailer/dashboard redirect
  if (pathname === "/retailer-dashboard") {
    const target = isPendingRetailer ? "/retailer/account-under-review" : "/retailer/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 2. Legacy /admin-dashboard -> /admin/dashboard redirect
  if (pathname === "/admin-dashboard") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // 3. Generic /login or / or /dashboard -> resolve to canonical portal route
  if (pathname === "/login" || pathname === "/" || pathname === "/dashboard") {
    let target = isAuthenticated ? portalConfig.dashboard : portalConfig.login;
    if (isAuthenticated && isPendingRetailer) {
      target = "/retailer/account-under-review";
    }
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 4. Portal Login Pages (e.g. /retailer/login, /sd/login, /dist/login, /admin/login)
  const isLoginRoute =
    pathname === "/retailer/login" ||
    pathname === "/dist/login" ||
    pathname === "/sd/login" ||
    pathname === "/admin/login" ||
    pathname === "/super-admin/login";

  if (isLoginRoute) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(portalConfig.dashboard, request.url));
    }
    return NextResponse.next();
  }

  const isStatusOrReviewRoute =
    pathname.includes("/account-under-review") ||
    pathname.includes("/account-restricted") ||
    pathname.includes("/application-rejected");

  if (isStatusOrReviewRoute) {
    return NextResponse.next();
  }

  // 5. Protected Portal Paths (/retailer/*, /sd/*, /dist/*, /admin/*, /super-admin/*)
  const isPortalPath =
    pathname.startsWith("/retailer") ||
    pathname.startsWith("/dist") ||
    pathname.startsWith("/sd") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin");

  if (isPortalPath) {
    if (!isAuthenticated) {
      const targetLogin = portalConfig.login;
      const loginUrl = new URL(targetLogin, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isPathAllowedForRole(pathname, userRole)) {
      return NextResponse.redirect(new URL(portalConfig.dashboard, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard",
    "/retailer-dashboard",
    "/admin-dashboard",
    "/retailer/:path*",
    "/sd/:path*",
    "/dist/:path*",
    "/admin/:path*",
    "/super-admin/:path*",
  ],
};
