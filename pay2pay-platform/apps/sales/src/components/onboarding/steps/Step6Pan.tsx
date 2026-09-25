"use client";

import React, { useState } from "react";
import {
  FileText, ArrowRight, ArrowLeft, Loader2, AlertCircle,
  CheckCircle2, User, Building2, RefreshCw, ShieldCheck, Edit3
} from "lucide-react";

interface Step6Props {
  registrationId: string;
  initialPan?: string;
  onSuccess: (nextStepNum: number, isBusiness: boolean, panData: any) => void;
  onBack?: () => void;
}

export const Step6Pan: React.FC<Step6Props> = ({ registrationId, initialPan = "", onSuccess, onBack }) => {
  const [panNumber, setPanNumber] = useState(initialPan || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [panData, setPanData] = useState<any>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

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
      const res = await fetch("/api/v1/onboarding/verify-pan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, pan_number: cleanPan })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        setPanData(data);
        const fetchedName = data?.registered_name || data?.name_pan_card || data?.pan_holder_name || "";
        if (fetchedName) setEditedName(fetchedName);
      } else {
        setErrorMsg(data.detail || "PAN verification failed. Please check the PAN number.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Unable to connect to PAN verification service. Please check your connection.");
    }
  };

  const rawHolderName = editedName || panData?.registered_name || panData?.name_pan_card || panData?.pan_holder_name;
  const registeredName = rawHolderName || "PAN HOLDER";
  const panCode = panData?.pan || panData?.pan_number || cleanPan;
  const panType = panData?.type || panData?.pan_type || (isIndividual ? "Individual" : "Company");
  const aadhaarDesc = panData?.aadhaar_seeding_status_desc || "Linked to Aadhaar";
  const panStatus = panData?.pan_status || "Valid & Active";

  const handleConfirmNext = () => {
    const finalName = (editedName || registeredName).trim();
    const payload = {
      ...panData,
      registered_name: finalName,
      pan_holder_name: finalName,
      retailer_name: finalName,
      name: finalName,
      pan_number: panCode,
    };
    if (panData) {
      onSuccess(panData.next_step || (isIndividual ? 7 : 66), panData.is_business, payload);
    } else {
      onSuccess(isIndividual ? 7 : 66, !isIndividual, payload);
    }
  };

  return (
    <div className="space-y-6 select-none relative">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Verify PAN Details
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Instant NSDL Permanent Account Number Verification
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/30 text-[#DC2626] text-xs font-bold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Screen 1: Clean PAN Input Form */}
      {!panData ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              PAN Number <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={panNumber}
                onChange={(e) => {
                  setPanNumber(e.target.value.toUpperCase());
                  setErrorMsg("");
                }}
                placeholder="ABCPV1234D"
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-black uppercase tracking-widest text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-4 rounded-2xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4 text-[#6B7280]" />
                <span>Back</span>
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !isValidFormat}
              className="flex-1 py-4 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying PAN...</span>
                </>
              ) : (
                <>
                  <span>Verify PAN &amp; Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Screen 2: Verified Screen with Edit Options on all fields */
        <div className="space-y-5 animate-fadeIn">
          {/* Success Banner */}
          <div className="p-4 rounded-2xl bg-[#DCFCE7] border border-[#16A34A]/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A]/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#1F2937] flex items-center gap-1.5">
                <span>✓ PAN Verified Successfully</span>
              </h3>
              <p className="text-xs text-[#4B5563] font-medium">Your PAN details have been authenticated with NSDL.</p>
            </div>
          </div>

          {/* Clean 5-Field Retailer Card with Edit Support */}
          <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-4">
            
            {/* Field 1 & 2: PAN Code & Holder Name */}
            <div className="border-b border-[#E5E7EB] pb-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">PAN Holder / Registered Name</span>
                <button
                  type="button"
                  onClick={() => setIsEditingName(!isEditingName)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#94003A] hover:bg-[#F8E6EE] border border-[#94003A]/20 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isEditingName ? "Save" : "Edit Name"}</span>
                </button>
              </div>
              {isEditingName ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#94003A] text-[#1F2937] text-base font-black tracking-tight focus:outline-none"
                    placeholder="Enter correct name"
                    autoFocus
                  />
                  <p className="text-[10px] text-[#D97706] font-semibold">⚠️ Correct this name if there is any spelling mismatch with your official identity.</p>
                </div>
              ) : (
                <p className="text-lg font-black text-[#1F2937] tracking-tight">
                  {registeredName}
                </p>
              )}
            </div>

            {/* Grid of 4 attributes */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">PAN Number</span>
                  <button
                    type="button"
                    onClick={() => setPanData(null)}
                    className="text-[10px] font-bold text-[#94003A] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Edit3 className="w-2.5 h-2.5" /> Edit
                  </button>
                </div>
                <p className="font-mono font-black text-[#1F2937] text-sm tracking-widest">{panCode}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-0.5">Entity Type</span>
                <p className="font-bold text-[#1F2937] capitalize">{panType}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-0.5">PAN Status</span>
                <p className="font-bold text-[#16A34A] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{panStatus}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-0.5">Aadhaar Link Status</span>
                <p className="font-bold text-[#16A34A] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="truncate">{aadhaarDesc}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Decision Card */}
          <div className="p-4 rounded-2xl border text-xs font-bold space-y-1 bg-[#F8E6EE] border-[#94003A]/20 text-[#94003A]">
            <div className="flex items-center gap-2 text-xs font-black text-[#94003A]">
              {panData?.is_business ? <Building2 className="w-4 h-4 text-[#94003A]" /> : <User className="w-4 h-4 text-[#94003A]" />}
              <span>{panData?.is_business ? "Business PAN detected." : "Individual entity detected."}</span>
            </div>
            <p className="text-xs font-medium opacity-90 leading-relaxed text-[#4B5563]">
              Next Step: {panData?.is_business ? "Proceed to GST Verification" : "Proceed to Aadhaar Verification"}
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
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
              type="button"
              onClick={() => setPanData(null)}
              className="px-4 py-3.5 rounded-2xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change PAN</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmNext}
              className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white font-extrabold text-xs shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
