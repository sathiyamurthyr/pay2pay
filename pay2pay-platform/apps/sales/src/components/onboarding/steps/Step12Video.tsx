"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Video,
  Play,
  Square,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Camera,
  RefreshCw,
  UploadCloud
} from "lucide-react";

interface Step12Props {
  registrationId: string;
  merchantName?: string;
  shopName?: string;
  onSuccess: () => void;
  onBack?: () => void;
}

const RECORD_SECS = 15;

export const Step12Video: React.FC<Step12Props> = ({
  registrationId,
  merchantName,
  shopName,
  onSuccess,
  onBack
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<"idle" | "preview" | "recording" | "done" | "error">("idle");
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nameDisplay = merchantName || "YOUR NAME";
  const shopDisplay = shopName || "YOUR BUSINESS";
  const scriptText = `"My name is ${nameDisplay}, and I am onboarding with Pay2Pay for my business ${shopDisplay}."`;

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
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in browser."
          : "Camera error: Could not access video device.";
      setErrorMsg(msg);
      setPhase("error");
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (videoURL) URL.revokeObjectURL(videoURL);
    };
  }, [stopStream, videoURL]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setSeconds(0);

    const mime =
      ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(
        (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
      ) || "";

    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : {});
    mediaRecRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setVideoURL(url);
      stopStream();
      setPhase("done");
    };

    rec.start(250);
    setPhase("recording");

    let count = 0;
    timerRef.current = setInterval(() => {
      count += 1;
      setSeconds(count);
      if (count >= RECORD_SECS) {
        clearInterval(timerRef.current!);
        rec.stop();
      }
    }, 1000);
  }, [stopStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecRef.current && mediaRecRef.current.state === "recording") {
      clearInterval(timerRef.current!);
      mediaRecRef.current.stop();
    }
  }, []);

  const handleRetake = () => {
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoURL(null);
    setVideoBlob(null);
    setSeconds(0);
    openCamera();
  };

  const handleUploadAndProceed = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      if (videoBlob) {
        const formData = new FormData();
        formData.append("registration_id", registrationId);
        formData.append("file", videoBlob, "kyc_selfie_video.webm");
        await fetch("/api/v1/onboarding/upload-video-file", { method: "POST", body: formData }).catch(
          () => {}
        );
      }
      onSuccess();
    } catch {
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 select-none font-sans">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Video IPV Verification
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Record a 15-second in-person verification selfie video while reciting the prompt.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/30 text-[#DC2626] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Script Prompt Card */}
      <div className="p-4 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 space-y-1.5">
        <span className="text-[10px] font-black uppercase text-[#94003A] tracking-wider">
          Recite Clearly into Camera
        </span>
        <p className="text-xs font-extrabold text-[#1F2937] leading-relaxed">
          {scriptText}
        </p>
      </div>

      {/* Camera / Recording Box */}
      <div className="relative rounded-3xl bg-[#111827] overflow-hidden aspect-video border border-[#374151] flex items-center justify-center">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#94003A]/20 border border-[#94003A]/40 flex items-center justify-center">
              <Camera className="w-7 h-7 text-[#EDC11E]" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Camera Access Required</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Click below to enable your camera and microphone</p>
            </div>
            <button
              type="button"
              onClick={openCamera}
              className="px-5 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-black shadow-md cursor-pointer transition-all"
            >
              Enable Camera
            </button>
          </div>
        )}

        {(phase === "preview" || phase === "recording") && (
          <div className="relative w-full h-full">
            <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover -scale-x-100" />
            {phase === "recording" && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#DC2626]/90 text-white text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>REC {seconds}s / {RECORD_SECS}s</span>
              </div>
            )}
          </div>
        )}

        {phase === "done" && videoURL && (
          <video src={videoURL} controls playsInline className="w-full h-full object-cover" />
        )}
      </div>

      {/* Control Action Buttons */}
      <div className="flex items-center gap-3">
        {phase === "preview" && (
          <button
            type="button"
            onClick={startRecording}
            className="w-full py-3.5 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#DC2626]/25"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start 15s Recording</span>
          </button>
        )}

        {phase === "recording" && (
          <button
            type="button"
            onClick={stopRecording}
            className="w-full py-3.5 rounded-2xl bg-[#D97706] hover:bg-[#B45309] text-white text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#D97706]/25"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>Stop Recording</span>
          </button>
        )}

        {phase === "done" && (
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={handleRetake}
              className="px-4 py-3.5 rounded-2xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>
            <button
              type="button"
              onClick={handleUploadAndProceed}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Video...</span>
                </>
              ) : (
                <>
                  <span>Save Video & Continue to Review</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {phase === "idle" && (
          <div className="flex items-center gap-3 w-full">
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
              className="flex-1 py-3.5 rounded-2xl bg-[#1F2937] hover:bg-[#111827] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Skip Video (Optional in Staging)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
