"use client";

import React from "react";
import { Step11Documents } from "@/components/onboarding/steps/Step11Documents";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterDocumentsPage() {
  const { registrationId, isBusiness, handleStepComplete } = useRegistration();

  return (
    <Step11Documents
      registrationId={registrationId}
      isBusiness={isBusiness}
      onSuccess={() => handleStepComplete(12)}
    />
  );
}
