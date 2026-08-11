"use client";

import React from "react";
import { Step4EmailOtp } from "@/components/onboarding/steps/Step4EmailOtp";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterEmailOtpPage() {
  const { registrationId, draftData, handleStepComplete } = useRegistration();

  return (
    <Step4EmailOtp
      registrationId={registrationId}
      email={draftData.email}
      onSuccess={() => handleStepComplete(5)}
    />
  );
}
