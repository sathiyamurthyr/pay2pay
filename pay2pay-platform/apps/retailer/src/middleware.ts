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

export function resolvePortalRoute(rawRole?: string | null): PortalConfig {
  const role = normalizeUserRole(rawRole);
  return PORTAL_CONFIGS[role] || PORTAL_CONFIGS.RETAILER;
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

    // Cleanse cross-domain admin role cookie if detected on the retailer app
    const upperRaw = (rawRole || "").trim().toUpperCase();
    if (upperRaw === "SUPER_ADMIN" || upperRaw === "ADMIN" || upperRaw === "SUPERADMIN" || upperRaw === "SUPER-ADMIN") {
      res.cookies.set("p2p_user_role", "RETAILER", { path: "/" });
      res.cookies.set("pay2pay_user_role", "RETAILER", { path: "/" });
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
    pathname === "/sd/login";

  const isPublicRoute =
    isReceiptRoute ||
    isLoginRoute ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/design-system") ||
    pathname.startsWith("/api/public") ||
    pathname === "/403";

  // If user visits a login route:
  if (isLoginRoute) {
    // 1a. Explicit Retailer Login: allow viewing login page unless already logged in AS RETAILER
    if (pathname === "/retailer/login") {
      if (isAuthenticated && userRole === "RETAILER" && !request.nextUrl.searchParams.has("logout")) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL("/retailer/dashboard", request.url))
        );
      }
      // Unauthenticated, or has foreign/admin cookie: show retailer login page cleanly!
      return applySecurityHeaders(NextResponse.next());
    }

    // 1b. Generic /login: redirect directly to /retailer/login (or dashboard if already retailer)
    if (pathname === "/login") {
      if (isAuthenticated && userRole === "RETAILER" && !request.nextUrl.searchParams.has("logout")) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL("/retailer/dashboard", request.url))
        );
      }
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/retailer/login", request.url))
      );
    }

    // 1c. Other portal logins (e.g. /sd/login, /dist/login)
    if (isAuthenticated && portalConfig.login === pathname && !request.nextUrl.searchParams.has("logout")) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(portalConfig.dashboard, request.url))
      );
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

  // 2. Unauthenticated user accessing ANY protected route -> Fail-closed redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL(portalConfig.login, request.url);
    if (pathname !== "/" && pathname !== "/dashboard" && pathname !== "/retailer-dashboard") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // 3. Authenticated Root/Dashboard aliases -> redirect to canonical portal dashboard
  if (pathname === "/" || pathname === "/dashboard" || pathname === "/retailer-dashboard" || pathname === "/admin-dashboard") {
    return applySecurityHeaders(
      NextResponse.redirect(new URL(portalConfig.dashboard, request.url))
    );
  }

  // 4. Role-based prefix boundary checks
  const allPrefixes = ["/retailer", "/dist", "/sd"];
  const targetPrefix = allPrefixes.find((prefix) => pathname.startsWith(prefix));

  if (targetPrefix && targetPrefix !== portalConfig.prefix) {
    // If accessing another portal's prefixed routes, redirect to own dashboard
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
