"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SinglePageOnboardingForm } from "@/components/onboarding/SinglePageOnboardingForm";
import { Loader2 } from "lucide-react";

function RegisterContent() {
  const searchParams = useSearchParams();
  const rawType = (searchParams.get("type") || searchParams.get("role") || "").toLowerCase();
  const token = searchParams.get("token") || "";

  let initialType = 2; // Retailer default
  if (rawType === "sd" || rawType === "super_distributor" || rawType === "4") {
    initialType = 4;
  } else if (rawType === "distributor" || rawType === "dist" || rawType === "3") {
    initialType = 3;
  }

  return (
    <SinglePageOnboardingForm
      initialUserTypeRefId={initialType}
      initialLinkToken={token}
    />
  );
}

export default function RegisterDashboardPage() {
  return (
    <div className="w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto py-2">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#94003A] animate-spin" />
            <p className="text-sm font-semibold text-[#4B5563] mt-3">Loading Onboarding Portal...</p>
          </div>
        }
      >
        <RegisterContent />
      </Suspense>
    </div>
  );
}
