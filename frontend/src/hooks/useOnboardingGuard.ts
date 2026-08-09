"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { STEP_ROUTES } from "@/context/RegistrationContext";

export interface OnboardingStatusState {
  registrationStatus: "NOT_STARTED" | "DRAFT" | "SUBMITTED" | "CANCELLED";
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "ON_HOLD" | "APPROVED" | "REJECTED";
  retailerStatus: "ONBOARDING" | "PENDING_VERIFICATION" | "ON_HOLD" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  currentStep: number;
  applicationRef?: string;
  adminRemarks?: string;
  loading: boolean;
}

export function useOnboardingGuard() {
  const router = useRouter();
  const pathname = usePathname();

  const [statusState, setStatusState] = useState<OnboardingStatusState>({
    registrationStatus: "SUBMITTED",
    verificationStatus: "PENDING",
    retailerStatus: "PENDING_VERIFICATION",
    currentStep: 13,
    loading: true
  });

  useEffect(() => {
    const regId = localStorage.getItem("pay2pay_reg_id");
    const mobile = localStorage.getItem("pay2pay_reg_mobile") || localStorage.getItem("pay2pay_user_mobile");
    const token = localStorage.getItem("pay2pay_access_token");

    if (!regId && !mobile && !token) {
      // Case 1: No registration started
      setStatusState({
        registrationStatus: "NOT_STARTED",
        verificationStatus: "PENDING",
        retailerStatus: "ONBOARDING",
        currentStep: 1,
        loading: false
      });
      return;
    }

    const queryKey = regId || mobile || "DEMO_RETAILER";
    fetch(`http://localhost:8000/api/v1/onboarding/status/${queryKey}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "SUCCESS") {
          const regStatus = data.registration_status || "DRAFT";
          const verStatus = data.verification_status || "PENDING";
          const retStatus = data.retailer_status || "PENDING_VERIFICATION";
          const step = data.current_step || 1;

          setStatusState({
            registrationStatus: regStatus,
            verificationStatus: verStatus,
            retailerStatus: retStatus,
            currentStep: step,
            applicationRef: data.application_ref,
            adminRemarks: data.admin_remarks,
            loading: false
          });

          // Perform Auto Redirection based on Cases 1-5
          if (regStatus === "DRAFT") {
            // Case 2: Registration in progress -> Redirect to exact step sub-route
            const targetRoute = STEP_ROUTES[step] || "/register/mobile";
            if (!pathname.startsWith("/register")) {
              router.replace(targetRoute);
            }
          } else if (regStatus === "SUBMITTED" && pathname.startsWith("/register") && pathname !== "/register/submitted") {
            // Completed registration visiting registration form -> Redirect to dashboard
            router.replace("/dashboard");
          }
        } else {
          setStatusState((prev) => ({ ...prev, loading: false }));
        }
      })
      .catch(() => {
        setStatusState((prev) => ({ ...prev, loading: false }));
      });
  }, [pathname, router]);

  return statusState;
}
