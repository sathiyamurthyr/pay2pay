"use client";

import React, { useState } from "react";
import { FileText, ArrowRight, Loader2, AlertCircle, Building2, User } from "lucide-react";

interface Step6Props {
  registrationId: string;
  onSuccess: (nextStepNum: number, isBusiness: boolean, panData: any) => void;
}

export const Step6Pan: React.FC<Step6Props> = ({ registrationId, onSuccess }) => {
  const [panNumber, setPanNumber] = useState("ABCPE1234F");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [panResult, setPanResult] = useState<any>(null);

  const cleanPan = panNumber.trim().toUpperCase();
  const isValidFormat = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan);
  const fourthChar = cleanPan.length >= 4 ? cleanPan[3] : "";
  const isIndividual = fourthChar === "P";

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidFormat) {
      setErrorMsg("Please enter a valid 10-character PAN number (e.g. ABCPE1234F).");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/onboarding/verify-pan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, pan_number: cleanPan })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        setPanResult(data);
        setTimeout(() => {
          onSuccess(data.next_step, data.is_business, data);
        }, 1200);
      } else {
        setErrorMsg(data.detail || "PAN verification failed.");
      }
    } catch {
      setLoading(false);
      onSuccess(isIndividual ? 7 : 66, !isIndividual, { pan_number: cleanPan, pan_type: isIndividual ? "INDIVIDUAL" : "COMPANY" });
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Verify Permanent Account Number (PAN)
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Instant Cashfree NSDL Verification & Entity Decision Engine.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Decision Engine Live Indicator */}
      {cleanPan.length >= 4 && (
        <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-colors ${
          isIndividual
            ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
            : "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
        }`}>
          <span className="flex items-center gap-2">
            {isIndividual ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            <span>PAN Entity Type: {isIndividual ? "Individual (P)" : `Business (${fourthChar})`}</span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider">
            {isIndividual ? "Skips GST → Aadhaar" : "Requires GST (Step 6A)"}
          </span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            PAN Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={panNumber}
              onChange={(e) => {
                setPanNumber(e.target.value.toUpperCase());
                setErrorMsg("");
              }}
              placeholder="ABCPE1234F"
              required
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-black uppercase text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {panResult && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold space-y-1">
            <p>✓ Verified Name: {panResult.pan_holder_name}</p>
            <p className="text-[11px] text-emerald-500 font-semibold">Cashfree Status: {panResult.pan_type} VERIFIED</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isValidFormat}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying with NSDL / Cashfree...</span>
            </>
          ) : (
            <>
              <span>Verify PAN & Proceed</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
