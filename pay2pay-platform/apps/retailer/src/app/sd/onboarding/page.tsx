import React from "react";
import { SinglePageOnboardingForm } from "@/components/onboarding/SinglePageOnboardingForm";

export default function SDOnboardingPage() {
  return (
    <div className="min-h-screen bg-[#070A11] text-white py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <SinglePageOnboardingForm initialUserTypeRefId={4} />
      </div>
    </div>
  );
}
