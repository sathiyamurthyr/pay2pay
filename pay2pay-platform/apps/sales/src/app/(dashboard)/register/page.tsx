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
    <div className="w-full max-w-5xl mx-auto py-4">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-400 mt-3">Loading Onboarding Portal...</p>
        </div>
      }>
        <RegisterContent />
      </Suspense>
    </div>
  );
}
