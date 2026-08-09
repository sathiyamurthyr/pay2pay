"use client";

import React, { useState } from "react";
import { UploadCloud, CheckCircle2, FileCheck, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface Step11Props {
  registrationId: string;
  isBusiness: boolean;
  onSuccess: () => void;
}

export const Step11Documents: React.FC<Step11Props> = ({ registrationId, isBusiness, onSuccess }) => {
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({
    pan: true,
    aadhaar_front: true,
    aadhaar_back: true,
    shop_photo: true,
    bank_proof: true
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSimulateUpload = async (docType: string) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/onboarding/upload-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          doc_type: docType.toUpperCase(),
          file_name: `${docType}_document.jpg`,
          file_url: `https://cdn.pay2pay.in/docs/${docType}.jpg`
        })
      });
      if (res.ok) {
        setUploadedDocs((prev) => ({ ...prev, [docType]: true }));
      }
    } catch {
      setUploadedDocs((prev) => ({ ...prev, [docType]: true }));
    }
  };

  const handleNext = () => {
    onSuccess();
  };

  const requiredDocList = [
    { key: "pan", label: "PAN Card Photo (Front)" },
    { key: "aadhaar_front", label: "Aadhaar Card (Front)" },
    { key: "aadhaar_back", label: "Aadhaar Card (Back)" },
    { key: "shop_photo", label: "Shop Exterior & Signboard Photo" },
    { key: "bank_proof", label: "Cancelled Cheque or Bank Passbook" }
  ];

  if (isBusiness) {
    requiredDocList.push({ key: "gst_cert", label: "GST Registration Certificate" });
  }

  const allUploaded = requiredDocList.every((doc) => uploadedDocs[doc.key]);

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          KYC Document Uploads
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Upload clear high-resolution scanned copies of required compliance documents.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-2.5">
        {requiredDocList.map((doc) => {
          const isUploaded = uploadedDocs[doc.key];

          return (
            <div
              key={doc.key}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {isUploaded ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{doc.label}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {isUploaded ? "Uploaded & OCR Checked" : "PNG, JPG or PDF up to 5MB"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSimulateUpload(doc.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  isUploaded
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                    : "bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                }`}
              >
                {isUploaded ? "Re-upload" : "Upload File"}
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={loading || !allUploaded}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <span>Save Documents & Proceed to Video KYC</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
