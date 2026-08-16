"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * UnapprovedRetailerFullPageModal - DISABLED
 * Replaced with direct pass-through/redirect to dashboard.
 * No blocking modals or restriction overlays are displayed.
 */
export const UnapprovedRetailerFullPageModal: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // If ever mounted on /retailer/account-under-review or /account-under-review, auto-redirect to dashboard
    if (typeof window !== "undefined") {
      router.replace("/retailer/dashboard");
    }
  }, [router]);

  return null;
};
