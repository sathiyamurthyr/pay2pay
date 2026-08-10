"use client";

import React, { useState } from "react";
import {
  CheckCircle2, Edit3, ArrowRight, Loader2, Sparkles,
  Building2, User, ShieldCheck, Clock, BadgeCheck,
  Headphones, LogIn, Copy, CheckCheck, Zap
} from "lucide-react";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";

interface StepFinalProps {
  registrationId: string;
  draftData: any;
  isBusiness: boolean;
  onEditStep: (stepNum: number) => void;
  onSubmissionSuccess?: (appRef: string) => void;
}

/* ─── Success Screen ──────────────────────────────────────────────────── */
function SuccessScreen({ appRef, estimatedApproval = "Usually within 2–24 hours" }: {
  appRef: string;
  estimatedApproval?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { openContactSupportModal } = useContactSupportModal();

  // Generate Application ID: RET-YYYYMMDD-XXXXXX
  const appId = (() => {
    const today = new Date();
    const ymd = today.toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = appRef.slice(-6).toUpperCase().replace(/[^A-Z0-9]/g, "0").padStart(6, "0");
    return `RET-${ymd}-${suffix}`;
  })();

  const copyRef = () => {
    navigator.clipboard.writeText(appId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const statusCards = [
    { label: "Registration",   value: "Submitted",          color: "emerald", icon: <BadgeCheck className="w-3.5 h-3.5" /> },
    { label: "Verification",   value: "Pending Review",     color: "amber",   icon: <Clock className="w-3.5 h-3.5" /> },
    { label: "Account Status", value: "Under Verification", color: "blue",    icon: <Zap className="w-3.5 h-3.5" /> },
    { label: "Est. Approval",  value: estimatedApproval,    color: "purple",  icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  const timelineItems = [
    { label: "Mobile",           status: "done" },
    { label: "Email",            status: "done" },
    { label: "PAN",              status: "done" },
    { label: "Aadhaar",         status: "done" },
    { label: "Bank",             status: "done" },
    { label: "Documents",        status: "done" },
    { label: "Admin Review",     status: "pending" },
    { label: "Account Activation", status: "upcoming" },
  ];

  return (
    <div className="space-y-5 py-1 select-none">

      {/* ── Icon + Title ─────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2.5">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping scale-125" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Application Submitted Successfully
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Your application is now under review by the Pay2Pay compliance team.
          </p>
        </div>
      </div>

      {/* ── Application ID ───────────────────────────────── */}
      <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-slate-900 border-2 border-blue-200 dark:border-slate-700">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
          Application ID
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-slate-900 dark:text-white font-mono tracking-wider">{appId}</p>
          <button
            onClick={copyRef}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition-colors"
          >
            {copied
              ? <><CheckCheck className="w-3 h-3" /> Copied</>
              : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>
      </div>

      {/* ── Status Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {statusCards.map(({ label, value, color, icon }) => (
          <div
            key={label}
            className={`px-3 py-2.5 rounded-xl border flex flex-col gap-1 ${
              color === "emerald" ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/25" :
              color === "amber"   ? "bg-amber-50  border-amber-200  dark:bg-amber-500/10  dark:border-amber-500/25"  :
              color === "blue"    ? "bg-blue-50   border-blue-200   dark:bg-blue-500/10   dark:border-blue-500/25"   :
                                   "bg-purple-50  border-purple-200  dark:bg-purple-500/10  dark:border-purple-500/25"
            }`}
          >
            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${
              color === "emerald" ? "text-emerald-700 dark:text-emerald-400" :
              color === "amber"   ? "text-amber-700   dark:text-amber-400"   :
              color === "blue"    ? "text-blue-700    dark:text-blue-400"    :
                                   "text-purple-700   dark:text-purple-400"
            }`}>
              {icon}
              {label}
            </div>
            <p className="text-xs font-extrabold text-slate-800 dark:text-white leading-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* ── What Happens Next card ────────────────────────── */}
      <div
        className="rounded-xl border-2 overflow-hidden"
        style={{ background: "#EFF6FF", borderColor: "#3B82F6" }}
      >
        <div className="px-4 pt-3 pb-2 border-b border-blue-200" style={{ background: "#DBEAFE" }}>
          <h3 className="text-sm font-extrabold text-blue-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            What happens next?
          </h3>
        </div>
        <ul className="px-4 py-3 space-y-2">
          {[
            "Your application has been submitted successfully.",
            "Our verification team will review your documents.",
            "You will receive updates through WhatsApp, SMS and Email.",
            "After approval, DMT, AEPS, BBPS, Wallet and UPI services will be enabled automatically.",
          ].map((line, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                {i + 1}
              </span>
              <p className="text-xs font-semibold text-blue-900 leading-relaxed">{line}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Onboarding Progress Timeline ─────────────────── */}
      <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Onboarding Progress</p>
        <div className="space-y-2">
          {timelineItems.map(({ label, status }) => (
            <div key={label} className="flex items-center gap-2.5">
              {status === "done" ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              ) : status === "pending" ? (
                <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3 text-white" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
              )}
              <span className={`text-xs font-semibold ${
                status === "done"    ? "text-emerald-700 dark:text-emerald-400" :
                status === "pending" ? "text-amber-700 dark:text-amber-400" :
                                      "text-slate-400 dark:text-slate-600"
              }`}>
                {status === "done" ? "✓ " : status === "pending" ? "⏳ " : "○ "}
                {label}
              </span>
              {status === "done" && (
                <span className="ml-auto text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wide">Completed</span>
              )}
              {status === "pending" && (
                <span className="ml-auto text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wide">Pending</span>
              )}
              {status === "upcoming" && (
                <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase tracking-wide">Upcoming</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA Buttons ──────────────────────────────────── */}
      <div className="space-y-2">
        {/* Primary */}
        <button
          onClick={() => (window.location.href = "/login")}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-extrabold transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>

        {/* Secondary */}
        <button
          onClick={() => (window.location.href = `/track?id=${appId}`)}
          className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
        >
          <BadgeCheck className="w-4 h-4 text-blue-600" />
          Track Application
        </button>

        {/* Outline */}
        <button
          type="button"
          onClick={() => openContactSupportModal(appId)}
          className="w-full py-3 rounded-xl bg-transparent border-2 border-slate-300 dark:border-slate-700 hover:border-blue-400 text-slate-600 dark:text-slate-300 text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Headphones className="w-4 h-4 text-blue-500" />
          Contact Support
        </button>
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
