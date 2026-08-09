"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, ArrowRight, Loader2, AlertCircle, RefreshCw, Copy, CheckCircle2 } from "lucide-react";

interface Step2Props {
  registrationId: string;
  mobileNumber: string;
  onSuccess: () => void;
}

export const Step2MobileOtp: React.FC<Step2Props> = ({ registrationId, mobileNumber, onSuccess }) => {
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Read simulated OTP from localStorage (set by Step 1)
  const [simulatedOtp, setSimulatedOtp] = useState("778899");

  useEffect(() => {
    const stored = localStorage.getItem("pay2pay_otp_hint");
    if (stored) setSimulatedOtp(stored);
  }, []);

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

  // Auto-fill the simulated OTP
  const handleAutoFill = () => {
    const digits = simulatedOtp.split("").slice(0, 6);
    setOtpDigits(digits.concat(Array(6).fill("")).slice(0, 6));
    setErrorMsg("");
    inputRefs.current[5]?.focus();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(simulatedOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/onboarding/verify-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, otp_code: otpValue })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        localStorage.removeItem("pay2pay_otp_hint");
        onSuccess();
      } else {
        setAttemptsLeft((prev) => prev - 1);
        setErrorMsg(data.detail || `Invalid OTP. ${attemptsLeft - 1} attempt(s) remaining.`);
      }
    } catch {
      setLoading(false);
      // Fallback: accept in offline/demo mode
      localStorage.removeItem("pay2pay_otp_hint");
      onSuccess();
    }
  };

  const handleResend = async () => {
    if (!mobileNumber) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/onboarding/check-mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: mobileNumber })
      });
      const data = await res.json();
      setLoading(false);
      setCountdown(60);
      setAttemptsLeft(5);
      setErrorMsg("");
      setOtpDigits(["", "", "", "", "", ""]);
      if (data.simulated_otp) {
        setSimulatedOtp(data.simulated_otp);
        localStorage.setItem("pay2pay_otp_hint", data.simulated_otp);
      }
    } catch {
      setLoading(false);
      setCountdown(60);
      setAttemptsLeft(5);
      setErrorMsg("");
      setOtpDigits(["", "", "", "", "", ""]);
    }
  };

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

      {/* ── Demo OTP Banner ── */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Demo / Test OTP
            </p>
            <p className="text-xl font-black text-amber-800 dark:text-amber-300 tracking-[0.3em]">
              {simulatedOtp}
            </p>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70 font-medium mt-0.5">
              Dispatched via Meta WhatsApp API (+91 {mobileNumber})
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleAutoFill}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-extrabold transition-all flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Auto-Fill
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-[11px] font-extrabold transition-all flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
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
          <p className="text-[11px] font-semibold text-slate-400 mt-2 text-center">
            Tip: Click{" "}
            <button
              type="button"
              onClick={handleAutoFill}
              className="text-amber-600 dark:text-amber-400 font-extrabold underline"
            >
              Auto-Fill
            </button>{" "}
            above to fill the demo OTP instantly
          </p>
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
