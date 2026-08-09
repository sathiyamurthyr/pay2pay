"use client";

import React from "react";
import { Step1Mobile } from "@/components/onboarding/steps/Step1Mobile";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterMobilePage() {
  const { setRegistrationId, setMobileNumber, handleStepComplete, navigateToStep } = useRegistration();

  return (
    <Step1Mobile
      onSuccess={(regId, mob, isResumed, savedStep) => {
        setRegistrationId(regId);
        setMobileNumber(mob);
        localStorage.setItem("pay2pay_reg_id", regId);
        localStorage.setItem("pay2pay_reg_mobile", mob);
        if (isResumed && savedStep) {
          navigateToStep(savedStep);
        } else {
          handleStepComplete(2);
        }
      }}
    />
  );
}
