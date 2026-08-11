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
  const { outlet, setApprovalStatus } = useRetailerStore();

  const isApproved = outlet.approvalStatus === "APPROVED" && outlet.status === "ACTIVE";

  const isPathLocked = (path: string) => {
    if (isApproved) return false;
    return LOCKED_FINANCIAL_PATHS.has(path) || Array.from(LOCKED_FINANCIAL_PATHS).some((p) => path.startsWith(p));
  };

  return {
    isApproved,
    approvalStatus: outlet.approvalStatus,
    kycStatus: outlet.kycStatus,
    retailerStatus: outlet.status,
    isPathLocked,
    setApprovalStatus,
  };
}
