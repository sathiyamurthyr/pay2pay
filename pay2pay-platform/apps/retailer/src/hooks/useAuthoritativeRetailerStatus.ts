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

  // Initial authoritative fetch on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const data = await fetchAuthoritativeRetailerStatus(false);
      if (isMounted && data) {
        setStatusData(data);
        setApprovalStatus(data.is_approved ? "APPROVED" : "PENDING");
        setLoading(false);

        if (options?.autoEnforceRouting && !isEnforcingRef.current) {
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
  }, [pathname, router, setApprovalStatus, options?.autoEnforceRouting]);

  return {
    statusData,
    loading,
    isApproved: statusData?.is_approved ?? false,
    destination: statusData?.destination ?? "ACCOUNT_UNDER_REVIEW",
    approvalStatus: statusData?.approval_status ?? "PENDING",
    verificationStatus: statusData?.verification_status ?? "UNDER_REVIEW",
    accountStatus: statusData?.account_status ?? "UNDER_REVIEW",
    refreshStatus,
  };
}
