"use client";

import React from "react";
import { Step7Aadhaar } from "@/components/onboarding/steps/Step7Aadhaar";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterAadhaarPage() {
  const { registrationId, handleStepComplete } = useRegistration();

  return (
    <Step7Aadhaar
      registrationId={registrationId}
      onSuccess={(aadhaarData) => handleStepComplete(8, { aadhaar: aadhaarData })}
    />
  );
}
