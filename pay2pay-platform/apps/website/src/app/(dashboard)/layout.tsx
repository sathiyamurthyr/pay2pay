"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { RetailerLayout } from "@/components/layout/retailer-layout";

const DEV_BYPASS = false;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Authentication check
  useEffect(() => {
    if (DEV_BYPASS || !mounted) return;
    if (!authLoading && !user) {
      if (typeof document !== "undefined") {
        const cookies = document.cookie || "";
        const hasCookie =
          cookies.includes("p2p_access_token=") ||
          cookies.includes("pay2pay_access_token=") ||
          cookies.includes("pay2pay_auth_token=") ||
          cookies.includes("p2p_sales_token=") ||
          cookies.includes("pay2pay_sales_token=") ||
          cookies.includes("access_token=") ||
          cookies.includes("token=");
        const hasLs =
          Boolean(localStorage.getItem("p2p_access_token") ||
          localStorage.getItem("pay2pay_access_token") ||
          localStorage.getItem("pay2pay_auth_token") ||
          localStorage.getItem("p2p_sales_token") ||
          localStorage.getItem("access_token") ||
          localStorage.getItem("token"));
        if (hasCookie || hasLs) {
          return;
        }
      }
      router.replace("/retailer/login");
    }
  }, [user, authLoading, router, mounted]);

  return <RetailerLayout>{children}</RetailerLayout>;
}
