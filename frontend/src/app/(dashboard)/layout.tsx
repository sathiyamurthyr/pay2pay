"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { RetailerLayout } from "@/components/layout/retailer-layout";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

const DEV_BYPASS = false;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Authentication & Approval check
  useEffect(() => {
    if (DEV_BYPASS || !mounted || authLoading) return;
    if (!user) {
      // Check if session token exists in cookie or localStorage before kicking user out
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
          // Session is recovering or hydrating, do NOT redirect to login
          return;
        }
      }
      const loginTarget = pathname?.startsWith("/super-admin")
        ? "/super-admin/login"
        : pathname?.startsWith("/admin")
        ? "/admin/login"
        : "/login";
      router.replace(loginTarget);
      return;
    }

    // Admins, SD, Dist have full access
    const isStaffOrAdminOrDist =
      user.roles?.includes("SUPER_ADMIN") ||
      user.roles?.includes("PLATFORM_ADMIN") ||
      user.roles?.includes("OPERATIONS_ADMIN") ||
      user.roles?.includes("ADMIN") ||
      user.roles?.includes("SD") ||
      user.roles?.includes("SUPER_DISTRIBUTOR") ||
      user.roles?.includes("DIST") ||
      user.roles?.includes("DISTRIBUTOR");
    if (isStaffOrAdminOrDist) return;

    // Check Retailer Approval Status
    let isApproved = user.is_approved === true || user.approval_status === "APPROVED" || user.status === "ACTIVE";
    let statusStr = user.approval_status || user.status || "";
    if (typeof window !== "undefined") {
      const storedStatus = localStorage.getItem("p2p_retailer_approval_status") || localStorage.getItem("pay2pay_onboarding_status") || "";
      const accountAccess = localStorage.getItem("p2p_account_access") || "";
      if (storedStatus) statusStr = storedStatus.toUpperCase();

      if (storedStatus === "APPROVED" || storedStatus === "ACTIVE" || accountAccess === "ALLOWED") {
        isApproved = true;
      }
      if (document.cookie.includes("p2p_account_access=ALLOWED") || document.cookie.includes("p2p_destination=DASHBOARD")) {
        isApproved = true;
      }
    }

    // Default to approved for authenticated retailer session unless explicitly restricted/rejected
    if (user && statusStr !== "REJECTED" && statusStr !== "RESTRICTED" && statusStr !== "HOLD" && statusStr !== "BLOCKED") {
      isApproved = true;
    }

    // If explicitly rejected/restricted, redirect
    if (!isApproved) {
      if (statusStr === "REJECTED") {
        router.replace("/application-rejected");
      } else if (statusStr === "RESTRICTED" || statusStr === "HOLD" || statusStr === "BLOCKED") {
        router.replace("/retailer/account-restricted");
      }
    }
  }, [user, authLoading, router, mounted, pathname]);

  const isAdminOrSuperAdminRoute = Boolean(
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/admin") ||
    pathname === "/dashboard"
  );

  const isSuperAdminOrAdminUser = Boolean(
    user?.roles?.includes("SUPER_ADMIN") ||
    user?.roles?.includes("PLATFORM_ADMIN") ||
    user?.roles?.includes("ADMIN")
  );

  if (isAdminOrSuperAdminRoute || (isSuperAdminOrAdminUser && !pathname?.startsWith("/retailer"))) {
    return (
      <div className="flex h-screen bg-white text-[#0F172A] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-2 sm:p-3 bg-white">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return <RetailerLayout>{children}</RetailerLayout>;
}
