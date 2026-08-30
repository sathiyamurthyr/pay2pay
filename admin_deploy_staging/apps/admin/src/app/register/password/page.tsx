"use client";

import React from "react";
import { Step5PasswordMpin } from "@/components/onboarding/steps/Step5PasswordMpin";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterPasswordPage() {
  const { registrationId, handleStepComplete } = useRegistration();

  return (
    <Step5PasswordMpin
      registrationId={registrationId}
      onSuccess={() => handleStepComplete(6)}
    />
  );
}
