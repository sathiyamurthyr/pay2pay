"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, AlertCircle, CheckCircle2, LogIn, RefreshCw } from "lucide-react";

interface Step1Props {
  onSuccess: (regId: string, mobile: string, isResumed: boolean, savedStep?: number) => void;
}

export const Step1Mobile: React.FC<Step1Props> = ({ onSuccess }) => {
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Validation States
  const [completedState, setCompletedState] = useState<boolean>(false);
  const [incompleteState, setIncompleteState] = useState<{ currentStep: number; token: string } | null>(null);

  const handleValidateAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobileNumber.replace(/\D/g, "");
    if (clean.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    setErrorMsg("");
    setCompletedState(false);
    setIncompleteState(null);
    setLoading(true);

    try {
      // 1. PRE-OTP MOBILE VALIDATION (Read-Only Check)
      const valRes = await fetch("/api/v1/onboarding/validate-mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: clean })
      });
      const valData = await valRes.json();

      if (!valRes.ok || valData.status === "ERROR") {
        setLoading(false);
        setErrorMsg(valData.message || "Unable to validate mobile number. Please try again.");
        return;
      }

      // CASE 3: EXISTING + COMPLETED (ZERO OTP SENT!)
      if (valData.registration_status === "COMPLETED" || valData.requires_otp === false) {
        setLoading(false);
        setCompletedState(true);
        return;
      }

      // CASE 2: EXISTING + INCOMPLETE
      if (valData.can_resume === true && valData.validation_token) {
        setLoading(false);
        setIncompleteState({
          currentStep: valData.current_step || 3,
          token: valData.validation_token
        });
        return;
      }

      // CASE 1: NEW MOBILE NUMBER
      if (valData.can_register === true && valData.validation_token) {
        await triggerSendOtp(clean, valData.validation_token, false, undefined);
        return;
      }

      setLoading(false);
      setErrorMsg("Unable to determine mobile status. Please try again.");
    } catch {
      setLoading(false);
      setErrorMsg("Connection error. Please try again.");
    }
  };

  const triggerSendOtp = async (cleanMobile: string, token: string, isResumed: boolean, targetStep?: number) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const sendRes = await fetch("/api/v1/onboarding/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: cleanMobile, validation_token: token })
      });
      const sendData = await sendRes.json();
      setLoading(false);

      if (sendRes.ok && sendData.status === "SUCCESS") {
        onSuccess(sendData.registration_id || `REG_${cleanMobile}`, cleanMobile, isResumed, targetStep);
      } else {
        setErrorMsg(sendData.message || sendData.detail || "Failed to dispatch OTP. Please try again.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Failed to dispatch OTP. Please try again.");
    }
  };

  // ── CASE 3 RENDERING: COMPLETED USER (ZERO OTP SENT!) ──
  if (completedState) {
    return (
      <div className="space-y-6 select-none text-center py-4">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Mobile number already registered.
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Your registration is already completed. Please login to continue accessing your retailer portal.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-left space-y-1">
          <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
            Registered Mobile: +91 {mobileNumber}
          </p>
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Account Status: Active & Fully Onboarded
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Go to Login</span>
        </button>

        <p className="text-xs font-bold text-slate-500">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Login here
          </button>
        </p>
      </div>
    );
  }

  // ── CASE 2 RENDERING: INCOMPLETE USER ──
  if (incompleteState) {
    return (
      <div className="space-y-6 select-none text-center py-4">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xl shadow-amber-500/10">
          <RefreshCw className="w-8 h-8 animate-spin-slow" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Registration Already Started.
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Your registration is incomplete. Verify your mobile to continue from step {incompleteState.currentStep}.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Mobile Number:</span>
            <span className="text-xs font-black text-slate-900 dark:text-white">+91 {mobileNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Current Progress:</span>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400">Step {incompleteState.currentStep}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => triggerSendOtp(mobileNumber.replace(/\D/g, ""), incompleteState.token, true, incompleteState.currentStep)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending OTP...</span>
            </>
          ) : (
            <>
              <span>Continue Registration & Send OTP</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Create Your Retailer Account
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Let's start with your 10-digit mobile number.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleValidateAndContinue} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
              +91
            </span>
            <input
              type="text"
              value={mobileNumber}
              onChange={(e) => {
                setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                setErrorMsg("");
              }}
              placeholder="9876543210"
              required
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Exactly 10 numeric digits. No country codes or spaces.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || mobileNumber.length !== 10}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Validating Mobile...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

