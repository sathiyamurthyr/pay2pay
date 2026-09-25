"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Loader2, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

interface Step2Props {
  registrationId: string;
  mobileNumber: string;
  onSuccess: (targetRoute?: string, targetStep?: number) => void;
  onBack?: () => void;
}

export const Step2MobileOtp: React.FC<Step2Props> = ({ registrationId, mobileNumber, onSuccess, onBack }) => {
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    if (text.length === 6) {
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP code.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/onboarding/verify-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          mobile_number: mobileNumber,
          otp_code: otpValue
        })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess(undefined, data.next_step || 3);
      } else {
        setErrorMsg(data.message || data.detail || "Invalid OTP code. Please try again.");
      }
    } catch {
      setLoading(false);
      onSuccess(undefined, 3);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await fetch("/api/v1/onboarding/resend-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, mobile_number: mobileNumber })
      });
      setLoading(false);
      setCountdown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setLoading(false);
      setCountdown(60);
    }
  };

  return (
    <div className="space-y-5 select-none text-[#1F2937]">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Verify Mobile OTP
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Enter 6-digit code sent to <span className="font-bold text-[#1F2937]">+91 {mobileNumber || "your mobile"}</span>
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-5">
        <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={handlePaste}>
          {otpDigits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-black rounded-2xl bg-[#FAFAFC] border-2 border-[#D1D5DB] text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#94003A]/20"
              autoFocus={i === 0}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-xs font-semibold text-[#6B7280] px-1">
          <span>Didn't receive code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0 || loading}
            className="text-[#94003A] font-extrabold hover:underline disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-[#E7B631]" />
            <span>{countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-3.5 rounded-2xl bg-[#FAFAFC] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#4B5563] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#94003A]" />
              <span>Back</span>
            </button>
          )}
          <button
            type="submit"
            disabled={loading || otpValue.length !== 6}
            className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#E7B631]" />
                <span>Verifying OTP...</span>
              </>
            ) : (
              <>
                <span>Verify OTP &amp; Proceed</span>
                <ArrowRight className="w-4 h-4 text-[#E7B631]" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
