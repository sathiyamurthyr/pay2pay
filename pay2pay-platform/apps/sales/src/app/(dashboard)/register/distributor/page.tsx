"use client";

import React from "react";
import { SinglePageOnboardingForm } from "@/components/onboarding/SinglePageOnboardingForm";

export default function RegisterDistributorPage() {
  return (
    <div className="w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto py-2">
      <SinglePageOnboardingForm initialUserTypeRefId={3} />
    </div>
  );
}
