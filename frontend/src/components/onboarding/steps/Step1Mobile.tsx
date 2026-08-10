"use client";

import React, { useState } from "react";
import { Phone, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface Step1Props {
  onSuccess: (regId: string, mobile: string, isResumed: boolean, savedStep?: number) => void;
}

export const Step1Mobile: React.FC<Step1Props> = ({ onSuccess }) => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobileNumber.replace(/\D/g, "");
    if (clean.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/onboarding/check-mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: clean })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        if (data.status === "ALREADY_REGISTERED") {
          setErrorMsg("This mobile number is already registered. Please Login or reset your password.");
        } else if (data.status === "RESUME_DRAFT") {
          onSuccess(data.registration_id, clean, true, data.current_step);
        } else {
          onSuccess(data.registration_id, clean, false, undefined);
        }
      } else {
        setErrorMsg(data.detail || "Failed to process mobile number.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Unable to connect to service. Please check your connection.");
    }
  };

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

      <form onSubmit={handleSubmit} className="space-y-4">
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
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Mobile...</span>
            </>
          ) : (
            <>
              <span>Continue & Send WhatsApp OTP</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
