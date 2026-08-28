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

  // Back-button bfcache handler & session verification
  useEffect(() => {
    const checkSessionOnShow = () => {
      const cookies = document.cookie.split("; ");
      const tokenCookie = cookies.find((row) =>
        row.startsWith("p2p_access_token=") ||
        row.startsWith("pay2pay_access_token=") ||
        row.startsWith("pay2pay_auth_token=")
      );
      const cookieToken = tokenCookie ? tokenCookie.split("=")[1]?.trim() : null;
      const lsToken =
        typeof window !== "undefined"
          ? localStorage.getItem("p2p_access_token") ||
            localStorage.getItem("pay2pay_access_token") ||
            localStorage.getItem("pay2pay_auth_token") ||
            localStorage.getItem("access_token")
          : null;

      const token = cookieToken || (lsToken ? lsToken.trim() : null);

      if (!token || token.length < 10) {
        if (!window.location.pathname.includes("/login")) {
          window.location.replace(`/retailer/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        }
      } else if (!cookieToken && token) {
        document.cookie = `p2p_access_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `pay2pay_access_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
      }
    };

    window.addEventListener("pageshow", checkSessionOnShow);
    window.addEventListener("focus", checkSessionOnShow);
    return () => {
      window.removeEventListener("pageshow", checkSessionOnShow);
      window.removeEventListener("focus", checkSessionOnShow);
    };
  }, []);

  // Authentication & Approval check
  useEffect(() => {
    if (!mounted || authLoading) return;
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

    // Check Retailer Approval Status from server-authoritative user object
    const isApproved =
      user?.approval_status === "APPROVED" ||
      user?.status === "ACTIVE" ||
      user?.is_approved === true;

    const statusStr = (user?.status || user?.approval_status || "").toUpperCase();

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
