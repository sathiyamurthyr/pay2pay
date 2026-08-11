"use client";

import React from "react";
import { Step8Bank } from "@/components/onboarding/steps/Step8Bank";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterBankPage() {
  const { registrationId, handleStepComplete } = useRegistration();

  return (
    <Step8Bank
      registrationId={registrationId}
      onSuccess={(bankData) => handleStepComplete(9, { bank: bankData })}
    />
  );
}
