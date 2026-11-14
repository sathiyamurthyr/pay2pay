import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { resolvePortalRoute } from "@/lib/portal-resolver";

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const portMatch = host.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : "";

  if (port === "4001") {
    redirect("/retailer/dashboard");
  } else if (port === "4002") {
    redirect("/admin/dashboard");
  } else if (port === "4003") {
    redirect("/super-admin/dashboard");
  }

  const cookieStore = await cookies();
  const rawRole =
    cookieStore.get("p2p_user_role")?.value ||
    cookieStore.get("pay2pay_user_role")?.value ||
    "RETAILER";

  const portal = resolvePortalRoute(rawRole);
  redirect(portal.dashboard);
}
