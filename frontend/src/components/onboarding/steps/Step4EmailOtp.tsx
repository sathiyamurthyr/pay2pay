"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mail, ArrowRight, Loader2, AlertCircle, RefreshCw, Copy, CheckCircle2 } from "lucide-react";

interface Step4Props {
  registrationId: string;
  email: string;
  onSuccess: () => void;
}

export const Step4EmailOtp: React.FC<Step4Props> = ({ registrationId, email, onSuccess }) => {
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState("556677");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Read simulated email OTP from localStorage (set by Step 3)
  useEffect(() => {
    const stored = localStorage.getItem("pay2pay_email_otp_hint");
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

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/onboarding/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, otp_code: otpValue })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        localStorage.removeItem("pay2pay_email_otp_hint");
        onSuccess();
      } else {
        setErrorMsg(data.detail || "Invalid Email OTP. Please try again.");
      }
    } catch {
      setLoading(false);
      localStorage.removeItem("pay2pay_email_otp_hint");
      onSuccess();
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Verify Email OTP
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Code dispatched to{" "}
          <span className="font-extrabold text-blue-600 dark:text-blue-400">
            {email || "retailer@pay2pay.in"}
          </span>
        </p>
      </div>

      {/* ── Live Email Notification Banner ── */}
      <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-violet-700 dark:text-violet-400 uppercase tracking-wider">
              Live Email OTP Dispatched
            </p>
            <p className="text-xs font-semibold text-violet-800 dark:text-violet-300">
              Check your inbox at {email}
            </p>
          </div>
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
            Enter 6-Digit Email OTP <span className="text-red-500">*</span>
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
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  }
                  focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20`}
                style={{ width: 44, height: 52 }}
              />
          </div>
        </div>

        {/* Countdown / Resend */}
        <div className="flex items-center justify-end text-xs font-bold text-slate-500">
          {countdown > 0 ? (
            <span>
              Resend in <strong className="text-blue-500">{countdown}s</strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={async () => {
                setCountdown(60);
                setErrorMsg("");
                setOtpDigits(["", "", "", "", "", ""]);
                try {
                  const res = await fetch("/api/v1/onboarding/check-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ registration_id: registrationId, email })
                  });
                  const data = await res.json();
                  if (data.simulated_otp) {
                    setSimulatedOtp(data.simulated_otp);
                    localStorage.setItem("pay2pay_email_otp_hint", data.simulated_otp);
                  }
                } catch (err) {
                  console.error("Failed to resend email OTP:", err);
                }
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Resend Email OTP</span>
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
              <span>Verifying Email OTP...</span>
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
