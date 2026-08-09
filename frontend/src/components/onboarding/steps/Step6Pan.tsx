"use client";

import React, { useState } from "react";
import {
  FileText,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Building2,
  RefreshCw,
  ShieldCheck
} from "lucide-react";

interface Step6Props {
  registrationId: string;
  onSuccess: (nextStepNum: number, isBusiness: boolean, panData: any) => void;
}

export const Step6Pan: React.FC<Step6Props> = ({ registrationId, onSuccess }) => {
  const [panNumber, setPanNumber] = useState("DAQPS8535F");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [panData, setPanData] = useState<any>(null);

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
      setErrorMsg("Unable to connect to PAN verification service. Please check your connection.");
    }
  };

  const handleConfirmNext = () => {
    if (panData) {
      onSuccess(panData.next_step, panData.is_business, panData);
    } else {
      onSuccess(isIndividual ? 7 : 66, !isIndividual, { pan_number: cleanPan });
    }
  };

  const registeredName = panData?.registered_name || panData?.name_pan_card || panData?.pan_holder_name || "SATHIYA MURTHY";
  const panCode = panData?.pan || panData?.pan_number || cleanPan;
  const panType = panData?.type || panData?.pan_type || (isIndividual ? "Individual" : "Company");
  const aadhaarDesc = panData?.aadhaar_seeding_status_desc || "Linked to Aadhaar";
  const panStatus = panData?.pan_status || "Valid & Active";

  return (
    <div className="space-y-6 select-none relative">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Verify PAN Details
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Instant NSDL Permanent Account Number Verification
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Before Verification: Show Clean PAN Input Form */}
      {!panData ? (
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
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isValidFormat}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying PAN...</span>
              </>
            ) : (
              <>
                <span>Verify PAN & Proceed</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* After Verification: Minimal Retailer-Focused Screen */
        <div className="space-y-5 animate-fadeIn">
          
          {/* Success Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>✓ PAN Verified Successfully</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Your PAN details have been authenticated with NSDL.</p>
            </div>
          </div>

          {/* Clean 5-Field Retailer Card */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4">
            
            {/* Field 1 & 2: PAN Code & Holder Name */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PAN Holder Name</span>
              <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {registeredName}
              </p>
            </div>

            {/* Grid of 4 attributes */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">PAN Number</span>
                <p className="font-mono font-black text-slate-900 dark:text-white text-sm tracking-widest">{panCode}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Entity Type</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 capitalize">{panType}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">PAN Status</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{panStatus}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Aadhaar Link Status</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="truncate">{aadhaarDesc}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Decision Card */}
          <div className={`p-4 rounded-2xl border text-xs font-bold space-y-1 ${
            panData?.is_business
              ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
              : "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300"
          }`}>
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
              {panData?.is_business ? <Building2 className="w-4 h-4 text-purple-500" /> : <User className="w-4 h-4 text-blue-500" />}
              <span>{panData?.is_business ? "Business PAN detected." : "GST verification is not required."}</span>
            </div>
            <p className="text-xs font-medium opacity-90 leading-relaxed">
              Next Step: {panData?.is_business ? "Proceed to GST Verification" : "Proceed to Aadhaar Verification"}
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPanData(null)}
              className="px-4 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change PAN</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmNext}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
