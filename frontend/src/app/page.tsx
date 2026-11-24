import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { resolvePortalRoute } from "@/lib/portal-resolver";

function isTokenValid(token?: string | null): boolean {
  if (!token || typeof token !== "string" || token.trim().length < 10) return false;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf8");
    const claims = JSON.parse(jsonStr);
    if (claims.exp && typeof claims.exp === "number") {
      if (claims.exp * 1000 <= Date.now() - 5000) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const hostLower = host.toLowerCase();
  const portMatch = host.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : "";

  const isAdminHost = port === "4002" || hostLower.startsWith("admin.") || hostLower.includes("admin.smspay.store") || hostLower.includes("admin.near4you.store") || hostLower.includes("admin.pay2pay.in");
  const isSuperAdminHost = port === "4003" || hostLower.startsWith("super-admin.") || hostLower.startsWith("superadmin.");
  const isRetailerHost = port === "4001" || hostLower.startsWith("retailer.");

  const cookieStore = await cookies();
  const rawToken =
    cookieStore.get("p2p_access_token")?.value ||
    cookieStore.get("pay2pay_access_token")?.value ||
    cookieStore.get("pay2pay_auth_token")?.value ||
    cookieStore.get("p2p_admin_token")?.value ||
    cookieStore.get("p2p_super_admin_token")?.value ||
    cookieStore.get("p2p_retailer_token")?.value ||
    cookieStore.get("p2p_token")?.value ||
    cookieStore.get("pay2pay_token")?.value ||
    cookieStore.get("access_token")?.value ||
    cookieStore.get("token")?.value;

  const hasToken = isTokenValid(rawToken);

  if (isAdminHost) {
    if (hasToken) {
      redirect("/admin/dashboard");
    } else {
      redirect("/admin/login");
    }
  }

  if (isSuperAdminHost) {
    if (hasToken) {
      redirect("/super-admin/dashboard");
    } else {
      redirect("/super-admin/login");
    }
  }

  if (isRetailerHost) {
    if (hasToken) {
      redirect("/retailer/dashboard");
    } else {
      redirect("/retailer/login");
    }
  }

  const rawRole =
    cookieStore.get("p2p_user_role")?.value ||
    cookieStore.get("pay2pay_user_role")?.value ||
    "RETAILER";

  const portal = resolvePortalRoute(rawRole);
  if (hasToken) {
    redirect(portal.dashboard);
  } else {
    redirect(portal.login);
  }
}
