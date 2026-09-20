"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperDistributorLayout } from "@/components/layout/super-distributor-layout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("access_token");
      const hasCookie =
        document.cookie.includes("p2p_access_token") ||
        document.cookie.includes("pay2pay_access_token");

      if (!token && !hasCookie) {
        // Unauthenticated -> redirect to login
        router.replace("/login");
      }
    }
  }, [router]);

  return <SuperDistributorLayout>{children}</SuperDistributorLayout>;
}
