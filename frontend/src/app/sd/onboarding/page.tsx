import React from "react";
import { ProgressiveOnboardingWizard } from "@/components/onboarding/ProgressiveOnboardingWizard";

export default function SDOnboardingPage() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            Super Distributor Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Near4You SD Onboarding
          </h1>
          <p className="text-xs sm:text-sm text-[#625B60] max-w-lg mx-auto">
            Complete your Super Distributor enterprise verification to activate your regional master console.
          </p>
        </div>

        {/* Wizard Component */}
        <ProgressiveOnboardingWizard appType="SD" />
      </div>
    </div>
  );
}
