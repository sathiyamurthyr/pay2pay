"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Video, Play, Square, CheckCircle2, ArrowRight,
  Loader2, AlertCircle, Camera, RefreshCw
} from "lucide-react";

interface Step12Props {
  registrationId: string;
  onSuccess: () => void;
}

const RECORD_SECS = 15;

export const Step12Video: React.FC<Step12Props> = ({ registrationId, onSuccess }) => {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const chunksRef   = useRef<BlobPart[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase]       = useState<"idle" | "preview" | "recording" | "done" | "error">("idle");
  const [seconds, setSeconds]   = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoURL, setVideoURL]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  const scriptText = `"My name is Sathiya Murthy, and I am applying for Pay2Pay Retailer Merchant Onboarding for my business Sri Venkateswara Telecom."`;

  // ── Open camera ─────────────────────────────────────────────────────
  const openCamera = useCallback(async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 360 } },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      setPhase("preview");
    } catch (err: any) {
      const msg =
        err?.name === "NotAllowedError"  ? "Camera permission denied. Please allow camera access in your browser." :
        err?.name === "NotFoundError"    ? "No camera found on this device." :
        err?.name === "NotReadableError" ? "Camera is already in use by another app." :
        `Camera error: ${err?.message || err}`;
      setErrorMsg(msg);
      setPhase("error");
    }
  }, []);

  // ── Stop camera stream ───────────────────────────────────────────────
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    stopStream();
    if (timerRef.current) clearInterval(timerRef.current);
    if (videoURL) URL.revokeObjectURL(videoURL);
  }, [stopStream, videoURL]);

  // ── Start recording ──────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setSeconds(0);

    // Pick best supported MIME
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      .find(m => MediaRecorder.isTypeSupported(m)) || "";

    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : {});
    mediaRecRef.current = rec;

    rec.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data); };

    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setVideoURL(url);
      stopStream();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.muted = false;
        videoRef.current.load();
      }
      setPhase("done");
    };

    rec.start(200); // collect every 200ms
    setPhase("recording");

    // Auto-stop after RECORD_SECS
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 1;
      setSeconds(elapsed);
      if (elapsed >= RECORD_SECS) {
        clearInterval(timerRef.current!);
        if (mediaRecRef.current?.state === "recording") {
          mediaRecRef.current.stop();
        }
      }
    }, 1000);
  }, [stopStream]);

  // ── Manual stop ──────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecRef.current?.state === "recording") {
      mediaRecRef.current.stop();
    }
  }, []);

  // ── Retake ───────────────────────────────────────────────────────────
  const retake = useCallback(async () => {
    if (videoURL) { URL.revokeObjectURL(videoURL); setVideoURL(null); }
    setVideoBlob(null);
    setSeconds(0);
    setPhase("idle");
    await openCamera();
  }, [videoURL, openCamera]);

  // ── Submit ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      if (videoBlob) {
        const form = new FormData();
        form.append("registration_id", registrationId);
        form.append("video", videoBlob, "kyc_video.webm");
        form.append("duration_seconds", String(seconds || RECORD_SECS));
        form.append("script_text", scriptText);
        const res = await fetch("/api/v1/onboarding/upload-video-file", { method: "POST", body: form });
        if (!res.ok) throw new Error("upload");
      } else {
        await fetch("/api/v1/onboarding/upload-video", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registration_id: registrationId, video_url: "https://cdn.pay2pay.in/videos/kyc_teleprompter.mp4", duration_seconds: seconds || RECORD_SECS, script_text: scriptText })
        });
      }
    } catch { /* continue regardless */ }
    setLoading(false);
    onSuccess();
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 select-none">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          Live Video Verification
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          Record a {RECORD_SECS}-second liveness video reading the script below.
        </p>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {/* Script card */}
      <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-1">
        <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider">📜 Read Aloud</p>
        <p className="text-xs font-extrabold leading-relaxed text-slate-900 dark:text-white">
          {scriptText}
        </p>
      </div>

      {/* Camera / Video box */}
      <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {/* Video element — used for both live preview AND playback */}
        <video
          ref={videoRef}
          playsInline
          autoPlay={false}
          controls={phase === "done"}
          className={`w-full h-full object-cover ${phase === "idle" || phase === "error" ? "hidden" : "block"}`}
        />

        {/* Overlays */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Camera className="w-10 h-10 opacity-50" />
            <p className="text-xs font-bold">Camera not started</p>
          </div>
        )}

        {phase === "recording" && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/90 text-white text-[10px] font-black">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              REC {seconds}s / {RECORD_SECS}s
            </span>
            {/* Progress bar */}
            <span className="text-[10px] text-white/70 font-bold">
              {RECORD_SECS - seconds}s left
            </span>
          </div>
        )}

        {phase === "recording" && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="h-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-1000"
                style={{ width: `${(seconds / RECORD_SECS) * 100}%` }}
              />
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-black">
              <CheckCircle2 className="w-3 h-3" /> Recorded {seconds}s
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        {phase === "idle" && (
          <button
            onClick={openCamera}
            className="w-full py-3 rounded-2xl bg-blue-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Open Camera
          </button>
        )}

        {phase === "error" && (
          <button
            onClick={openCamera}
            className="w-full py-3 rounded-2xl bg-orange-600 text-white text-sm font-extrabold hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Camera Access
          </button>
        )}

        {phase === "preview" && (
          <button
            onClick={startRecording}
            className="w-full py-3 rounded-2xl bg-red-600 text-white text-sm font-extrabold shadow-lg shadow-red-600/25 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start {RECORD_SECS}s Recording
          </button>
        )}

        {phase === "recording" && (
          <button
            onClick={stopRecording}
            className="w-full py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-extrabold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Square className="w-4 h-4 text-red-400" />
            Stop Recording Early
          </button>
        )}

        {phase === "done" && (
          <div className="flex gap-2">
            <button
              onClick={retake}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold hover:bg-slate-200 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retake
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Uploading…</span></>
              ) : (
                <><span>Save &amp; Final Review</span><ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
