"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { RetailerLayout } from "@/components/layout/retailer-layout";
import { Box, CircularProgress } from "@mui/material";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Authentication & Approval check
  useEffect(() => {
    if (!mounted || authLoading) return;
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
      router.replace("/retailer/login");
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

    // Check Retailer Authoritative Approval & Active Status
    let isApproved =
      user?.is_approved === true ||
      user?.approval_status === "APPROVED" ||
      user?.status === "ACTIVE" ||
      (user?.approve_status === true && user?.active_status === true);

    let statusStr = (user?.status || user?.approval_status || "").toUpperCase();
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
      } else if (statusStr === "RESTRICTED" || statusStr === "HOLD" || statusStr === "BLOCKED" || statusStr === "SUSPENDED") {
        router.replace("/retailer/account-restricted");
      }
    }
  }, [user, authLoading, router, mounted]);

  if (!mounted || authLoading || !user) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#0B0E14",
        }}
      >
        <CircularProgress sx={{ color: "#3B82F6" }} />
      </Box>
    );
  }

  return <RetailerLayout>{children}</RetailerLayout>;
}
