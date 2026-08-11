"use client";

import React from "react";
import { StepFinalReview } from "@/components/onboarding/steps/StepFinalReview";
import { useRegistration } from "@/context/RegistrationContext";

export default function RegisterReviewPage() {
  const { registrationId, draftData, isBusiness, navigateToStep, handleStepComplete } = useRegistration();

  return (
    <StepFinalReview
      registrationId={registrationId}
      draftData={draftData}
      isBusiness={isBusiness}
      onEditStep={(stepNum) => navigateToStep(stepNum)}
      onSubmissionSuccess={() => handleStepComplete(14)}
    />
  );
}
