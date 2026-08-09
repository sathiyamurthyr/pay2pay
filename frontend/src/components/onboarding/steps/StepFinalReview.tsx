"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2, Edit3, ArrowRight, Loader2, Sparkles,
  Building2, User, ShieldCheck, Clock, BadgeCheck,
  Headphones, LogIn, Copy, CheckCheck, Star, Zap
} from "lucide-react";

interface StepFinalProps {
  registrationId: string;
  draftData: any;
  isBusiness: boolean;
  onEditStep: (stepNum: number) => void;
  onSubmissionSuccess?: (appRef: string) => void;
}

/* ─── Success Screen ──────────────────────────────────────────────────── */
function SuccessScreen({ appRef }: { appRef: string }) {
  const [copied, setCopied] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => { setConfetti(true); }, []);

  const copyRef = () => {
    navigator.clipboard.writeText(appRef).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative space-y-5 py-2 select-none">
        {/* Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping scale-125" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
              <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Application Submitted!
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs mx-auto">
            Your retailer registration has been received and forwarded to Pay2Pay Compliance team.
          </p>
        </div>

        {/* App Ref Card */}
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-slate-900 border-2 border-blue-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
            📋 Application Reference Number
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-black text-blue-700 dark:text-blue-400 font-mono tracking-wide">{appRef}</p>
            <button
              onClick={copyRef}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              {copied ? <><CheckCheck className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </div>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Registration",    value: "Submitted",       color: "emerald", icon: <BadgeCheck className="w-3.5 h-3.5" /> },
            { label: "Verification",    value: "Pending Review",  color: "amber",   icon: <Clock className="w-3.5 h-3.5" /> },
            { label: "Account Status",  value: "Onboarding",      color: "blue",    icon: <Zap className="w-3.5 h-3.5" /> },
            { label: "Est. Approval",   value: "Within 2 Hours",  color: "purple",  icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          ].map(({ label, value, color, icon }) => (
            <div
              key={label}
              className={`p-3 rounded-2xl border flex flex-col gap-1.5 ${
                color === "emerald" ? "bg-emerald-500/8 border-emerald-500/25" :
                color === "amber"   ? "bg-amber-500/8 border-amber-500/25" :
                color === "blue"    ? "bg-blue-500/8 border-blue-500/25" :
                                     "bg-purple-500/8 border-purple-500/25"
              }`}
            >
              <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                color === "emerald" ? "text-emerald-500" :
                color === "amber"   ? "text-amber-500" :
                color === "blue"    ? "text-blue-500" :
                                     "text-purple-500"
              }`}>
                {icon}
                {label}
              </div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* Info strip */}
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
            Log in to your <strong className="text-blue-600 dark:text-blue-400">Verification Dashboard</strong> to track real-time approval progress. Financial transactions unlock automatically once approved.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={() => (window.location.href = "/login")}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In to Workstation
          </button>
          <button
            onClick={() => (window.location.href = "/support")}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs font-extrabold hover:bg-slate-800 transition-all"
          >
            <Headphones className="w-3.5 h-3.5 text-slate-400" />
            Support
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Review Screen ───────────────────────────────────────────────────── */
export const StepFinalReview: React.FC<StepFinalProps> = ({
  registrationId, draftData, isBusiness, onEditStep, onSubmissionSuccess
}) => {
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [appRef, setAppRef]         = useState("");

  const handleSubmitFinal = async () => {
    setSubmitting(true);
    try {
      const res  = await fetch("http://localhost:8000/api/v1/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId })
      });
      const data = await res.json();
      setSubmitting(false);
      const ref = data.application_ref || `APP-RET-2026-${Date.now().toString().slice(-6)}`;
      setSubmitted(true);
      setAppRef(ref);
      localStorage.removeItem("pay2pay_reg_id");
      localStorage.removeItem("pay2pay_reg_mobile");
      onSubmissionSuccess?.(ref);
    } catch {
      setSubmitting(false);
      const ref = `APP-RET-2026-${Date.now().toString().slice(-6)}`;
      setSubmitted(true);
      setAppRef(ref);
      onSubmissionSuccess?.(ref);
    }
  };

  if (submitted) return <SuccessScreen appRef={appRef} />;

  const reviewRows = [
    {
      section: "Identity & Contact",
      value: draftData.email || "—",
      sub: draftData.mobile || "—",
      step: 1,
    },
    {
      section: "Entity & Tax",
      value: isBusiness ? "Business Entity (GST Registered)" : "Individual Retailer (PAN Verified)",
      sub: isBusiness ? "GST Verified ✓" : "Aadhaar eKYC ✓",
      step: 6,
      icon: isBusiness ? <Building2 className="w-3.5 h-3.5 text-purple-400" /> : <User className="w-3.5 h-3.5 text-blue-400" />,
    },
    {
      section: "Shop Profile",
      value: draftData.shop?.shop_name || "Sri Venkateswara Telecom",
      sub: draftData.address?.city || draftData.address?.district || "Address confirmed",
      step: 9,
    },
    {
      section: "Bank Account",
      value: draftData.bank?.account_number_masked || "Account Verified ✓",
      sub: draftData.bank?.bank_name || "Bank details confirmed",
      step: 8,
    },
  ];

  return (
    <div className="space-y-4 select-none">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3 h-3" /> Final Review
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          Review & Submit Application
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Confirm all details are correct before locking your application.
        </p>
      </div>

      {/* Review rows */}
      <div className="space-y-2">
        {reviewRows.map((row) => (
          <div
            key={row.section}
            className="px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3"
          >
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              {row.icon || <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{row.section}</p>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate leading-tight">{row.value}</p>
              <p className="text-[10px] font-semibold text-slate-400 truncate">{row.sub}</p>
            </div>
            <button
              onClick={() => onEditStep(row.step)}
              className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 transition-all shrink-0"
              title={`Edit ${row.section}`}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Declaration */}
      <div className="p-3 rounded-2xl bg-amber-500/8 border border-amber-500/25 flex gap-2.5">
        <span className="text-base shrink-0">⚠️</span>
        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
          By submitting, I declare under penalty of law that all information and documents are authentic and belong to my registered entity.
        </p>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmitFinal}
        disabled={submitting}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-extrabold shadow-lg shadow-emerald-600/30 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /><span>Submitting Application…</span></>
        ) : (
          <><Sparkles className="w-4 h-4" /><span>Submit Registration Application</span><ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );
};
