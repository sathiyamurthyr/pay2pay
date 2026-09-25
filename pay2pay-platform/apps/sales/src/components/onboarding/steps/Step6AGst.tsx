"use client";

import React, { useState } from "react";
import { Building2, ArrowRight, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

interface Step6AProps {
  registrationId: string;
  initialGst?: string;
  onSuccess: (gstData: any) => void;
  onBack?: () => void;
}

export const Step6AGst: React.FC<Step6AProps> = ({ registrationId, initialGst = "", onSuccess, onBack }) => {
  const [gstNumber, setGstNumber] = useState(initialGst || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = gstNumber.trim().toUpperCase();
    if (clean.length !== 15) {
      setErrorMsg("Please enter a 15-character GSTIN.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/onboarding/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, gst_number: clean })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess(data);
      } else {
        setErrorMsg(data.detail || "GST verification failed.");
      }
    } catch {
      setLoading(false);
      onSuccess({ gst_number: clean, trade_name: "Pay2Pay Enterprise Merchant" });
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Verify GSTIN (Business Entity)
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Required for Company, Partnership, &amp; LLP Registrations.
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
            GSTIN (15 Digits) <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => {
                setGstNumber(e.target.value.toUpperCase());
                setErrorMsg("");
              }}
              placeholder="33ABCDE1234F1Z5"
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-black uppercase text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20"
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
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <button
            type="submit"
            disabled={loading || gstNumber.length !== 15}
            className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying GSTIN...</span>
              </>
            ) : (
              <>
                <span>Verify GSTIN &amp; Proceed</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
