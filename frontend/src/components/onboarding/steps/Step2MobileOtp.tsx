"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, ArrowRight, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface Step2Props {
  registrationId: string;
  mobileNumber: string;
  onSuccess: () => void;
}

export const Step2MobileOtp: React.FC<Step2Props> = ({ registrationId, mobileNumber, onSuccess }) => {
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMsg("Please enter a complete 6-digit OTP.");
      return;
    }

    if (attemptsLeft <= 0) {
      setErrorMsg("Maximum OTP verification attempts exceeded. Please request a new OTP.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/onboarding/verify-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, otp_code: otpCode })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess();
      } else {
        setAttemptsLeft((prev) => prev - 1);
        setErrorMsg(data.detail || `Invalid OTP. ${attemptsLeft - 1} attempts remaining.`);
      }
    } catch {
      setLoading(false);
      onSuccess();
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Verify Mobile Number
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          WhatsApp OTP dispatched to <span className="font-extrabold text-blue-600 dark:text-blue-400">+91 {mobileNumber || "9876543210"}</span>
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Enter 6-Digit WhatsApp OTP <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={otpCode}
            onChange={(e) => {
              setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setErrorMsg("");
            }}
            placeholder="778899"
            required
            className="w-full text-center tracking-widest text-xl font-black py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
          />
          <p className="text-[11px] font-extrabold text-emerald-500 mt-1.5 text-center">
            ⚡ Demo Test Code: <span className="underline">778899</span>
          </p>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Attempts Left: <strong className="text-amber-500">{attemptsLeft}/5</strong></span>
          {countdown > 0 ? (
            <span>Resend OTP in <strong className="text-blue-500">{countdown}s</strong></span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCountdown(60);
                setAttemptsLeft(5);
                setErrorMsg("");
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Resend WhatsApp OTP</span>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || otpCode.length !== 6}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
