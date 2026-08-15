"use client";

import { useRetailerStore } from "@/stores/use-retailer-store";

export function useRetailerApprovalGuard() {
  const { setApprovalStatus } = useRetailerStore();

  return {
    isApproved: true,
    approvalStatus: "APPROVED",
    kycStatus: "VERIFIED",
    retailerStatus: "ACTIVE",
    isPathLocked: (_path?: string) => false,
    setApprovalStatus,
  };
}
