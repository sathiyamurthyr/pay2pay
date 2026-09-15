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

  // Back-button bfcache handler & session verification (Strictly session cookies, zero localStorage)
  useEffect(() => {
    const checkSessionOnShow = () => {
      const cookies = document.cookie.split("; ");
      const tokenCookie = cookies.find((row) =>
        row.startsWith("p2p_access_token=") ||
        row.startsWith("pay2pay_access_token=") ||
        row.startsWith("pay2pay_auth_token=")
      );
      const cookieToken = tokenCookie ? tokenCookie.split("=")[1]?.trim() : null;

      if (!cookieToken || cookieToken.length < 10) {
        if (!window.location.pathname.includes("/login")) {
          window.location.replace(`/retailer/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        }
      }
    };

    window.addEventListener("pageshow", checkSessionOnShow);
    return () => {
      window.removeEventListener("pageshow", checkSessionOnShow);
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

    // Check Retailer Authoritative Approval & Active Status
    const isBothTrue =
      user?.is_approved === true ||
      user?.approval_status === "APPROVED" ||
      user?.status === "ACTIVE" ||
      (user?.approve_status === true && user?.active_status === true);

    const statusStr = (user?.status || user?.approval_status || "").toUpperCase();

    // If not approved and active according to local state, check live database before redirecting
    if (!isBothTrue) {
      import("@/lib/retailer-destination-resolver").then(({ fetchAuthoritativeRetailerStatus }) => {
        fetchAuthoritativeRetailerStatus(true).then((authStatus) => {
          if (authStatus && authStatus.approve_status === true && authStatus.active_status === true) {
            try {
              const raw = localStorage.getItem("user_info") || localStorage.getItem("pay2pay_user_data");
              const parsed = raw ? JSON.parse(raw) : {};
              const updated = {
                ...parsed,
                approve_status: true,
                active_status: true,
                is_approved: true,
                approval_status: "APPROVED",
                status: "ACTIVE",
              };
              localStorage.setItem("user_info", JSON.stringify(updated));
              localStorage.setItem("pay2pay_user_data", JSON.stringify(updated));
              document.cookie = `p2p_destination=DASHBOARD; path=/; max-age=2592000; SameSite=Lax`;
              document.cookie = `p2p_account_access=ALLOWED; path=/; max-age=2592000; SameSite=Lax`;
            } catch {}
            return;
          }

          if (statusStr === "REJECTED" || authStatus?.approval_status === "REJECTED") {
            router.replace("/application-rejected");
          } else if (statusStr === "RESTRICTED" || statusStr === "HOLD" || statusStr === "BLOCKED" || statusStr === "SUSPENDED") {
            router.replace("/retailer/account-restricted");
          } else {
            router.replace("/retailer/account-under-review");
          }
        });
      });
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
