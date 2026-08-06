import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// All Protected Enterprise Dashboard & Operations Routes
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/developer",
  "/settings",
  "/wallet-ledger",
  "/companies",
  "/organization",
  "/retailers",
  "/financial-config",
  "/compliance",
  "/fraud",
  "/payouts",
  "/settlements",
  "/machines",
  "/users",
  "/roles",
  "/policies",
  "/notification-dashboard",
];

export function middleware(request: NextRequest) {
  const devBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true" ||
    process.env.NODE_ENV === "development";


  // Enforce authentication cookie/token validation unless dev bypass is explicitly true
  if (!devBypass) {
    const token =
      request.cookies.get("p2p_access_token")?.value ||
      request.cookies.get("pay2pay_auth_token")?.value ||
      request.headers.get("authorization");

    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (isProtected && !token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/developer/:path*",
    "/settings/:path*",
    "/wallet-ledger/:path*",
    "/companies/:path*",
    "/organization/:path*",
    "/retailers/:path*",
    "/financial-config/:path*",
    "/compliance/:path*",
    "/fraud/:path*",
    "/payouts/:path*",
    "/settlements/:path*",
    "/machines/:path*",
    "/users/:path*",
    "/roles/:path*",
    "/policies/:path*",
    "/notification-dashboard/:path*",
  ],
};
