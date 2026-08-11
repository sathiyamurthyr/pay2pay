"use client";

import React, { useRef, useState } from "react";
import api from "@/lib/api";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image,
  X,
  Loader2,
} from "lucide-react";

export interface KycDocument {
  doc_type: string;
  label: string;
  required?: boolean;
  accept?: string;
}

interface UploadedFile {
  doc_type: string;
  url: string;
  path: string;
  filename: string;
  size_bytes: number;
}

interface KycUploadProps {
  entityType: "SD" | "DIST" | "RET" | "CMP" | "SERVICE";
  entityId?: string;
  documents: KycDocument[];
  onChange?: (uploads: Record<string, UploadedFile>) => void;
}

export const DEFAULT_SD_DOCS: KycDocument[] = [
  { doc_type: "PAN",          label: "PAN Card",              required: true,  accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "GST",          label: "GST Certificate",       required: true,  accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "ADDRESS_PROOF",label: "Address Proof",         required: true,  accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "BANK_PROOF",   label: "Bank Statement / Passbook", required: true, accept: ".pdf,.jpg,.jpeg,.png" },
];

export const DEFAULT_DIST_DOCS: KycDocument[] = [
  { doc_type: "PAN",          label: "PAN Card",              required: true,  accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "GST",          label: "GST Certificate",       required: false, accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "ADDRESS_PROOF",label: "Address Proof",         required: true,  accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "BANK_PROOF",   label: "Bank Statement / Passbook", required: true, accept: ".pdf,.jpg,.jpeg,.png" },
];

export const DEFAULT_RETAILER_DOCS: KycDocument[] = [
  { doc_type: "PAN",           label: "PAN Card",               required: true,  accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "AADHAAR_FRONT", label: "Aadhaar Front",          required: true,  accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "AADHAAR_BACK",  label: "Aadhaar Back",           required: true,  accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "GST",           label: "GST Certificate",        required: false, accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "BUSINESS_PROOF",label: "Business / Shop Proof",  required: true,  accept: ".pdf,.jpg,.jpeg,.png" },
  { doc_type: "BANK_PROOF",    label: "Bank Statement / Passbook", required: true, accept: ".pdf,.jpg,.jpeg,.png" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="w-4 h-4 text-[#DC2626]" />;
  return <Image className="w-4 h-4 text-[#2563EB]" />;
}

export default function KycUpload({
  entityType,
  entityId,
  documents,
  onChange,
}: KycUploadProps) {
  const [uploads, setUploads] = useState<Record<string, UploadedFile>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    doc_type: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrors((prev) => ({
        ...prev,
        [doc_type]: `File too large (${formatBytes(file.size)}). Max: 10 MB`,
      }));
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        [doc_type]: "Only PDF, JPG, PNG files are allowed.",
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, [doc_type]: "" }));
    setUploading((prev) => ({ ...prev, [doc_type]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity_type", entityType);
      formData.append("doc_type", doc_type);
      if (entityId) formData.append("entity_id", entityId);

      const res = await api.post("/api/v1/upload/kyc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploaded: UploadedFile = res.data.data;
      const next = { ...uploads, [doc_type]: uploaded };
      setUploads(next);
      onChange?.(next);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Upload failed. Try again.";
      setErrors((prev) => ({ ...prev, [doc_type]: msg }));
    } finally {
      setUploading((prev) => ({ ...prev, [doc_type]: false }));
    }
  };

  const removeUpload = (doc_type: string) => {
    const next = { ...uploads };
    delete next[doc_type];
    setUploads(next);
    onChange?.(next);
    // Reset input
    if (refs.current[doc_type]) {
      refs.current[doc_type]!.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="w-4 h-4 text-[#2563EB]" />
        <span className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
          KYC Document Upload
        </span>
        <span className="text-[10px] font-semibold text-[#64748B] ml-1">(PDF / JPG / PNG · Max 10 MB)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {documents.map((doc) => {
          const uploaded = uploads[doc.doc_type];
          const isUploading = uploading[doc.doc_type];
          const error = errors[doc.doc_type];

          return (
            <div
              key={doc.doc_type}
              className={`relative rounded-xl border-2 border-dashed p-3 transition-all ${
                uploaded
                  ? "border-[#16A34A] bg-[#F0FDF4]"
                  : error
                  ? "border-[#DC2626] bg-[#FEF2F2]"
                  : "border-[#E2E8F0] bg-[#FAFBFF] hover:border-[#2563EB] hover:bg-[#EFF6FF]"
              }`}
            >
              {/* Label row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {uploaded ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  ) : error ? (
                    <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#64748B]" />
                  )}
                  <span className="text-[11px] font-extrabold text-[#0F172A]">
                    {doc.label}
                  </span>
                  {doc.required && (
                    <span className="text-[10px] font-bold text-[#DC2626]">*</span>
                  )}
                </div>
                {uploaded && (
                  <button
                    type="button"
                    onClick={() => removeUpload(doc.doc_type)}
                    className="text-[#64748B] hover:text-[#DC2626] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Upload area */}
              {uploaded ? (
                <div className="flex items-center gap-2">
                  <FileIcon filename={uploaded.filename} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#166534] truncate">{uploaded.filename}</p>
                    <p className="text-[10px] text-[#64748B]">{formatBytes(uploaded.size_bytes)}</p>
                  </div>
                </div>
              ) : isUploading ? (
                <div className="flex items-center gap-2 py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                  <span className="text-[11px] font-bold text-[#2563EB]">Uploading to secure storage…</span>
                </div>
              ) : (
                <div
                  className="cursor-pointer"
                  onClick={() => refs.current[doc.doc_type]?.click()}
                >
                  <p className="text-[11px] text-[#64748B] font-medium">
                    Click to upload or drag & drop
                  </p>
                  {error && (
                    <p className="text-[10px] font-bold text-[#DC2626] mt-1">{error}</p>
                  )}
                </div>
              )}

              {/* Hidden file input */}
              <input
                type="file"
                className="hidden"
                accept={doc.accept || ".pdf,.jpg,.jpeg,.png"}
                ref={(el) => { refs.current[doc.doc_type] = el; }}
                onChange={(e) => handleFileChange(e, doc.doc_type)}
              />

              {/* Click overlay when not uploaded */}
              {!uploaded && !isUploading && (
                <div
                  className="absolute inset-0 cursor-pointer rounded-xl"
                  onClick={() => refs.current[doc.doc_type]?.click()}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
