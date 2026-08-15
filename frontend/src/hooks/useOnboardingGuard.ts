"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { STEP_ROUTES } from "@/context/RegistrationContext";

import { useRetailerStore } from "@/stores/use-retailer-store";

export interface OnboardingStatusState {
  registrationStatus: "NOT_STARTED" | "DRAFT" | "SUBMITTED" | "CANCELLED" | "KYC_SUBMITTED";
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "ON_HOLD" | "APPROVED" | "REJECTED";
  retailerStatus: "ONBOARDING" | "PENDING_VERIFICATION" | "ON_HOLD" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "PENDING_KYC";
  currentStep: number;
  applicationRef?: string;
  adminRemarks?: string;
  loading: boolean;
}

export function useOnboardingGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { setApprovalStatus } = useRetailerStore();

  const [statusState, setStatusState] = useState<OnboardingStatusState>({
    registrationStatus: "KYC_SUBMITTED",
    verificationStatus: "UNDER_REVIEW",
    retailerStatus: "PENDING_VERIFICATION",
    currentStep: 12,
    loading: true
  });

  useEffect(() => {
    let savedMobile = "";
    let regId = "";
    if (typeof window !== "undefined") {
      savedMobile = localStorage.getItem("pay2pay_user_mobile") || localStorage.getItem("pay2pay_reg_mobile") || "";
      regId = localStorage.getItem("pay2pay_reg_id") || "";
    }

    const queryKey = savedMobile || regId;
    if (!queryKey) {
      setStatusState((prev) => ({ ...prev, loading: false }));
      return;
    }

    fetch(`/api/v1/onboarding/status/${encodeURIComponent(queryKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "SUCCESS") {
          const regStatus = data.registration_status || "KYC_SUBMITTED";
          const verStatus = data.verification_status || "UNDER_REVIEW";
          const retStatus = data.retailer_status || "PENDING_VERIFICATION";
          const step = data.current_step || 12;
          const isApproved = data.is_approved === true;

          setStatusState({
            registrationStatus: regStatus,
            verificationStatus: verStatus,
            retailerStatus: retStatus,
            currentStep: step,
            applicationRef: data.application_ref,
            adminRemarks: data.admin_remarks,
            loading: false
          });

          // Lock to UNDER_REVIEW if backend says is_approved is false
          if (!isApproved) {
            setApprovalStatus("UNDER_REVIEW");
            if (typeof window !== "undefined") {
              localStorage.setItem("p2p_retailer_approval_status", "UNDER_REVIEW");
            }
          } else {
            setApprovalStatus("APPROVED");
          }

          if (regStatus === "DRAFT") {
            const targetRoute = STEP_ROUTES[step] || "/register/mobile";
            if (!pathname.startsWith("/register")) {
              router.replace(targetRoute);
            }
          }
        } else {
          setApprovalStatus("UNDER_REVIEW");
          setStatusState((prev) => ({ ...prev, loading: false }));
        }
      })
      .catch(() => {
        setApprovalStatus("UNDER_REVIEW");
        setStatusState((prev) => ({ ...prev, loading: false }));
      });
  }, [router, setApprovalStatus]);

  return statusState;
}
