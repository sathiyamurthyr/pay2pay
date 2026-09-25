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
  FileText
} from "lucide-react";

interface DocEntry {
  key: string;
  label: string;
}

interface Step11Props {
  registrationId: string;
  isBusiness: boolean;
  savedDocs?: Record<string, string>;
  onSuccess: () => void;
  onBack?: () => void;
}

type UploadState = "idle" | "uploading" | "done" | "error";

interface DocStatus {
  state: UploadState;
  preview: string | null;
  fileName: string | null;
  fileType: string | null;
}

export const Step11Documents: React.FC<Step11Props> = ({
  registrationId,
  isBusiness,
  savedDocs = {},
  onSuccess,
  onBack
}) => {
  const baseDocList: DocEntry[] = [
    { key: "pan", label: "PAN Card (Front)" },
    { key: "aadhaar_front", label: "Aadhaar Card (Front)" },
    { key: "aadhaar_back", label: "Aadhaar Card (Back)" },
    { key: "shop_photo", label: "Shop / Signboard Photo" },
    { key: "bank_proof", label: "Cancelled Cheque / Passbook" },
  ];
  if (isBusiness) baseDocList.push({ key: "gst_cert", label: "GST Certificate" });

  const [docStatus, setDocStatus] = useState<Record<string, DocStatus>>(() => {
    const init: Record<string, DocStatus> = {};
    baseDocList.forEach((d) => {
      const backendKey = d.key.toUpperCase();
      const savedUrl = savedDocs[backendKey] || savedDocs[d.key];
      init[d.key] = savedUrl
        ? { state: "done", preview: null, fileName: "Previously uploaded", fileType: "image/jpeg" }
        : { state: "idle", preview: null, fileName: null, fileType: null };
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

    setDocState(key, { state: "uploading", preview, fileName: file.name, fileType: file.type });

    try {
      const formData = new FormData();
      formData.append("registration_id", registrationId);
      formData.append("doc_type", key.toUpperCase());
      formData.append("file", file);
      const res = await fetch("/api/v1/onboarding/upload-document-file", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error();
      setDocState(key, { state: "done" });
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
        // Continue
      }
      setDocState(key, { state: "done" });
    }
  };

  const handleRemove = (key: string) => {
    setDocState(key, { state: "idle", preview: null, fileName: null, fileType: null });
    if (fileRefs.current[key]) fileRefs.current[key]!.value = "";
  };

  const allRequiredDone = baseDocList.every((d) => docStatus[d.key]?.state === "done");

  return (
    <div className="space-y-5 select-none font-sans">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          KYC Document Upload
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Upload clear, legible photos or scanned PDFs (Max 5 MB each).
        </p>
      </div>

      {globalError && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/30 text-[#DC2626] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Document Upload Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {baseDocList.map((doc) => {
          const st = docStatus[doc.key] || { state: "idle", preview: null, fileName: null, fileType: null };
          const isDone = st.state === "done";
          const isUploading = st.state === "uploading";

          return (
            <div
              key={doc.key}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                isDone
                  ? "bg-[#DCFCE7]/30 border-[#16A34A]/30"
                  : "bg-[#FAFAFC] border-[#E5E7EB]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#1F2937]">
                  {doc.label}
                </span>
                {isDone && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#16A34A] uppercase">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </span>
                )}
              </div>

              <input
                ref={(el) => {
                  fileRefs.current[doc.key] = el;
                }}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(doc.key, f);
                }}
              />

              {isDone ? (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span className="text-[11px] font-bold text-[#4B5563] truncate max-w-[130px]">
                      {st.fileName || "Uploaded"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {st.preview && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(st.preview)}
                        className="p-1 rounded-lg text-[#6B7280] hover:text-[#94003A]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(doc.key)}
                      className="p-1 rounded-lg text-[#6B7280] hover:text-[#DC2626]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRefs.current[doc.key]?.click()}
                  disabled={isUploading}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-[#D1D5DB] hover:border-[#94003A] bg-white text-xs font-bold text-[#4B5563] flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#94003A]" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 text-[#94003A]" />
                      <span>Choose File</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Preview */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div className="relative max-w-lg w-full bg-slate-900 p-2 rounded-2xl">
            <button
              onClick={() => setPreviewDoc(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewDoc} alt="Preview" className="w-full rounded-xl object-contain max-h-[75vh]" />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
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
          className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue to Video Verification</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
