"use client";

import React from "react";
import { Step6AGst } from "@/components/onboarding/steps/Step6AGst";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterGstPage() {
  const { registrationId, handleStepComplete } = useRegistration();

  return (
    <Step6AGst
      registrationId={registrationId}
      onSuccess={(gstData) => handleStepComplete(7, { gst: gstData })}
    />
  );
}
