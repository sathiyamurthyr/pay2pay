"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { RetailerLayout } from "@/components/layout/retailer-layout";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Authentication & Approval check
  useEffect(() => {
    if (DEV_BYPASS || !mounted || authLoading) return;
    if (!user) {
      router.replace("/retailer/login");
      return;
    }

    // Admins have full access
    const isStaffOrAdmin =
      user.roles?.includes("SUPER_ADMIN") ||
      user.roles?.includes("PLATFORM_ADMIN") ||
      user.roles?.includes("OPERATIONS_ADMIN");
    if (isStaffOrAdmin) return;

    // Check Retailer Approval Status
    let isApproved = false;
    let statusStr = "";
    if (typeof window !== "undefined") {
      const storedStatus = localStorage.getItem("p2p_retailer_approval_status") || localStorage.getItem("pay2pay_onboarding_status") || "";
      const accountAccess = localStorage.getItem("p2p_account_access") || "";
      statusStr = storedStatus.toUpperCase();

      if (storedStatus === "APPROVED" || storedStatus === "ACTIVE" || accountAccess === "ALLOWED") {
        isApproved = true;
      }
    }

    // If not approved, enforce fail-closed redirect
    if (!isApproved) {
      if (statusStr === "REJECTED") {
        router.replace("/application-rejected");
      } else if (statusStr === "RESTRICTED" || statusStr === "HOLD" || statusStr === "BLOCKED") {
        router.replace("/retailer/account-restricted");
      } else {
        router.replace("/retailer/account-under-review");
      }
    }
  }, [user, authLoading, router, mounted]);

  return <RetailerLayout>{children}</RetailerLayout>;
}
