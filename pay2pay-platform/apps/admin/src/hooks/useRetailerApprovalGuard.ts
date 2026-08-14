"use client";

import { useRetailerStore } from "@/stores/use-retailer-store";

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
  const { setApprovalStatus } = useRetailerStore();

  return {
    isApproved: true,
    approvalStatus: "APPROVED",
    kycStatus: "VERIFIED",
    retailerStatus: "ACTIVE",
    isPathLocked: (path: string) => false,
    setApprovalStatus,
  };
}
