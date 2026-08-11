"use client";

import React from "react";
import { Step10Address } from "@/components/onboarding/steps/Step10Address";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterAddressPage() {
  const { registrationId, handleStepComplete } = useRegistration();

  return (
    <Step10Address
      registrationId={registrationId}
      onSuccess={(addressData) => handleStepComplete(11, { address: addressData })}
    />
  );
}
