"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SinglePageOnboardingForm } from "@/components/onboarding/SinglePageOnboardingForm";
import { Loader2 } from "lucide-react";

function OnboardingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const rawType = (searchParams.get("type") || searchParams.get("role") || "").toLowerCase();
  const mobile = searchParams.get("mobile") || "";

  let initialUserTypeRefId = 2; // Default to Retailer
  if (rawType === "sd" || rawType === "super_distributor" || rawType === "super-distributor" || rawType === "4") {
    initialUserTypeRefId = 4;
  } else if (rawType === "distributor" || rawType === "dist" || rawType === "3") {
    initialUserTypeRefId = 3;
  }

  return (
    <SinglePageOnboardingForm
      initialUserTypeRefId={initialUserTypeRefId}
      initialMobile={mobile}
      initialLinkToken={token}
    />
  );
}

export default function PublicOnboardingPage() {
  return (
    <div className="min-h-screen bg-[#070A11] text-white py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-400">Loading Enterprise Onboarding Portal...</p>
            </div>
          }
        >
          <OnboardingContent />
        </Suspense>
      </div>
    </div>
  );
}
