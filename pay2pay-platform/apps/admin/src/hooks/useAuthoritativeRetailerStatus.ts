"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  fetchAuthoritativeRetailerStatus,
  enforceAuthoritativeRouting,
  type AuthoritativeAccountStatus,
} from "@/lib/retailer-destination-resolver";
import { useRetailerStore } from "@/stores/use-retailer-store";

export function useAuthoritativeRetailerStatus(options?: { autoEnforceRouting?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setApprovalStatus } = useRetailerStore();

  const [statusData, setStatusData] = useState<AuthoritativeAccountStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isEnforcingRef = useRef(false);

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

  // Initial authoritative fetch on mount ONLY (not on every route change)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const data = await fetchAuthoritativeRetailerStatus(false);
      if (isMounted && data) {
        setStatusData(data);
        setApprovalStatus(data.is_approved ? "APPROVED" : "PENDING");
        setLoading(false);

        // Only enforce routing if explicitly requested AND user is NOT approved
        if (options?.autoEnforceRouting && !isEnforcingRef.current && !data.is_approved) {
          isEnforcingRef.current = true;
          enforceAuthoritativeRouting(data, pathname, router);
          setTimeout(() => {
            isEnforcingRef.current = false;
          }, 600);
        }
      } else if (isMounted) {
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONCE on mount only - no re-runs on navigation

  return {
    statusData,
    loading,
    isApproved: statusData?.is_approved ?? true,       // Default to true while loading – never restrict on load
    destination: statusData?.destination ?? "DASHBOARD",
    approvalStatus: statusData?.approval_status ?? "APPROVED",
    verificationStatus: statusData?.verification_status ?? "ACTIVE",
    accountStatus: statusData?.account_status ?? "ACTIVE",
    refreshStatus,
  };
}
