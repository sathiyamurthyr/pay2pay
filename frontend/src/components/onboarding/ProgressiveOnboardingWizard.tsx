"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Smartphone,
  Mail,
  KeyRound,
  FileText,
  Building2,
  CreditCard,
  Store,
  MapPin,
  UploadCloud,
  Video,
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

export const ProgressiveOnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [registrationId, setRegistrationId] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [isBusiness, setIsBusiness] = useState<boolean>(false);
  const [draftData, setDraftData] = useState<any>({});
  const [autoSaveToast, setAutoSaveToast] = useState<string>("");

  // Check if draft exists in localStorage on mount & resume
  useEffect(() => {
    const savedRegId = localStorage.getItem("pay2pay_reg_id");
    const savedMobile = localStorage.getItem("pay2pay_reg_mobile");

    if (savedRegId || savedMobile) {
      fetch(`http://localhost:8000/api/v1/onboarding/resume/${savedRegId || savedMobile}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "SUCCESS") {
            setRegistrationId(data.registration_id);
            setMobileNumber(data.mobile_number);
            setCurrentStep(data.current_step);
            setCompletedSteps(data.completed_steps || []);
            setIsBusiness(data.is_business || false);
            setDraftData(data.draft_data || {});
            triggerAutoSaveToast("Welcome back! Resuming your onboarding draft.");
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
    <div className="relative w-full h-full min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 lg:p-10 select-none font-sans overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-sm text-blue-400">
              P2P
            </div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              Pay2Pay Progressive Onboarding
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold uppercase">
                Step {currentStep === 66 ? "6A" : currentStep} of 12
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Enterprise Retailer KYC & Business Verification Portal</p>
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
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{autoSaveToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Encrypted Session</span>
          </div>
        </div>
      </div>

      {/* Top Animated Progress Bar */}
      <div className="relative z-10 w-full mb-6">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
          <span>Overall Completion: {progressPercent}%</span>
          <span className="text-blue-400 font-extrabold">{STEP_NAMES[currentStep] || "Registration"}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full"
          />
        </div>

        {/* Clickable Completed Step Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 mt-2 no-scrollbar">
          {[1, 2, 3, 4, 5, 6, 66, 7, 8, 9, 10, 11, 12, 13].map((stepNum) => {
            if (stepNum === 66 && !isBusiness) return null; // Hide 6A for individual
            const isDone = completedSteps.includes(stepNum);
            const isCurrent = currentStep === stepNum;

            return (
              <button
                key={stepNum}
                onClick={() => (isDone || stepNum <= currentStep) && setCurrentStep(stepNum)}
                disabled={!isDone && stepNum > currentStep}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 transition-all flex items-center gap-1 ${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400"
                    : isDone || stepNum < currentStep
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-pointer hover:bg-emerald-500/20"
                    : "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed"
                }`}
              >
                {isDone || stepNum < currentStep ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Lock className="w-2.5 h-2.5" />}
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
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl"
          >
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-xs font-extrabold text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700/60 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-blue-500" />
                <span>Back</span>
              </button>
            )}

            {currentStep === 1 && (
              <Step1Mobile
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
                onBack={handleBack}
                onSuccess={(nextStepNum, isBiz, panData) => {
                  setIsBusiness(isBiz);
                  const hName = panData?.registered_name || panData?.pan_holder_name || panData?.retailer_name || "SATHIYA MURTHY";
                  const pNum = panData?.pan_number || panData?.pan || "DAQPS8535F";
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
                onBack={handleBack}
                onSuccess={(aadhaarData) => handleStepComplete(8, { aadhaar: aadhaarData })}
              />
            )}

            {currentStep === 8 && (
              <Step8Bank
                registrationId={registrationId}
                onSuccess={(bankData) => handleStepComplete(9, { bank: bankData })}
              />
            )}

            {currentStep === 9 && (
              <Step9Shop
                registrationId={registrationId}
                onSuccess={(shopData) => handleStepComplete(10, { shop: shopData })}
              />
            )}

            {currentStep === 10 && (
              <Step10Address
                registrationId={registrationId}
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
                onSuccess={() => handleStepComplete(13)}
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
      <div className="relative z-10 mt-6 text-center text-xs font-semibold text-slate-500">
        <p>© 2026 Pay2Pay Financial Technologies · Progressive Retailer Onboarding Portal</p>
      </div>
    </div>
  );
};
