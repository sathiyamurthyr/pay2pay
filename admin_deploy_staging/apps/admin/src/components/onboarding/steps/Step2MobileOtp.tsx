"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowRight, Loader2, AlertCircle, RefreshCw, CheckCircle2, LogIn, RotateCcw } from "lucide-react";

interface Step2Props {
  registrationId: string;
  mobileNumber: string;
  onSuccess: (targetRoute?: string, targetStep?: number) => void;
}

export const Step2MobileOtp: React.FC<Step2Props> = ({ registrationId, mobileNumber, onSuccess }) => {
  const router = useRouter();
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // 4 Business Case States
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedMessage, setCompletedMessage] = useState("");
  const [resumeState, setResumeState] = useState<{ currentStep: number; nextRoute: string; message: string } | null>(null);
  const [unresolvedError, setUnresolvedError] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const otpValue = otpDigits.join("");

  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    setErrorMsg("");
    setUnresolvedError(false);
    if (digit && index < 5) {
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
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const digits = text.split("").concat(Array(6).fill("")).slice(0, 6);
    setOtpDigits(digits);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setLoading(false);

      if (res.ok) {
        const data = await res.json();
        if (data.status === "SUCCESS") {
          // CASE 2 — MOBILE EXISTS + ONBOARDING COMPLETED
          if (data.onboarding_completed === true) {
            setIsCompleted(true);
            setCompletedMessage(data.message || "This mobile number is already registered.");
            return;
          }

          // CASE 3 & 4 — MOBILE EXISTS + ONBOARDING INCOMPLETE (RESUME)
          if (data.is_existing === true && data.onboarding_completed === false) {
            setResumeState({
              currentStep: data.current_step || 3,
              nextRoute: data.next_route || "/register/email",
              message: data.message || "Welcome back! Let's continue your registration."
            });
            return;
          }

          // CASE 1 — BRAND NEW USER
          onSuccess(data.next_route, data.current_step);
        } else {
          setAttemptsLeft((prev) => prev - 1);
          setErrorMsg(data.message || data.detail || `Invalid OTP. ${attemptsLeft - 1} attempt(s) remaining.`);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMsg(errJson.detail || errJson.message || "We couldn't determine your registration status. Please try again.");
        setUnresolvedError(true);
      }
    } catch {
      setLoading(false);
      setErrorMsg("We couldn't determine your registration status. Please try again.");
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

  // ── CASE 2 RENDERING: MOBILE EXISTS + ONBOARDING COMPLETED ──
  if (isCompleted) {
    return (
      <div className="space-y-6 select-none text-center py-4">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            This mobile number is already registered.
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
      </div>
    );
  }

  // ── CASE 3 & 4 RENDERING: MOBILE EXISTS + ONBOARDING INCOMPLETE (RESUME) ──
  if (resumeState) {
    return (
      <div className="space-y-6 select-none text-center py-4">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-xl shadow-blue-500/10">
          <RefreshCw className="w-8 h-8 animate-spin-slow" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome Back!
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            {resumeState.message || "Let's continue your registration."}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Mobile Number:</span>
            <span className="text-xs font-black text-slate-900 dark:text-white">+91 {mobileNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Current Step:</span>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400">Step {resumeState.currentStep}</span>
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
          <span>Continue Registration</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

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

      {/* ── Live WhatsApp Notification Banner ── */}
      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Live WhatsApp OTP Dispatched
            </p>
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Check WhatsApp messages on +91 {mobileNumber} or use master code <span className="font-extrabold cursor-pointer underline text-emerald-600 dark:text-emerald-400" onClick={() => setOtpDigits(["7", "7", "8", "8", "9", "9"])}>778899</span>
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {unresolvedError && (
            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setUnresolvedError(false);
              }}
              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 rounded-lg text-[11px] font-extrabold flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        {/* 6-Digit OTP Box Matrix */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 text-center">
            Enter 6-Digit OTP <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`text-center text-xl font-black rounded-xl border-2 transition-all focus:outline-none
                  ${digit
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  }
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                style={{ width: 44, height: 52 }}
              />
            ))}
          </div>
        </div>

        {/* Attempts & Resend */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>
            Attempts:{" "}
            <strong className="text-amber-500">{attemptsLeft}/5</strong>
          </span>
          {countdown > 0 ? (
            <span>
              Resend in <strong className="text-blue-500">{countdown}s</strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Resend WhatsApp OTP</span>
            </button>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || otpValue.length !== 6}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying OTP...</span>
            </>
          ) : (
            <>
              <span>Verify & Save Progress</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

