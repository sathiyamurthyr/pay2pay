"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CheckCircle2, Lock } from "lucide-react";
import { RegistrationProvider, useRegistration, STEP_TITLES } from "@/context/RegistrationContext";

function RegistrationLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    currentStep,
    completedSteps,
    isBusiness,
    autoSaveToast,
    navigateToStep
  } = useRegistration();

  const progressPercent = Math.min(100, Math.round((completedSteps.length / 12) * 100));

  return (
    <div className="relative w-full h-full min-h-screen bg-[#FFFFFF] text-[#292329] flex flex-col justify-between p-4 sm:p-6 lg:p-10 select-none font-sans overflow-hidden">
      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E8E2E5]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#A20A3A] to-[#85072F] p-0.5 shadow-md shadow-[#A20A3A]/20">
            <div className="w-full h-full bg-[#FFFFFF] rounded-[14px] flex items-center justify-center font-black text-sm text-[#A20A3A]">
              N4U
            </div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#292329] flex items-center gap-2">
              Near4You Progressive Registration
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF0F4] border border-[#FFD6E2] text-[#A20A3A] font-bold uppercase">
                Step {currentStep === 66 ? "6A" : currentStep === 14 ? "Submitted" : currentStep} of 12
              </span>
            </h1>
            <p className="text-xs text-[#625B60] font-medium">Enterprise Retailer KYC & Business Verification Portal</p>
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
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{autoSaveToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F9] border border-[#E8E2E5] text-xs font-bold text-[#625B60]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#A20A3A]" />
            <span>Encrypted Session</span>
          </div>
        </div>
      </div>

      {/* Top Animated Progress Bar (Visible during registration) */}
      {currentStep !== 14 && (
        <div className="relative z-10 w-full mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-[#625B60] mb-1.5">
            <span>Overall Completion: {progressPercent}%</span>
            <span className="text-[#A20A3A] font-extrabold">{STEP_TITLES[currentStep] || "Registration"}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#FAF8F9] border border-[#E8E2E5] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-[#A20A3A] via-[#C42555] to-[#EDC11E] rounded-full"
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
                  onClick={() => isDone && navigateToStep(stepNum)}
                  disabled={!isDone && !isCurrent}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 transition-all flex items-center gap-1 ${
                    isCurrent
                      ? "bg-[#A20A3A] text-white shadow-md shadow-[#A20A3A]/25 ring-2 ring-[#A20A3A]/40"
                      : isDone
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 cursor-pointer hover:bg-emerald-500/20"
                      : "bg-[#FAF8F9] border border-[#E8E2E5] text-[#8A8288] cursor-not-allowed"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Lock className="w-2.5 h-2.5" />}
                  <span>{stepNum === 66 ? "6A: GST" : `Step ${stepNum}`}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step Content Container */}
      <div className="relative z-10 my-auto max-w-xl w-full mx-auto">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="bg-[#FFFFFF] border border-[#E8E2E5] rounded-3xl p-5 sm:p-8 shadow-xl"
        >
          {children}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-6 text-center text-xs font-semibold text-[#8A8288]">
        <p>© 2021 Sathus Technology Pvt. Ltd.</p>
        <p>Near4You Retailer Portal</p>
      </div>
    </div>
  );
}

export default function RegistrationLayout({ children }: { children: React.ReactNode }) {
  return (
    <RegistrationProvider>
      <RegistrationLayoutContent>{children}</RegistrationLayoutContent>
    </RegistrationProvider>
  );
}
