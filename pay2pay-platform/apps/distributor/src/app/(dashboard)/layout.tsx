"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DistributorLayout } from "@/components/layout/distributor-layout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Verify token presence
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("access_token");
      const cookies = document.cookie;
      const hasTokenInCookie =
        cookies.includes("p2p_access_token=") ||
        cookies.includes("pay2pay_access_token=") ||
        cookies.includes("pay2pay_auth_token=") ||
        cookies.includes("access_token=");
      const role =
        localStorage.getItem("pay2pay_user_role") ||
        localStorage.getItem("p2p_user_role");
      
      if ((!token && !hasTokenInCookie) || role === "RETAILER") {
        router.replace("/login");
      }
    }
  }, [router]);

  return <DistributorLayout>{children}</DistributorLayout>;
}
