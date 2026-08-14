"use client";

import React from "react";
import { Step2MobileOtp } from "@/components/onboarding/steps/Step2MobileOtp";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterMobileOtpPage() {
  const { registrationId, mobileNumber, handleStepComplete, navigateToStep } = useRegistration();

  return (
    <Step2MobileOtp
      registrationId={registrationId}
      mobileNumber={mobileNumber}
      onSuccess={(_targetRoute?: string, targetStep?: number) => {
        if (targetStep && targetStep > 2) {
          navigateToStep(targetStep);
        } else {
          handleStepComplete(3);
        }
      }}
    />
  );
}
