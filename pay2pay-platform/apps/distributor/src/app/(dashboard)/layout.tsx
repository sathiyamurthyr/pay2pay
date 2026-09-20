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
      const hasTokenInCookie = document.cookie.includes("p2p_access_token") || document.cookie.includes("pay2pay_access_token");
      if (!token && !hasTokenInCookie) {
        // Router replace to login if unauthenticated
        // allow mounting for initial render
      }
    }
  }, [router]);

  return <DistributorLayout>{children}</DistributorLayout>;
}
