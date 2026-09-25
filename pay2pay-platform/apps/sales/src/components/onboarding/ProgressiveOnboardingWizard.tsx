"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Store,
  CreditCard,
  Building2,
  CheckSquare
} from "lucide-react";

import { Step1Mobile } from "./steps/Step1Mobile";
import { Step2MobileOtp } from "./steps/Step2MobileOtp";
import { Step3Email } from "./steps/Step3Email";
import { Step4EmailOtp } from "./steps/Step4EmailOtp";
import { Step5PasswordMpin } from "./steps/Step5PasswordMpin";
import { Step6Pan } from "./steps/Step6Pan";
import { Step6AGst } from "./steps/Step6AGst";
import { Step7Aadhaar } from "./steps/Step7Aadhaar";
import { Step8Bank } from "./steps/Step8Bank";
import { Step9Shop } from "./steps/Step9Shop";
import { Step10Address } from "./steps/Step10Address";
import { Step11Documents } from "./steps/Step11Documents";
import { Step12Video } from "./steps/Step12Video";
import { StepFinalReview } from "./steps/StepFinalReview";

export const STEP_NAMES: Record<number, string> = {
  1: "Mobile Check",
  2: "Mobile OTP",
  3: "Email Address",
  4: "Email OTP",
  5: "Credentials & MPIN",
  6: "PAN Verification",
  66: "GST Verification",
  7: "Aadhaar eKYC",
  8: "Bank Account",
  9: "Shop Details",
  10: "Shop Address",
  11: "Document Upload",
  12: "Video Verification",
  13: "Final Review & Submit"
};

interface ProgressiveOnboardingWizardProps {
  appType?: "RETAILER" | "DIST" | "SD" | string;
  initialUserTypeRefId?: number;
  initialMobile?: string;
}

