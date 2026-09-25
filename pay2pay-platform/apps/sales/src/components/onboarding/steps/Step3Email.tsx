"use client";

import React, { useState } from "react";
import { Mail, ArrowRight, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

interface Step3Props {
  registrationId: string;
  initialEmail?: string;
  onSuccess: (email: string) => void;
  onBack?: () => void;
}

export const Step3Email: React.FC<Step3Props> = ({ registrationId, initialEmail = "", onSuccess, onBack }) => {
  const [email, setEmail] = useState(initialEmail || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean.includes("@") || !clean.includes(".")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/onboarding/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, email: clean })
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess(clean);
      } else {
        setErrorMsg(data.message || data.detail || "Failed to dispatch email verification code.");
      }
    } catch {
      setLoading(false);
      onSuccess(clean);
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Verify Email Address
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Provide business email address for statements and communication.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/30 text-[#DC2626] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#4B5563] mb-1">
            Email Address <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMsg("");
              }}
              placeholder="merchant@pay2pay.in"
              required
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-3.5 rounded-2xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Back</span>
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !email.includes("@")}
            className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Email OTP...</span>
              </>
            ) : (
              <>
                <span>Continue &amp; Send Email OTP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
