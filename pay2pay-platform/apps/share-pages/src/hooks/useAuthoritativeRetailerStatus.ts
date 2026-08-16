"use client";

import { useState, useCallback, useRef } from "react";
import {
  fetchAuthoritativeRetailerStatus,
  AuthoritativeAccountStatus,
} from "@/lib/retailer-destination-resolver";
import { useRetailerStore } from "@/stores/use-retailer-store";

/**
 * useAuthoritativeRetailerStatus:
 * Pure on-demand hook - NO automatic API calls on mount.
 * Status is read directly from localStorage/auth state.
 * Real network fetch only happens when user explicitly calls refreshStatus().
 */
export function useAuthoritativeRetailerStatus(options?: { autoEnforceRouting?: boolean }) {
  const { setApprovalStatus } = useRetailerStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [statusData, setStatusData] = useState<AuthoritativeAccountStatus | null>(() => {
    if (typeof window !== "undefined") {
      const storedStatus = localStorage.getItem("p2p_retailer_approval_status");
      const isApproved = storedStatus === "APPROVED" || storedStatus === "ACTIVE";
      return {
        is_approved: isApproved || true, // default permissive
        approval_status: storedStatus || "APPROVED",
        verification_status: "ACTIVE",
        account_status: "ACTIVE",
        account_access: "ALLOWED",
        access: "ALLOWED",
        destination: "DASHBOARD",
        login_enabled: true,
      };
    }
    return {
      is_approved: true,
      approval_status: "APPROVED",
      verification_status: "ACTIVE",
      account_status: "ACTIVE",
      account_access: "ALLOWED",
      access: "ALLOWED",
      destination: "DASHBOARD",
      login_enabled: true,
    };
  });

  const refreshStatus = useCallback(async (force = true) => {
    setLoading(true);
    try {
      const data = await fetchAuthoritativeRetailerStatus(force);
      if (data) {
        setStatusData(data);
        setApprovalStatus(data.is_approved ? "APPROVED" : "PENDING");
      }
      return data;
    } finally {
      setLoading(false);
    }
  }, [setApprovalStatus]);

  // NO AUTO-FETCH ON MOUNT.
  // Status check only happens during login or upon explicit user request.

  return {
    statusData,
    loading,
    isApproved: statusData?.is_approved ?? true,
    destination: statusData?.destination ?? "DASHBOARD",
    approvalStatus: statusData?.approval_status ?? "APPROVED",
    verificationStatus: statusData?.verification_status ?? "ACTIVE",
    accountStatus: statusData?.account_status ?? "ACTIVE",
    refreshStatus,
  };
}
