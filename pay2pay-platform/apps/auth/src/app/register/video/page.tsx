"use client";

import React from "react";
import { Step12Video } from "@/components/onboarding/steps/Step12Video";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterVideoPage() {
  const { registrationId, handleStepComplete } = useRegistration();

  return (
    <Step12Video
      registrationId={registrationId}
      onSuccess={() => handleStepComplete(13)}
    />
  );
}
