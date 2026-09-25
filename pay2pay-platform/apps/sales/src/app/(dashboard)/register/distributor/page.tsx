"use client";

import React from "react";
import { SinglePageOnboardingForm } from "@/components/onboarding/SinglePageOnboardingForm";

export default function RegisterDistributorPage() {
  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      <SinglePageOnboardingForm initialUserTypeRefId={3} />
    </div>
  );
}
