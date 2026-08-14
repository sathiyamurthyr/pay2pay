import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function GenericLoginPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("p2p_user_role")?.value?.toUpperCase();

  if (role === "DIST") {
    redirect("/dist/login");
  }

  redirect("/sd/login");
}
