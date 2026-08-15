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

  let effectiveApproval = outlet.approvalStatus;
  let effectiveKyc = outlet.kycStatus;
  let effectiveStatus = outlet.status;

  if (typeof window !== "undefined") {
    const savedApproval = localStorage.getItem("p2p_retailer_approval_status");
    if (savedApproval && ["APPROVED", "PENDING", "REJECTED", "UNDER_REVIEW"].includes(savedApproval)) {
      effectiveApproval = savedApproval as any;
    } else {
      const onboardStatus = localStorage.getItem("pay2pay_onboarding_status");
      if (onboardStatus && ["APPROVED", "PENDING", "REJECTED", "UNDER_REVIEW"].includes(onboardStatus)) {
        effectiveApproval = onboardStatus as any;
      }
    }
    if (effectiveApproval !== "APPROVED") {
      effectiveStatus = "PENDING_KYC";
      effectiveKyc = "PENDING";
    }
  }

  const isApproved = effectiveApproval === "APPROVED" && effectiveStatus === "ACTIVE";

  const isPathLocked = (path: string) => {
    if (isApproved) return false;
    return LOCKED_FINANCIAL_PATHS.has(path) || Array.from(LOCKED_FINANCIAL_PATHS).some((p) => path.startsWith(p));
  };

  return {
    isApproved,
    approvalStatus: effectiveApproval,
    kycStatus: effectiveKyc,
    retailerStatus: effectiveStatus,
    isPathLocked,
    setApprovalStatus,
  };
}
