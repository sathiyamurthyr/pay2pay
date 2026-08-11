"use client";

import React from "react";
import { Step6Pan } from "@/components/onboarding/steps/Step6Pan";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterPanPage() {
  const { registrationId, setIsBusiness, handleStepComplete } = useRegistration();

  return (
    <Step6Pan
      registrationId={registrationId}
      onSuccess={(nextStepNum, isBiz, panData) => {
        setIsBusiness(isBiz);
        handleStepComplete(nextStepNum, { pan: panData });
      }}
    />
  );
}
