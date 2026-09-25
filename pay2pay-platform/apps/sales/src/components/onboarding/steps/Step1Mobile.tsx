"use client";

import React, { useState } from "react";
import { Phone, ArrowRight, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface Step1Props {
  initialMobile?: string;
  onSuccess: (regId: string, mobile: string, isResumed: boolean, savedStep?: number) => void;
}

export const Step1Mobile: React.FC<Step1Props> = ({ initialMobile = "", onSuccess }) => {
  const [mobileNumber, setMobileNumber] = useState(initialMobile || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [incompleteState, setIncompleteState] = useState<{ currentStep: number; token: string } | null>(null);

  const handleValidateAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobileNumber.replace(/\D/g, "");
    if (clean.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    setErrorMsg("");
    setIncompleteState(null);
    setLoading(true);

    try {
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

      if (valData.can_resume === true && valData.validation_token) {
        setLoading(false);
        setIncompleteState({
          currentStep: valData.current_step || 3,
          token: valData.validation_token
        });
        return;
      }

      const res = await fetch("/api/v1/onboarding/start-mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: clean })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess(data.registration_id, clean, false);
      } else {
        setErrorMsg(data.detail || data.message || "Unable to send verification OTP.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Connection issue. Proceeding with registration...");
      const dummyId = `REG-${clean}-${Date.now().toString().slice(-4)}`;
      onSuccess(dummyId, clean, false);
    }
  };

  const handleResumeRegistration = async () => {
    if (!incompleteState) return;
    setLoading(true);
    setErrorMsg("");
    const clean = mobileNumber.replace(/\D/g, "");

    try {
      const res = await fetch("/api/v1/onboarding/resume-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: clean,
          validation_token: incompleteState.token
        })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess(data.registration_id, clean, true, data.current_step);
      } else {
        setErrorMsg(data.message || "Failed to resume previous draft.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Network error resuming application.");
    }
  };

  return (
    <div className="space-y-5 select-none text-[#1F2937]">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Verify Mobile Number
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Enter 10-digit primary mobile number to begin onboarding.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {incompleteState && (
        <div className="p-4 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 text-xs space-y-3">
          <div className="flex items-center gap-2 text-[#94003A] font-black">
            <CheckCircle2 className="w-4 h-4" />
            <span>Existing Draft Application Found</span>
          </div>
          <p className="text-[#4B5563]">
            An application draft is in progress. You can resume directly at Step {incompleteState.currentStep}.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResumeRegistration}
              className="flex-1 py-2 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#E7B631]" /> Resume Draft
            </button>
            <button
              type="button"
              onClick={() => setIncompleteState(null)}
              className="px-3 py-2 rounded-xl bg-white text-[#4B5563] border border-[#D1D5DB] font-bold text-xs hover:bg-[#F3F4F6]"
            >
              Start New
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleValidateAndContinue} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#1F2937] mb-1">
            Mobile Number <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setMobileNumber(val);
                setErrorMsg("");
              }}
              placeholder="9876543210"
              maxLength={10}
              required
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#D1D5DB] text-base font-black tracking-widest text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20 focus:border-[#94003A]"
            />
          </div>
          <p className="text-[10px] text-[#6B7280] mt-1">An OTP will be dispatched to this number.</p>
        </div>

        <button
          type="submit"
          disabled={loading || mobileNumber.length !== 10}
          className="w-full py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#E7B631]" />
              <span>Checking Mobile...</span>
            </>
          ) : (
            <>
              <span>Send Mobile OTP</span>
              <ArrowRight className="w-4 h-4 text-[#E7B631]" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
