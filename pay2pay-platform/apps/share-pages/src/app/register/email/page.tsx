"use client";

import React from "react";
import { Step3Email } from "@/components/onboarding/steps/Step3Email";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterEmailPage() {
  const { registrationId, handleStepComplete } = useRegistration();

  return (
    <Step3Email
      registrationId={registrationId}
      onSuccess={(email) => handleStepComplete(4, { email })}
    />
  );
}
