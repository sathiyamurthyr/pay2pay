"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { RetailerLayout } from "@/components/layout/retailer-layout";
import {
  fetchAuthoritativeRetailerStatus,
  enforceAuthoritativeRouting,
} from "@/lib/retailer-destination-resolver";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [statusResolved, setStatusResolved] = useState(false);
  const [isAllowed, setIsAllowed] = useState(true);
  const hasEnforcedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Authentication check
  useEffect(() => {
    if (DEV_BYPASS || !mounted) return;
    if (!authLoading && !user) {
      router.replace("/retailer/login");
    }
  }, [user, authLoading, router, mounted]);

  // 2. Authoritative Destination check for Retailer role
  useEffect(() => {
    if (DEV_BYPASS || !mounted || authLoading || !user) return;

    let isCurrent = true;
    (async () => {
      const status = await fetchAuthoritativeRetailerStatus(false);
      if (!isCurrent) return;

      if (status) {
        if (status.destination === "ACCOUNT_UNDER_REVIEW") {
          setIsAllowed(false);
          if (!hasEnforcedRef.current) {
            hasEnforcedRef.current = true;
            enforceAuthoritativeRouting(status, pathname, router);
          }
        } else if (status.destination === "ONBOARDING") {
          setIsAllowed(false);
          if (!hasEnforcedRef.current) {
            hasEnforcedRef.current = true;
            enforceAuthoritativeRouting(status, pathname, router);
          }
        } else if (status.destination === "APPLICATION_REJECTED" || status.destination === "ACCOUNT_RESTRICTED") {
          setIsAllowed(false);
          if (!hasEnforcedRef.current) {
            hasEnforcedRef.current = true;
            enforceAuthoritativeRouting(status, pathname, router);
          }
        } else {
          setIsAllowed(true);
        }
      }
      setStatusResolved(true);
    })();

    return () => {
      isCurrent = false;
    };
  }, [mounted, authLoading, user, pathname, router]);

  // Render RetailerLayout during SSR & pre-hydration
  if (!mounted) {
    return <RetailerLayout>{children}</RetailerLayout>;
  }

  if (!DEV_BYPASS && (authLoading || (!statusResolved && !isAllowed))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-lg border border-[#E5E7EB]">
          <div className="w-10 h-10 border-[3px] border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-[14px] font-bold text-[#111827]">Verifying Session & Account Status…</p>
            <p className="text-[11px] text-[#6B7280] mt-1 font-mono">Pay2Pay Retailer Platform</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <RetailerLayout>{children}</RetailerLayout>;
}
