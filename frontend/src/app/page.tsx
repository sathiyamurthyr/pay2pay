import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolvePortalRoute } from "@/lib/portal-resolver";

export default async function Home() {
  const cookieStore = await cookies();
  const rawRole =
    cookieStore.get("p2p_user_role")?.value ||
    cookieStore.get("pay2pay_user_role")?.value ||
    "RETAILER";

  const portal = resolvePortalRoute(rawRole);
  redirect(portal.dashboard);
}
