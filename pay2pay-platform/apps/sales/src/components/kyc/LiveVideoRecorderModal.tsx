"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Video, Play, Square, RefreshCw, Check, X, Upload, AlertCircle,
  ShieldCheck, Mic, Sparkles, Film
} from "lucide-react";
import apiClient from "@/lib/api";

interface LiveVideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName?: string;
  roleName?: string;
  entityType?: "SD" | "DIST" | "RET";
  onVideoUploaded: (b2Url: string) => void;
}

export default function LiveVideoRecorderModal({
  isOpen,
  onClose,
  entityName = "Merchant",
  roleName = "Distributor",
  entityType = "RET",
  onVideoUploaded,
}: LiveVideoRecorderModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !recordedBlob) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, recordedBlob]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Video camera access error:", err);
      setErrorMsg("Camera or microphone permission not granted. You can upload a recorded video file instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    setErrorMsg(null);

    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setRecordedUrl(url);
        stopCamera();
      };

      recorder.start(500); // 500ms chunk intervals
      setRecording(true);
      setCountdown(10);

      let timeLeft = 10;
      timerRef.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      console.error("Start Recording Error:", err);
      setErrorMsg("Failed to initialize video recording on this device.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleRetake = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRecordedBlob(null);
    startCamera();
  };

  const handleUploadVideo = async () => {
    if (!recordedBlob) return;
    setUploading(true);
    setErrorMsg(null);

    try {
      const filename = `selfie_video_kyc_${Date.now()}.webm`;
      const formData = new FormData();
      formData.append("file", recordedBlob, filename);
      formData.append("doc_type", "VIDEO_KYC");
      formData.append("entity_type", entityType);

      const res = await apiClient.post("/sales/auto-read-doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const b2Url = res.data?.b2_url || res.data?.url || "";
      onVideoUploaded(b2Url);
      onClose();
    } catch (err: any) {
      console.error("Upload Video KYC Error:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to upload Video KYC to B2 Vault. Please retry.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", "VIDEO_KYC");
      formData.append("entity_type", entityType);

      const res = await apiClient.post("/sales/auto-read-doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const b2Url = res.data?.b2_url || res.data?.url || "";
      onVideoUploaded(b2Url);
      onClose();
    } catch (err: any) {
      console.error("Upload File Video Error:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to upload video file. Please retry.");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live Selfie Video KYC Recorder</h3>
              <p className="text-[10px] text-slate-400">Record a short 10-second biometric selfie video</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Prompt Script */}
        <div className="px-4">
          <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <Mic className="w-3.5 h-3.5 text-indigo-400" />
              Please read this prompt clearly during recording:
            </div>
            <p className="font-mono text-[11px] bg-slate-950/80 p-2 rounded-xl text-slate-200 border border-indigo-900/50">
              &quot;My name is {entityName || "Merchant"}, and I am registering as a {roleName} on the Pay2Pay Platform.&quot;
            </p>
          </div>
        </div>

        {/* Camera / Video Player */}
        <div className="px-4">
          <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center">
            {recordedUrl ? (
              <video
                src={recordedUrl}
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : stream ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Recording indicator */}
                {recording && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/90 text-white text-[11px] font-bold animate-pulse shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    RECORDING ({countdown}s)
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center space-y-3">
                <Video className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  {errorMsg || "Initializing live webcam stream..."}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Video File Instead
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="px-4">
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Action Controls */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || recording}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Video
          </button>

          <div className="flex items-center gap-2">
            {!recordedUrl && stream && !recording && (
              <button
                type="button"
                onClick={startRecording}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                Start 10s Recording
              </button>
            )}

            {recording && (
              <button
                type="button"
                onClick={stopRecording}
                className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg"
              >
                <Square className="w-3.5 h-3.5" />
                Stop Recording ({countdown}s)
              </button>
            )}

            {recordedUrl && (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={uploading}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-record
                </button>
                <button
                  type="button"
                  onClick={handleUploadVideo}
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-purple-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Uploading Video to B2...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save & Attach Video KYC
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
