"use client";

import React, { useState } from "react";
import {
  FileText,
  ArrowRight,
  Loader2,
  AlertCircle,
  Building2,
  User,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Sparkles,
  Calendar,
  Award,
  RefreshCw
} from "lucide-react";

interface Step6Props {
  registrationId: string;
  onSuccess: (nextStepNum: number, isBusiness: boolean, panData: any) => void;
}

export const Step6Pan: React.FC<Step6Props> = ({ registrationId, onSuccess }) => {
  const [panNumber, setPanNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [panData, setPanData] = useState<any>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const cleanPan = panNumber.trim().toUpperCase();
  const isValidFormat = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan);
  const fourthChar = cleanPan.length >= 4 ? cleanPan[3] : "";
  const isIndividual = fourthChar === "P";

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidFormat) {
      setErrorMsg("Please enter a valid 10-character PAN number (e.g. ABCPV1234D).");
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
        setPanData(data);
      } else {
        setErrorMsg(data.detail || "PAN verification failed. Please check the PAN number.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Unable to connect to Cashfree PAN API. Please check your connection and try again.");
    }
  };

  const handleConfirmNext = () => {
    if (panData) {
      onSuccess(panData.next_step, panData.is_business, panData);
    } else {
      onSuccess(isIndividual ? 7 : 66, !isIndividual, { pan_number: cleanPan });
    }
  };

  const handleCopyRef = async () => {
    if (panData?.reference_id) {
      await navigator.clipboard.writeText(String(panData.reference_id));
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const registeredName = panData?.registered_name || panData?.name_pan_card || panData?.pan_holder_name || "VERIFIED PAN HOLDER";
  const panCode = panData?.pan || panData?.pan_number || cleanPan;
  const panType = panData?.type || panData?.pan_type || (isIndividual ? "Individual" : "Company");
  const referenceId = panData?.reference_id ?? "-";
  const nameMatchScore = panData?.name_match_score ?? 100;
  const nameMatchResult = panData?.name_match_result || "MATCH";
  const aadhaarDesc = panData?.aadhaar_seeding_status_desc || "Aadhaar is linked to PAN";
  const lastUpdated = panData?.last_updated_at || "N/A";
  const panStatus = panData?.pan_status || "VALID";

  return (
    <div className="space-y-5 select-none relative">
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

      {/* Before Verification: Show PAN Input Form */}
      {!panData ? (
        <>
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
                  placeholder="ABCPV1234D"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-black uppercase text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isValidFormat}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Calling Cashfree NSDL API...</span>
                </>
              ) : (
                <>
                  <span>Verify PAN & Fetch NSDL Details</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </>
      ) : (
        /* After Verification: Show Verified Details Card Directly Inline on Page (No Modal) */
        <div className="space-y-4 animate-fadeIn">
          {/* Header Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Cashfree NSDL Verified Details
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                    {panStatus}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Income Tax Department NSDL Database Match</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPanData(null)}
              className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Change</span>
            </button>
          </div>

          {/* Registered Name Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-blue-600/15 border border-blue-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-blue-500 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                NSDL Registered Name
              </p>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <Award className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                {nameMatchScore}% ({nameMatchResult})
              </span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {registeredName}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PAN Number</span>
              <p className="font-mono font-black text-slate-900 dark:text-white text-sm tracking-widest">
                {panCode}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Entity Type</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                {panType}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aadhaar Linkage</span>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{aadhaarDesc}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">NSDL Status</span>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{panStatus}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 col-span-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  NSDL Last Updated Date
                </span>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                  {lastUpdated}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-[10px]">
                Verified
              </span>
            </div>
          </div>

          {/* Reference ID Row */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Cashfree NSDL Reference ID</span>
              <span className="font-mono text-slate-800 dark:text-slate-300 text-[11px] font-bold tracking-wider">{referenceId}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyRef}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedRef ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Decision Engine Routing Banner */}
          <div className={`p-4 rounded-2xl border text-xs font-bold space-y-1 ${
            panData?.is_business
              ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
              : "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300"
          }`}>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
              {panData?.is_business ? <Building2 className="w-4 h-4 text-purple-500" /> : <User className="w-4 h-4 text-blue-500" />}
              <span>Entity Decision Engine Route</span>
            </div>
            <p className="text-[11px] font-medium opacity-90 leading-relaxed">
              {panData?.is_business
                ? "Entity classification: Business / Corporate. Mandatory GST Verification (Step 6A) will be initiated next."
                : "Entity classification: Individual (P). GST step is automatically bypassed. Proceeding directly to Aadhaar KYC (Step 7)."
              }
            </p>
          </div>

          {/* Page Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPanData(null)}
              className="px-4 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-verify PAN</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmNext}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Confirm & Proceed to Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};




