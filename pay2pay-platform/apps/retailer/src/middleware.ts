import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_ROUTES = [
  "/login",
  "/retailer/login",
  "/distributor/login",
  "/super-distributor/login",
  "/admin/login",
];

const PORTAL_MAP: Record<string, string> = {
  RETAILER: "/retailer/dashboard",
  DISTRIBUTOR: "/distributor/dashboard",
  SUPER_DISTRIBUTOR: "/super-distributor/dashboard",
  ADMIN: "/admin/dashboard",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const userRole = request.cookies.get("p2p_user_role")?.value?.toUpperCase() || "RETAILER";
  const token =
    request.cookies.get("p2p_access_token")?.value ||
    request.cookies.get("pay2pay_auth_token")?.value ||
    request.headers.get("authorization");

  const isAuthenticated = Boolean(token);

  // 1. Deprecate generic /login -> redirect to /retailer/login or user portal
  if (pathname === "/login") {
    const target = isAuthenticated ? (PORTAL_MAP[userRole] || "/retailer/dashboard") : "/retailer/login";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 2. Deprecate generic /dashboard -> redirect to /[role]/dashboard
  if (pathname === "/dashboard") {
    const target = PORTAL_MAP[userRole] || "/retailer/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 3. Auto-redirect authenticated users trying to access ANY login page
  if (isAuthenticated && LOGIN_ROUTES.includes(pathname)) {
    const target = PORTAL_MAP[userRole] || "/retailer/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 4. Role-based access control (RBAC) cross-role protection
  if (isAuthenticated) {
    if (pathname.startsWith("/admin") && userRole !== "ADMIN" && !pathname.endsWith("/login")) {
      return NextResponse.rewrite(new URL("/403", request.url), { status: 403 });
    }
    if (pathname.startsWith("/distributor") && userRole !== "DISTRIBUTOR" && !pathname.endsWith("/login")) {
      return NextResponse.rewrite(new URL("/403", request.url), { status: 403 });
    }
    if (pathname.startsWith("/super-distributor") && userRole !== "SUPER_DISTRIBUTOR" && !pathname.endsWith("/login")) {
      return NextResponse.rewrite(new URL("/403", request.url), { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard",
    "/retailer/:path*",
    "/distributor/:path*",
    "/super-distributor/:path*",
    "/admin/:path*",
  ],
};
