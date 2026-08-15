"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, AlertCircle, CheckCircle2, LogIn, RefreshCw, MessageSquare, ShieldCheck, FileText } from "lucide-react";

interface Step2Props {
  registrationId: string;
  mobileNumber?: string;
  onSuccess: (nextRoute?: string, nextStep?: number) => void;
  onBack: () => void;
}

interface ResumeStateInfo {
  currentStep: number;
  nextStep: number;
  totalSteps: number;
  completedCount: number;
  completionPercent: number;
  currentStepName: string;
  nextRoute: string;
  message: string;
}

export const Step2MobileOtp: React.FC<Step2Props> = ({
  registrationId,
  mobileNumber,
  onSuccess,
  onBack
}) => {
  const router = useRouter();
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [unresolvedError, setUnresolvedError] = useState(false);

  // Dynamic Server Resolved States
  const [isCompleted, setIsCompleted] = useState(false);
  const [isUnderReview, setIsUnderReview] = useState(false);
  const [resumeState, setResumeState] = useState<ResumeStateInfo | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = clean;
    setOtpDigits(updated);
    setErrorMsg("");

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);
    const nextFocus = Math.min(pasted.length, 5);
    inputRefs.current[nextFocus]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otpDigits.join("");
    if (otpValue.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP.");
      return;
    }
    if (attemptsLeft <= 0) {
      setErrorMsg("Maximum attempts exceeded. Please request a new OTP.");
      return;
    }

    setErrorMsg("");
    setUnresolvedError(false);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/onboarding/verify-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, otp_code: otpValue })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        // STATE 1: EXISTING INCOMPLETE ONBOARDING (RESUME DIRECTLY)
        if (data.flow === "RESUME_ONBOARDING") {
          setResumeState({
            currentStep: data.current_step || 3,
            nextStep: data.next_step || data.current_step || 3,
            totalSteps: data.total_steps || 13,
            completedCount: data.completed_count || 1,
            completionPercent: data.completion_percent || 8,
            currentStepName: data.current_step_name || "Email Address",
            nextRoute: data.next_route || "/register/email",
            message: data.message || "Welcome back! Let's continue your registration from where you left off."
          });
          return;
        }

        // STATE 2: ONBOARDING COMPLETED, UNDER COMPLIANCE REVIEW
        if (data.flow === "ACCOUNT_UNDER_REVIEW" || data.state === "ONBOARDING_COMPLETED_PENDING_APPROVAL") {
          setIsUnderReview(true);
          return;
        }

        // STATE 3: FULLY APPROVED & ACTIVE RETAILER
        if (data.flow === "LOGIN" || data.state === "APPROVED_ACTIVE") {
          setIsCompleted(true);
          return;
        }

        // STATE 4: BRAND NEW USER (Progress to Step 3)
        onSuccess(data.next_route || "/register/email", data.current_step || 3);
      } else {
        setAttemptsLeft((prev) => prev - 1);
        setErrorMsg(data.message || data.detail || `Invalid OTP. ${attemptsLeft - 1} attempt(s) remaining.`);
      }
    } catch {
      setLoading(false);
      setErrorMsg("We couldn't verify your OTP. Please check your network and try again.");
      setUnresolvedError(true);
    }
  };

  const handleResend = async () => {
    if (!mobileNumber) return;
    setLoading(true);
    setErrorMsg("");
    setUnresolvedError(false);
    try {
      await fetch("/api/v1/onboarding/check-mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: mobileNumber })
      });
      setLoading(false);
      setCountdown(60);
      setAttemptsLeft(5);
      setErrorMsg("");
      setOtpDigits(["", "", "", "", "", ""]);
    } catch {
      setLoading(false);
      setCountdown(60);
      setAttemptsLeft(5);
      setErrorMsg("");
      setOtpDigits(["", "", "", "", "", ""]);
    }
  };

  // ── 1. RESUME REGISTRATION SCREEN (INCOMPLETE ONBOARDING) ──
  if (resumeState) {
    return (
      <div className="space-y-6 select-none text-center py-3">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-xl shadow-blue-500/10">
          <RefreshCw className="w-8 h-8 animate-spin-slow" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Registration In Progress
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            {resumeState.message}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Registered Mobile:</span>
            <span className="text-xs font-black text-slate-900 dark:text-white">+91 {mobileNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Progress:</span>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400">
              {resumeState.completedCount} / {resumeState.totalSteps} steps ({resumeState.completionPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(resumeState.completionPercent, 8)}%` }}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Next Step:</span>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              Step {resumeState.currentStep}: {resumeState.currentStepName}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (resumeState.nextRoute) {
              router.push(resumeState.nextRoute);
            } else {
              onSuccess(undefined, resumeState.currentStep);
            }
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue to Step {resumeState.currentStep}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── 2. ACCOUNT UNDER REVIEW SCREEN ──
  if (isUnderReview) {
    return (
      <div className="space-y-6 select-none text-center py-3">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-xl shadow-blue-500/10">
          <FileText className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Application Under Review
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Your registration is completed and your compliance verification is currently pending admin review.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/retailer/account-under-review")}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>View Application Status</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── 3. APPROVED & ACTIVE SCREEN ──
  if (isCompleted) {
    return (
      <div className="space-y-6 select-none text-center py-3">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Account Active
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Your retailer registration is complete and your account is active. Please login to continue.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/retailer/login")}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Go to Retailer Login</span>
        </button>
      </div>
    );
  }

  // ── 4. OTP INPUT FORM ──
  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Verify Mobile Number
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          OTP dispatched to{" "}
          <span className="font-extrabold text-blue-600 dark:text-blue-400">
            +91 {mobileNumber || "xxxxxxxxxx"}
          </span>
        </p>
      </div>

      {/* WhatsApp Notification Banner */}
      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="text-xs font-extrabold">WhatsApp OTP Sent</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secure Channel</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-5">
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {otpDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 transition-all"
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Attempts remaining: {attemptsLeft}</span>
          {countdown > 0 ? (
            <span>Resend in {countdown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Resend OTP
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || otpDigits.join("").length !== 6}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying OTP...</span>
            </>
          ) : (
            <>
              <span>Verify & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            ← Change Mobile Number
          </button>
        </div>
      </form>
    </div>
  );
};
