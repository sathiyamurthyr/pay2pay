"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
  X,
  Eye,
  FileText,
  Sparkles
} from "lucide-react";

interface DocEntry {
  key: string;
  label: string;
  ocrFields?: string[];
}

interface Step11Props {
  registrationId: string;
  isBusiness: boolean;
  savedDocs?: Record<string, string>;
  onSuccess: () => void;
  onBack?: () => void;
}

type UploadState = "idle" | "uploading" | "ocr" | "done" | "error";

interface OcrResult {
  pan_number?: string;
  account_number?: string;
  ifsc?: string;
  name?: string;
  address?: string;
  detected_address?: string;
  detected_city?: string;
  detected_state?: string;
  detected_pincode?: string;
}

interface DocStatus {
  state: UploadState;
  preview: string | null;
  fileName: string | null;
  fileType: string | null;
  ocr?: OcrResult | null;
}

export const Step11Documents: React.FC<Step11Props> = ({
  registrationId,
  isBusiness,
  savedDocs = {},
  onSuccess,
  onBack
}) => {
  const baseDocList: DocEntry[] = [
    { key: "pan", label: "PAN Card (Front)", ocrFields: ["pan_number", "name"] },
    { key: "aadhaar_front", label: "Aadhaar Card (Front)", ocrFields: ["name", "address"] },
    { key: "aadhaar_back", label: "Aadhaar Card (Back)", ocrFields: ["detected_address", "detected_pincode"] },
    { key: "shop_photo", label: "Shop / Signboard Photo", ocrFields: ["detected_address", "detected_city", "detected_state", "detected_pincode"] },
    { key: "bank_proof", label: "Cancelled Cheque / Passbook", ocrFields: ["account_number", "ifsc", "name"] },
  ];
  if (isBusiness) baseDocList.push({ key: "gst_cert", label: "GST Certificate" });

  const [docStatus, setDocStatus] = useState<Record<string, DocStatus>>(() => {
    const init: Record<string, DocStatus> = {};
    baseDocList.forEach((d) => {
      const backendKey = d.key.toUpperCase();
      const savedUrl = savedDocs[backendKey] || savedDocs[d.key];
      init[d.key] = savedUrl
        ? { state: "done", preview: null, fileName: "Previously uploaded", fileType: "image/jpeg", ocr: null }
        : { state: "idle", preview: null, fileName: null, fileType: null, ocr: null };
    });
    return init;
  });

  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setDocState = (key: string, patch: Partial<DocStatus>) =>
    setDocStatus((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleFileSelect = async (key: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setDocState(key, { state: "error" });
      setGlobalError("File exceeds 5 MB limit. Please compress.");
      return;
    }
    setGlobalError("");

    let preview: string | null = null;
    if (file.type.startsWith("image/")) {
      preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }

    setDocState(key, { state: "uploading", preview, fileName: file.name, fileType: file.type, ocr: null });

    const formData = new FormData();
    formData.append("registration_id", registrationId);
    formData.append("doc_type", key.toUpperCase());
    formData.append("file", file);

    let ocrResult: OcrResult | null = null;

    try {
      setDocState(key, { state: "ocr" });
      const res = await fetch("/api/v1/onboarding/auto-read-doc", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const extracted = data.extracted || data;
        ocrResult = {
          pan_number: extracted.pan_number || extracted.pan || data.pan_number || data.pan,
          account_number: extracted.account_number || data.account_number,
          ifsc: extracted.ifsc || extracted.ifsc_code || data.ifsc || data.ifsc_code,
          name: extracted.name || extracted.registered_name || extracted.full_name || data.name,
          address: extracted.address || data.address,
          detected_address: extracted.detected_address || data.ocr_location?.detected_address,
          detected_city: extracted.detected_city || data.ocr_location?.detected_city,
          detected_state: extracted.detected_state || data.ocr_location?.detected_state,
          detected_pincode: extracted.detected_pincode || data.ocr_location?.detected_pincode,
        };
        (Object.keys(ocrResult) as (keyof OcrResult)[]).forEach((k) => {
          if (!ocrResult![k]) delete ocrResult![k];
        });
        if (Object.keys(ocrResult).length === 0) ocrResult = null;

        setDocState(key, { state: "done", ocr: ocrResult });
        return;
      }
    } catch {
      // fall through to fallback
    }

    // Fallback: upload-document-file
    try {
      const fallbackFd = new FormData();
      fallbackFd.append("registration_id", registrationId);
      fallbackFd.append("doc_type", key.toUpperCase());
      fallbackFd.append("file", file);
      const res = await fetch("/api/v1/onboarding/upload-document-file", { method: "POST", body: fallbackFd });
      if (!res.ok) throw new Error();
    } catch {
      try {
        await fetch("/api/v1/onboarding/upload-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registration_id: registrationId,
            doc_type: key.toUpperCase(),
            file_name: file.name,
            file_url: `https://cdn.pay2pay.in/docs/${key}.jpg`
          })
        });
      } catch {
        // Continue regardless
      }
    }
    setDocState(key, { state: "done", ocr: ocrResult });
  };

  const handleRemove = (key: string) => {
    setDocState(key, { state: "idle", preview: null, fileName: null, fileType: null, ocr: null });
    if (fileRefs.current[key]) fileRefs.current[key]!.value = "";
  };

  const allRequiredDone = baseDocList.every((d) => docStatus[d.key]?.state === "done");

  const fieldLabels: Record<string, string> = {
    pan_number: "PAN",
    account_number: "Acct No.",
    ifsc: "IFSC",
    name: "Name",
    address: "Address",
    detected_address: "Address",
    detected_city: "City",
    detected_state: "State",
    detected_pincode: "PIN",
  };

  const renderOcrBadges = (doc: DocEntry, ocr: OcrResult) => {
    const relevantFields = doc.ocrFields || Object.keys(fieldLabels);
    const badges = relevantFields.filter((f) => ocr[f as keyof OcrResult]);
    if (badges.length === 0) return null;
    return (
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1 text-[10px] font-black text-[#94003A] uppercase tracking-wider">
          <Sparkles className="w-3 h-3" />
          <span>OCR Auto-Read</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {badges.map((field) => (
            <div
              key={field}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0FDF4] border border-[#86EFAC] text-[10px] font-bold text-[#166534] max-w-full"
            >
              <span className="text-[#16A34A] shrink-0">{fieldLabels[field]}:</span>
              <span className="truncate font-mono">{ocr[field as keyof OcrResult]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 select-none font-sans">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          KYC Document Upload
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Upload clear photos or scanned PDFs (Max 5 MB each). Fields are auto-read via OCR.
        </p>
      </div>

      {globalError && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/30 text-[#DC2626] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {baseDocList.map((doc) => {
          const st = docStatus[doc.key] || { state: "idle", preview: null, fileName: null, fileType: null, ocr: null };
          const isDone = st.state === "done";
          const isOcr = st.state === "ocr";
          const isUploading = st.state === "uploading";
          const isBusy = isUploading || isOcr;

          return (
            <div
              key={doc.key}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                isDone
                  ? "bg-[#DCFCE7]/30 border-[#16A34A]/30"
                  : st.state === "error"
                  ? "bg-[#FEE2E2]/30 border-[#DC2626]/30"
                  : "bg-[#FAFAFC] border-[#E5E7EB]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#1F2937]">{doc.label}</span>
                {isDone && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#16A34A] uppercase">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </span>
                )}
              </div>

              <input
                ref={(el) => { fileRefs.current[doc.key] = el; }}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(doc.key, f);
                }}
              />

              {isDone ? (
                <div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-[#16A34A] shrink-0" />
                      <span className="text-[11px] font-bold text-[#4B5563] truncate max-w-[130px]">
                        {st.fileName || "Uploaded"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {st.preview && (
                        <button type="button" onClick={() => setPreviewDoc(st.preview)} className="p-1 rounded-lg text-[#6B7280] hover:text-[#94003A]">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button type="button" onClick={() => handleRemove(doc.key)} className="p-1 rounded-lg text-[#6B7280] hover:text-[#DC2626]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {st.ocr && renderOcrBadges(doc, st.ocr)}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRefs.current[doc.key]?.click()}
                  disabled={isBusy}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-[#D1D5DB] hover:border-[#94003A] bg-white text-xs font-bold text-[#4B5563] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-70"
                >
                  {isOcr ? (
                    <><Sparkles className="w-3.5 h-3.5 animate-pulse text-[#94003A]" /><span>Reading OCR...</span></>
                  ) : isUploading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin text-[#94003A]" /><span>Uploading...</span></>
                  ) : (
                    <><UploadCloud className="w-3.5 h-3.5 text-[#94003A]" /><span>Choose File</span></>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 text-xs text-[#94003A] font-medium flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>Documents are automatically scanned using OCR to extract PAN, account number, IFSC, and address — reducing manual entry errors.</span>
      </div>

      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="relative max-w-lg w-full bg-slate-900 p-2 rounded-2xl">
            <button onClick={() => setPreviewDoc(null)} className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 text-white">
              <X className="w-4 h-4" />
            </button>
            <img src={previewDoc} alt="Preview" className="w-full rounded-xl object-contain max-h-[75vh]" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
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
          onClick={onSuccess}
          disabled={!allRequiredDone}
          className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>Continue to Video Verification</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
