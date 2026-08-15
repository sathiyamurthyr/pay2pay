"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRegistration, STEP_ROUTES } from "@/context/RegistrationContext";

export default function RegisterIndexPage() {
  const router = useRouter();
  const { currentStep } = useRegistration();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const underReview = 
        localStorage.getItem("p2p_retailer_approval_status") === "UNDER_REVIEW" ||
        localStorage.getItem("pay2pay_onboarding_status") === "UNDER_REVIEW";
      if (underReview || currentStep > 13) {
        router.replace("/retailer/account-under-review");
        return;
      }
    }
    const targetRoute = STEP_ROUTES[currentStep] || "/register/mobile";
    router.replace(targetRoute);
  }, [currentStep, router]);

  return (
    <div className="py-8 text-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm font-bold text-slate-400">Loading your registration portal step...</p>
    </div>
  );
}
