"use client";

import React from "react";
import { Step2MobileOtp } from "@/components/onboarding/steps/Step2MobileOtp";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterMobileOtpPage() {
  const { registrationId, mobileNumber, handleStepComplete } = useRegistration();

  return (
    <Step2MobileOtp
      registrationId={registrationId}
      mobileNumber={mobileNumber}
      onSuccess={() => handleStepComplete(3)}
    />
  );
}
