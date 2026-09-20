"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CheckCircle2, Lock, Sparkles, Building2 } from "lucide-react";
import { RegistrationProvider, useRegistration, STEP_TITLES } from "@/context/RegistrationContext";

function RegistrationLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    currentStep,
    completedSteps,
    isBusiness,
    refId,
    autoSaveToast,
    navigateToStep
  } = useRegistration();

  const progressPercent = Math.min(100, Math.round((completedSteps.length / 12) * 100));

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 lg:p-10 select-none font-sans overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-xs bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              P2P
            </div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              Pay2Pay Progressive Distributor Onboarding
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold uppercase">
                Step {currentStep === 66 ? "6A" : currentStep === 14 ? "Submitted" : currentStep} of 12
              </span>
              {refId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold uppercase flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-400" />
                  <span>Ref: {refId}</span>
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Enterprise Distributor KYC & Business Verification Portal
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
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{autoSaveToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Encrypted Distributor Session</span>
          </div>
        </div>
      </div>

      {/* Top Animated Progress Bar */}
      {currentStep !== 14 && (
        <div className="relative z-10 w-full mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
            <span>Overall Completion: {progressPercent}%</span>
            <span className="text-amber-400 font-extrabold">{STEP_TITLES[currentStep] || "Distributor Registration"}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-full"
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
                  onClick={() => isDone && navigateToStep(stepNum)}
                  disabled={!isDone && !isCurrent}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 transition-all flex items-center gap-1 ${
                    isCurrent
                      ? "bg-amber-600 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400"
                      : isDone
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-pointer hover:bg-emerald-500/20"
                      : "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Lock className="w-2.5 h-2.5" />}
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
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-8 shadow-2xl"
        >
          {children}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-6 text-center text-xs font-semibold text-slate-500">
        <p>© 2021 SUPER REX PRODUCTS PRIVATE LIMITED</p>
        <p>Pay2Pay Distributor Portal</p>
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
