"use client";

import React from "react";
import { Step9Shop } from "@/components/onboarding/steps/Step9Shop";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterShopPage() {
  const { registrationId, handleStepComplete } = useRegistration();

  return (
    <Step9Shop
      registrationId={registrationId}
      onSuccess={(shopData) => handleStepComplete(10, { shop: shopData })}
    />
  );
}
