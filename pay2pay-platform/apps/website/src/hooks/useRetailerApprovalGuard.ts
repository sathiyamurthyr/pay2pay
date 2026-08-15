"use client";

import { useEffect, useState, useRef } from "react";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { fetchAuthoritativeRetailerStatus } from "@/lib/retailer-destination-resolver";

/** Paths that require full Admin approval & active status */
export const LOCKED_FINANCIAL_PATHS = new Set([
  "/retailer/customers",
  "/retailer/beneficiaries",
  "/retailer/dmt",
  "/retailer/card-to-cash",
  "/retailer/aeps",
  "/retailer/upi",
  "/retailer/bbps",
  "/retailer/recharge",
  "/retailer/wallet",
  "/retailer/wallet-statement",
  "/retailer/settlement",
  "/retailer/commission",
  "/retailer/transactions",
  "/retailer/pos",
]);

export function useRetailerApprovalGuard() {
  const { outlet, setApprovalStatus } = useRetailerStore();
  const [isApprovedLive, setIsApprovedLive] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const uStr = localStorage.getItem("user_info") || localStorage.getItem("user") || localStorage.getItem("pay2pay_user_data");
        if (uStr) {
          const u = JSON.parse(uStr);
          const role = (u.role || u.user_type || u.role_code || "").toUpperCase();
          if (["SUPER_ADMIN", "ADMIN", "PLATFORM_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN"].includes(role)) {
            return true;
          }
        }
      } catch {}
    }
    return outlet.approvalStatus === "APPROVED";
  });
  const [liveApprovalStatus, setLiveApprovalStatus] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const uStr = localStorage.getItem("user_info") || localStorage.getItem("user") || localStorage.getItem("pay2pay_user_data");
        if (uStr) {
          const u = JSON.parse(uStr);
          const role = (u.role || u.user_type || u.role_code || "").toUpperCase();
          if (["SUPER_ADMIN", "ADMIN", "PLATFORM_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN"].includes(role)) {
            return "APPROVED";
          }
        }
      } catch {}
    }
    return outlet.approvalStatus || "PENDING";
  });

  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    let mounted = true;
    (async () => {
      // Check admin role bypass first
      if (typeof window !== "undefined") {
        try {
          const uStr = localStorage.getItem("user_info") || localStorage.getItem("user") || localStorage.getItem("pay2pay_user_data");
          if (uStr) {
            const u = JSON.parse(uStr);
            const role = (u.role || u.user_type || u.role_code || "").toUpperCase();
            if (["SUPER_ADMIN", "ADMIN", "PLATFORM_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN"].includes(role)) {
              if (mounted) {
                setIsApprovedLive(true);
                setLiveApprovalStatus("APPROVED");
                useRetailerStore.getState().setApprovalStatus("APPROVED");
              }
              return;
            }
          }
        } catch {}
      }

      const authState = await fetchAuthoritativeRetailerStatus(false);
      if (mounted && authState) {
        setIsApprovedLive(authState.is_approved);
        setLiveApprovalStatus(authState.approval_status);
        useRetailerStore.getState().setApprovalStatus(authState.is_approved ? "APPROVED" : "PENDING");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isApproved = isApprovedLive || outlet.approvalStatus === "APPROVED";

  const isPathLocked = (path: string) => {
    if (isApproved) return false;
    return LOCKED_FINANCIAL_PATHS.has(path) || Array.from(LOCKED_FINANCIAL_PATHS).some((p) => path.startsWith(p));
  };

  return {
    isApproved,
    approvalStatus: liveApprovalStatus,
    kycStatus: isApproved ? "VERIFIED" : "PENDING",
    retailerStatus: isApproved ? "ACTIVE" : "PENDING_VERIFICATION",
    isPathLocked,
    setApprovalStatus,
  };
}
