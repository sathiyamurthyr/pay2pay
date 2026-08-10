"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, ArrowRight, Clock, PhoneCall } from "lucide-react";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";

export default function RegisterSubmittedPage() {
  const { openContactSupportModal } = useContactSupportModal();

  return (
    <div className="text-center space-y-5 py-4 select-none">
      <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
        <CheckCircle2 className="w-8 h-8 animate-bounce" />
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Application Submitted Successfully!
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
          Your retailer registration application has been created & submitted to Admin Review.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Registration Status:</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-extrabold uppercase">
            SUBMITTED
          </span>
        </div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Verification Status:</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-400 font-extrabold uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" /> PENDING REVIEW
          </span>
        </div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Account Status:</span>
          <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/40 text-blue-700 dark:text-blue-400 font-extrabold uppercase">
            ONBOARDING
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Estimated Approval:</span>
          <span className="font-bold text-slate-900 dark:text-white">Within 2 Hours</span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-left flex items-start gap-2.5 text-xs sm:text-sm">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
          You can now log in to access your <strong className="font-bold text-blue-700 dark:text-blue-300">Verification Dashboard</strong> to track real-time approval progress. Financial transactions will unlock automatically once approved.
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
        <Link
          href="/login"
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
        >
          <span>Sign In to Workstation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => openContactSupportModal()}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
        >
          <PhoneCall className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Contact Pay2Pay Support</span>
        </button>
      </div>
    </div>
  );
}