export const ProgressiveOnboardingWizard: React.FC<ProgressiveOnboardingWizardProps> = ({
  appType = "RETAILER",
  initialUserTypeRefId,
  initialMobile = ""
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [registrationId, setRegistrationId] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>(initialMobile || "");
  const [isBusiness, setIsBusiness] = useState<boolean>(false);
  const [draftData, setDraftData] = useState<any>({ user_role: appType });
  const [autoSaveToast, setAutoSaveToast] = useState<string>("");

  const roleTitle =
    appType === "SD"
      ? "Super Distributor"
      : appType === "DIST"
      ? "Distributor"
      : "Retailer";

  // Check if draft exists in localStorage on mount & resume
  useEffect(() => {
    const savedRegId = localStorage.getItem("pay2pay_reg_id");
    const savedMobile = localStorage.getItem("pay2pay_reg_mobile");

    if (savedRegId || savedMobile) {
      fetch(`/api/v1/onboarding/resume/${savedRegId || savedMobile}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "SUCCESS") {
            setRegistrationId(data.registration_id);
            setMobileNumber(data.mobile_number);
            setCurrentStep(data.current_step);
            setCompletedSteps(data.completed_steps || []);
            setIsBusiness(data.is_business || false);
            setDraftData((prev: any) => ({ ...prev, ...(data.draft_data || {}) }));
            triggerAutoSaveToast("Welcome back! Resuming onboarding draft.");
          }
        })
        .catch(() => {});
    }
  }, []);

  const triggerAutoSaveToast = (msg: string = "Progress Auto-Saved") => {
    setAutoSaveToast(msg);
    setTimeout(() => setAutoSaveToast(""), 3000);
  };

  const handleBack = () => {
    if (currentStep <= 1) return;
    if (currentStep === 66) {
      setCurrentStep(6);
    } else if (currentStep === 7 && !isBusiness) {
      setCurrentStep(6);
    } else if (currentStep === 7 && isBusiness) {
      setCurrentStep(66);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepComplete = (nextStepNum: number, updatedDraftData?: any) => {
    triggerAutoSaveToast();
    if (updatedDraftData) {
      setDraftData((prev: any) => ({ ...prev, ...updatedDraftData }));
    }
    setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
    setCurrentStep(nextStepNum);
  };

  const progressPercent = Math.min(100, Math.round((completedSteps.length / 12) * 100));

  return (
    <div className="relative w-full h-full min-h-screen bg-[#F5F6FA] text-[#1F2937] flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none font-sans overflow-x-hidden">
      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#94003A] to-[#78002F] p-0.5 shadow-sm">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center font-black text-sm text-[#94003A]">
              P2P
            </div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-[#1F2937] flex items-center gap-2">
              Pay2Pay Progressive Onboarding
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] font-bold uppercase">
                {roleTitle} • Step {currentStep === 66 ? "6A" : currentStep} of 12
              </span>
            </h1>
            <p className="text-xs text-[#6B7280] font-medium">
              Sales Partner Field Registration & Assisted KYC Verification Portal
            </p>
          </div>
        </div>

        {/* Auto-Save Toast & Status Indicator */}
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {autoSaveToast && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-3 py-1.5 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{autoSaveToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] text-xs font-bold text-[#4B5563] shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#94003A]" />
            <span>Encrypted Session</span>
          </div>
        </div>
      </div>

      {/* Top Animated Progress Bar */}
      <div className="relative z-10 w-full mb-6">
        <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] mb-1.5">
          <span>Overall Completion: {progressPercent}%</span>
          <span className="text-[#94003A] font-black">
            {STEP_NAMES[currentStep] || "Registration"}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-[#94003A] to-[#E7B631] rounded-full"
          />
        </div>

        {/* Clickable Completed Step Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 mt-2 no-scrollbar">
          {[1, 2, 3, 4, 5, 6, 66, 7, 8, 9, 10, 11, 12, 13].map((stepNum) => {
            if (stepNum === 66 && !isBusiness) return null;
            const isDone = completedSteps.includes(stepNum);
            const isCurrent = currentStep === stepNum;

            return (
              <button
                key={stepNum}
                onClick={() => (isDone || stepNum <= currentStep) && setCurrentStep(stepNum)}
                disabled={!isDone && stepNum > currentStep}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 transition-all flex items-center gap-1 ${
                  isCurrent
                    ? "bg-[#94003A] text-white shadow-xs ring-2 ring-[#E7B631]"
                    : isDone || stepNum < currentStep
                    ? "bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] cursor-pointer hover:bg-[#DCFCE7]/80"
                    : "bg-white border border-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
                }`}
              >
                {isDone || stepNum < currentStep ? (
                  <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                ) : (
                  <Lock className="w-2.5 h-2.5" />
                )}
                <span>{stepNum === 66 ? "6A: GST" : `Step ${stepNum}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Slide-in Step Component Wrapper */}
      <div className="relative z-10 my-auto max-w-xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 shadow-sm text-[#1F2937]"
          >
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAFAFC] hover:bg-[#F3F4F6] text-xs font-bold text-[#4B5563] hover:text-[#1F2937] transition-all border border-[#E5E7EB] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#94003A]" />
                <span>Back</span>
              </button>
            )}

            {currentStep === 1 && (
              <Step1Mobile
                initialMobile={mobileNumber}
                onSuccess={(regId, mob, isResumed, savedStep) => {
                  setRegistrationId(regId);
                  setMobileNumber(mob);
                  localStorage.setItem("pay2pay_reg_id", regId);
                  localStorage.setItem("pay2pay_reg_mobile", mob);
                  if (isResumed && savedStep) {
                    setCurrentStep(savedStep);
                  } else {
                    handleStepComplete(2);
                  }
                }}
              />
            )}

            {currentStep === 2 && (
              <Step2MobileOtp
                registrationId={registrationId}
                mobileNumber={mobileNumber}
                onSuccess={() => handleStepComplete(3)}
              />
            )}

            {currentStep === 3 && (
              <Step3Email
                registrationId={registrationId}
                onSuccess={(email) => handleStepComplete(4, { email })}
              />
            )}

            {currentStep === 4 && (
              <Step4EmailOtp
                registrationId={registrationId}
                email={draftData.email}
                onSuccess={() => handleStepComplete(5)}
              />
            )}

            {currentStep === 5 && (
              <Step5PasswordMpin
                registrationId={registrationId}
                onSuccess={() => handleStepComplete(6)}
              />
            )}

            {currentStep === 6 && (
              <Step6Pan
                registrationId={registrationId}
                initialPan={draftData?.pan_number || draftData?.pan?.pan_number || ""}
                onBack={handleBack}
                onSuccess={(nextStepNum, isBiz, panData) => {
                  setIsBusiness(isBiz);
                  const hName =
                    panData?.registered_name ||
                    panData?.pan_holder_name ||
                    panData?.retailer_name ||
                    draftData?.name ||
                    "";
                  const pNum = panData?.pan_number || panData?.pan || "";
                  handleStepComplete(nextStepNum, {
                    name: hName,
                    retailer_name: hName,
                    pan_number: pNum,
                    pan: {
                      ...panData,
                      holder_name: hName,
                      registered_name: hName,
                      pan_number: pNum
                    }
                  });
                }}
              />
            )}

            {currentStep === 66 && (
              <Step6AGst
                registrationId={registrationId}
                onSuccess={(gstData) => handleStepComplete(7, { gst: gstData })}
              />
            )}

            {currentStep === 7 && (
              <Step7Aadhaar
                registrationId={registrationId}
                initialAadhaar={draftData?.aadhaar_number || draftData?.aadhaar?.aadhaar_number || ""}
                onBack={handleBack}
                onSuccess={(aadhaarData) => handleStepComplete(8, { aadhaar: aadhaarData })}
              />
            )}

            {currentStep === 8 && (
              <Step8Bank
                registrationId={registrationId}
                initialName={
                  draftData?.name ||
                  draftData?.retailer_name ||
                  draftData?.pan?.registered_name ||
                  draftData?.pan?.holder_name ||
                  ""
                }
                initialAccountNumber={draftData?.bank?.account_number || ""}
                initialIfsc={draftData?.bank?.ifsc || ""}
                onBack={handleBack}
                onSuccess={(bankData) => handleStepComplete(9, { bank: bankData })}
              />
            )}

            {currentStep === 9 && (
              <Step9Shop
                registrationId={registrationId}
                initialShop={draftData?.shop || {}}
                onBack={handleBack}
                onSuccess={(shopData) => handleStepComplete(10, { shop: shopData })}
              />
            )}

            {currentStep === 10 && (
              <Step10Address
                registrationId={registrationId}
                initialAddress={draftData?.address || {}}
                aadhaarAddress={draftData?.aadhaar || {}}
                onBack={handleBack}
                onSuccess={(addressData) => handleStepComplete(11, { address: addressData })}
              />
            )}

            {currentStep === 11 && (
              <Step11Documents
                registrationId={registrationId}
                isBusiness={isBusiness}
                savedDocs={draftData?.documents || {}}
                onSuccess={() => handleStepComplete(12)}
                onBack={handleBack}
              />
            )}

            {currentStep === 12 && (
              <Step12Video
                registrationId={registrationId}
                merchantName={
                  draftData?.name ||
                  draftData?.retailer_name ||
                  draftData?.pan?.registered_name ||
                  draftData?.pan?.holder_name ||
                  ""
                }
                shopName={draftData?.shop?.shop_name || draftData?.shop_name || ""}
                onSuccess={() => handleStepComplete(13)}
                onBack={handleBack}
              />
            )}

            {currentStep === 13 && (
              <StepFinalReview
                registrationId={registrationId}
                draftData={draftData}
                isBusiness={isBusiness}
                onEditStep={(stepNum) => setCurrentStep(stepNum)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-6 text-center text-xs font-semibold text-[#6B7280]">
        <p>© 2021 SUPER REX PRODUCTS PRIVATE LIMITED</p>
        <p>Pay2Pay Enterprise Sales Portal</p>
      </div>
    </div>
  );
};
