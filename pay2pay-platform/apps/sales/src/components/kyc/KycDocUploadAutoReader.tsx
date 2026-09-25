"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload, FileText, CheckCircle2, AlertCircle, RefreshCw,
  Eye, Check, Lock, Sparkles, ExternalLink, X, ZoomIn,
  ZoomOut, RotateCw, Download, FileCheck, ShieldAlert
} from "lucide-react";
import apiClient from "@/lib/api";

interface KycDocUploadAutoReaderProps {
  label: string;
  docType: "PAN" | "AADHAAR" | "AADHAAR_FRONT" | "AADHAAR_BACK" | "BANK_CHEQUE" | "GST" | "SHOP_PHOTO" | "SELFIE";
  entityType?: "SD" | "DIST" | "RET";
  description: string;
  currentUrl?: string;
  extractedInfo?: string;
  required?: boolean;
  onExtracted: (extracted: {
    url: string;
    docType: string;
    data: Record<string, any>;
  }) => void;
  onError?: (err: string) => void;
}

export default function KycDocUploadAutoReader({
  label,
  docType,
  entityType = "RET",
  description,
  currentUrl,
  extractedInfo,
  required = false,
  onExtracted,
  onError,
}: KycDocUploadAutoReaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [lastExtractedData, setLastExtractedData] = useState<Record<string, any> | null>(null);
  
  // Full View Lightbox Modal state
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync isPdf state based on URL
  useEffect(() => {
    const url = currentUrl || localPreviewUrl || "";
    if (url.toLowerCase().includes(".pdf")) {
      setIsPdf(true);
    } else {
      setIsPdf(false);
    }
  }, [currentUrl, localPreviewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so selecting same file triggers change again if needed
    e.target.value = "";

    // Size limit: 15MB
    if (file.size > 15 * 1024 * 1024) {
      const err = "File size exceeds 15 MB limit. Please upload a smaller file.";
      setErrorMsg(err);
      if (onError) onError(err);
      return;
    }

    // Set immediate local preview for instant UI feedback
    const isFilePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setIsPdf(isFilePdf);

    if (!isFilePdf) {
      try {
        const objectUrl = URL.createObjectURL(file);
        setLocalPreviewUrl(objectUrl);
      } catch (previewErr) {
        console.warn("Local preview createObjectURL failed:", previewErr);
      }
    } else {
      setLocalPreviewUrl(null);
    }

    setUploading(true);
    setErrorMsg(null);
    setUploadProgress(25);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      formData.append("entity_type", entityType);

      setUploadProgress(60);
      const res = await apiClient.post("/sales/auto-read-doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadProgress(100);
      const result = res.data;
      const b2Url = result.b2_url || result.data?.b2_url || result.url || "";
      const extracted = result.extracted || result.data?.extracted || {};

      setLastExtractedData(extracted);

      // Check if OCR extraction was successful
      if (extracted.is_valid === false || extracted.status === "UNREADABLE") {
        const warningMsg = extracted.message || `OCR could not read ${label}. Please re-upload a clearer image.`;
        setErrorMsg(warningMsg);
        if (onError) onError(warningMsg);
      }

      onExtracted({
        url: b2Url,
        docType: docType,
        data: extracted,
      });
    } catch (err: any) {
      console.error(`[Doc Auto-Read Error - ${docType}]:`, err);
      const msg =
        err.response?.data?.detail ||
        err.message ||
        `Failed to upload and auto-read ${label}. Please upload a clear photo or PDF.`;
      setErrorMsg(msg);
      if (onError) onError(msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const activeMediaUrl = localPreviewUrl || currentUrl;

  const handleOpenFullView = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomLevel(1);
    setRotation(0);
    setFullViewOpen(true);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <>
      {/* Main Upload Card */}
      <div
        className={`p-4 rounded-2xl transition border ${
          currentUrl
            ? "bg-white border-[#86EFAC] shadow-xs"
            : uploading
            ? "bg-[#F8E6EE]/30 border-[#94003A]/50 animate-pulse"
            : "bg-[#FAFAFC] border-[#E5E7EB] hover:border-[#94003A]"
        } flex flex-col justify-between space-y-3.5 text-[#1F2937]`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Header & Status Badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#1F2937] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#94003A]" />
                {label}
                {required && <span className="text-[#DC2626]">*</span>}
              </span>
              {currentUrl ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                  <CheckCircle2 className="w-3 h-3" /> Auto-Bound & Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F8E6EE] text-[#94003A] border border-[#94003A]/20">
                  Auto-Read
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#6B7280] mt-1 leading-snug">{description}</p>
          </div>
        </div>

        {/* Document Thumbnail Preview (when uploaded) */}
        {activeMediaUrl && (
          <div className="relative rounded-xl overflow-hidden border border-[#E5E7EB] bg-[#FAFAFC] group">
            {!isPdf ? (
              <div
                onClick={handleOpenFullView}
                className="relative h-36 w-full bg-[#FAFAFC] flex items-center justify-center cursor-pointer overflow-hidden"
              >
                <img
                  src={activeMediaUrl}
                  alt={label}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                  <span className="text-[10px] font-medium text-white flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    <Eye className="w-3 h-3 text-[#E7B631]" /> Click for Full View
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] px-2 py-0.5 rounded">
                    Encrypted Vault
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={handleOpenFullView}
                className="h-28 w-full bg-[#FAFAFC] flex items-center justify-center p-4 cursor-pointer group-hover:bg-[#F3F4F6] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1F2937]">PDF Document Attached</div>
                    <div className="text-[10px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                      <Eye className="w-3 h-3 text-[#94003A]" /> Click to View Full PDF
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extracted Details Pill */}
        {currentUrl && extractedInfo && (
          <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-[#86EFAC] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
            <div className="text-[11px] text-[#166534] font-medium truncate">
              {extractedInfo}
            </div>
          </div>
        )}

        {/* Uploading Status */}
        {uploading && (
          <div className="p-3 rounded-xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] text-xs flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 animate-spin text-[#94003A] shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-[11px]">Uploading to Vault & Auto-Extracting...</div>
              <div className="text-[10px] text-[#94003A]/80">Scanning optical characters & binding fields</div>
            </div>
          </div>
        )}

        {/* Error / Warning Notice */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Action Buttons & B2 Vault URL */}
        <div className="pt-1 flex items-center justify-between gap-2">
          {currentUrl ? (
            <>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#6B7280] truncate max-w-[200px]">
                <Lock className="w-3 h-3 text-[#16A34A] shrink-0" />
                <span className="truncate">{currentUrl}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenFullView}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] text-[11px] font-semibold border border-[#D1D5DB] transition flex items-center gap-1"
                  title="Open Full View"
                >
                  <Eye className="w-3 h-3 text-[#94003A]" /> Full View
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-2.5 py-1.5 rounded-lg bg-[#F8E6EE] hover:bg-[#94003A] text-[#94003A] hover:text-white text-[11px] font-bold border border-[#94003A]/20 transition flex items-center gap-1 shadow-xs"
                  title="Re-upload new copy"
                >
                  <RefreshCw className="w-3 h-3" /> Re-upload
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-2.5 px-3 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-[#E7B631]" />
              Upload Document (Auto Read & Bind)
            </button>
          )}
        </div>
      </div>

      {/* FULL VIEW LIGHTBOX & DOCUMENT INSPECTION MODAL */}
      {fullViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[92vh] bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-2xl flex flex-col text-[#1F2937]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E5E7EB] bg-[#FAFAFC] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] flex items-center justify-center font-bold">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
                    {label}
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] px-2 py-0.5 rounded-full">
                      Backblaze B2 Vault
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#6B7280]">High-Resolution Document Preview & Extraction Inspector</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Re-upload Button in Modal */}
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setFullViewOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] text-xs font-semibold border border-[#D1D5DB] transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#94003A]" />
                  Re-upload
                </button>

                {/* Open in new tab */}
                {activeMediaUrl && (
                  <a
                    href={activeMediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] border border-[#D1D5DB] transition"
                    title="Open Document in New Tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setFullViewOpen(false)}
                  className="p-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937] border border-[#D1D5DB] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Document Viewer & Controls */}
            <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-[#FAFAFC] relative min-h-[360px]">
              {!isPdf && activeMediaUrl ? (
                <div className="relative flex items-center justify-center max-w-full max-h-[60vh] overflow-auto">
                  <img
                    src={activeMediaUrl}
                    alt={label}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease-out",
                    }}
                    className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-md border border-[#E5E7EB]"
                  />
                </div>
              ) : isPdf && activeMediaUrl ? (
                <div className="w-full h-[55vh] rounded-2xl overflow-hidden border border-[#E5E7EB] bg-white">
                  <iframe
                    src={activeMediaUrl}
                    title={label}
                    className="w-full h-full border-none"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-[#9CA3AF]">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No preview available</p>
                </div>
              )}

              {/* Floating Zoom & Rotate Toolbar (for images) */}
              {!isPdf && activeMediaUrl && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-2xl bg-white border border-[#D1D5DB] shadow-lg backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-[#6B7280] px-1">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-2 py-1 rounded-lg hover:bg-[#F3F4F6] text-[10px] font-bold text-[#4B5563] hover:text-[#1F2937] transition"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                  <div className="w-px h-4 bg-[#E5E7EB] mx-1" />
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] transition"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer: Extracted Metadata Drawer */}
            <div className="p-4 border-t border-[#E5E7EB] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#1F2937] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                  Document Auto-Extracted Values
                </span>
                <span className="text-[10px] font-mono text-[#6B7280] truncate max-w-md">
                  {currentUrl}
                </span>
              </div>

              {extractedInfo ? (
                <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#86EFAC] text-xs text-[#166534] font-mono">
                  {extractedInfo}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#FAFAFC] border border-[#E5E7EB] text-xs text-[#6B7280]">
                  No OCR fields extracted yet. Re-upload a clear copy if details were not auto-bound.
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
