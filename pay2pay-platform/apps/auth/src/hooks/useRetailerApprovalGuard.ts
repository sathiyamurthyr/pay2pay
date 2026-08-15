"use client";

import { useEffect, useState } from "react";
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
  const [isApprovedLive, setIsApprovedLive] = useState<boolean>(outlet.approvalStatus === "APPROVED");
  const [liveApprovalStatus, setLiveApprovalStatus] = useState<string>(outlet.approvalStatus || "PENDING");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const authState = await fetchAuthoritativeRetailerStatus(false);
      if (mounted && authState) {
        setIsApprovedLive(authState.is_approved);
        setLiveApprovalStatus(authState.approval_status);
        setApprovalStatus(authState.is_approved ? "APPROVED" : "PENDING");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setApprovalStatus]);

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
