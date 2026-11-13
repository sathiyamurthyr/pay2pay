import React from "react";
import { ProgressiveOnboardingWizard } from "@/components/onboarding/ProgressiveOnboardingWizard";

export default function DistOnboardingPage() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">
            Distributor Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Near4You Distributor Onboarding
          </h1>
          <p className="text-xs sm:text-sm text-[#625B60] max-w-lg mx-auto">
            Complete your Distributor verification to activate your retail operations workspace.
          </p>
        </div>

        {/* Wizard Component */}
        <ProgressiveOnboardingWizard appType="DIST" />
      </div>
    </div>
  );
}
