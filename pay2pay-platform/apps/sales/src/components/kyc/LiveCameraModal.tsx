"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Camera, Upload, X, Check, RefreshCw, AlertCircle, Sparkles, SwitchCamera
} from "lucide-react";
import apiClient from "@/lib/api";

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  docType: "SELFIE" | "SHOP_PHOTO";
  entityType?: "SD" | "DIST" | "RET";
  onCaptured: (b2Url: string) => void;
}

export default function LiveCameraModal({
  isOpen,
  onClose,
  title,
  docType,
  entityType = "RET",
  onCaptured,
}: LiveCameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    docType === "SELFIE" ? "user" : "environment"
  );
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera stream when modal opens
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, capturedImage]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setErrorMsg("Camera access not available or denied. You can upload an image file instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If front selfie camera, mirror image
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleUploadCaptured = async () => {
    if (!capturedImage) return;
    setUploading(true);
    setErrorMsg(null);

    try {
      // Convert base64 to Blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const filename = `${docType.toLowerCase()}_${Date.now()}.jpg`;

      const formData = new FormData();
      formData.append("file", blob, filename);
      formData.append("doc_type", docType);
      formData.append("entity_type", entityType);

      const apiRes = await apiClient.post("/sales/auto-read-doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const b2Url = apiRes.data?.b2_url || apiRes.data?.url || "";
      onCaptured(b2Url);
      onClose();
    } catch (err: any) {
      console.error("Upload Captured Photo Error:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to upload photo to B2 Vault. Please retry.");
    } finally {
      setUploading(false);
    }
  };

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      formData.append("entity_type", entityType);

      const apiRes = await apiClient.post("/sales/auto-read-doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const b2Url = apiRes.data?.b2_url || apiRes.data?.url || "";
      onCaptured(b2Url);
      onClose();
    } catch (err: any) {
      console.error("Direct Upload Error:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to upload file. Please retry.");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-2xl space-y-4 text-[#1F2937]">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F2937]">{title}</h3>
              <p className="text-[10px] text-[#6B7280]">Live Camera Capture & Backblaze B2 Vault Storage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#FAFAFC] hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Feed / Captured View */}
        <div className="px-4">
          <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-[#E5E7EB] flex items-center justify-center">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            ) : stream ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                />
                {docType === "SELFIE" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-44 h-56 rounded-full border-2 border-dashed border-[#E7B631]/80" />
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center space-y-3 bg-[#FAFAFC] w-full h-full flex flex-col items-center justify-center">
                <Camera className="w-10 h-10 text-[#9CA3AF] mx-auto" />
                <p className="text-xs text-[#6B7280]">
                  {errorMsg || "Starting live camera stream..."}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-bold transition shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Photo From Device
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="px-4">
            <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleDirectFileUpload}
        />

        {/* Controls */}
        <div className="p-4 bg-[#FAFAFC] border-t border-[#E5E7EB] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] text-xs font-bold border border-[#D1D5DB] flex items-center gap-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File
          </button>

          <div className="flex items-center gap-2">
            {!capturedImage && stream && (
              <>
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="p-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB] transition"
                  title="Switch Front/Back Camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCapture}
                  className="px-5 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-bold shadow-sm flex items-center gap-2 transition"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
              </>
            )}

            {capturedImage && (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={uploading}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB] text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={handleUploadCaptured}
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50 transition"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving to B2...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Use & Upload to B2 Vault
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
