"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  Lock,
  FileText,
  AlertTriangle,
  UploadCloud,
  HelpCircle,
  Zap,
  Smartphone,
  CreditCard,
  QrCode,
  TrendingUp,
  Building2,
  PhoneCall,
  UserCheck,
  Calendar,
  FileCheck,
  ShieldCheck,
  Info
} from "lucide-react";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";

interface VerificationPendingProps {
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "ON_HOLD" | "APPROVED" | "REJECTED";
  applicationRef?: string;
  adminRemarks?: string;
  statusMessage?: string;
  companyName?: string;
  companyCode?: string;
  storeName?: string;
}

export const VerificationPendingDashboard: React.FC<VerificationPendingProps> = ({
  verificationStatus = "PENDING",
  applicationRef = "P2P-REG-2026-889021",
  adminRemarks,
  statusMessage,
  companyName,
  companyCode,
  storeName
}) => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const { openContactSupportModal } = useContactSupportModal();

  const TIMELINE_STEPS = [
    { label: "Registration", status: "COMPLETED", date: "Today" },
    { label: "Mobile", status: "VERIFIED", date: "Completed" },
    { label: "Email", status: "VERIFIED", date: "Completed" },
    { label: "PAN", status: "VERIFIED", date: "Verified" },
    { label: "GST", status: "VERIFIED", date: "Verified" },
    { label: "Aadhaar", status: "VERIFIED", date: "eKYC Passed" },
    { label: "Bank", status: "VERIFIED", date: "Penny Drop Passed" },
    { label: "Documents", status: "UPLOADED", date: "Uploaded" },
    { label: "Admin Review", status: verificationStatus === "ON_HOLD" ? "ON_HOLD" : verificationStatus === "REJECTED" ? "REJECTED" : "IN_PROGRESS", date: "Underway" },
    { label: "Approval", status: "WAITING", date: "Pending Final Sign-off" }
  ];

  const LOCKED_SERVICES = [
    { title: "Domestic Money Transfer (DMT)", icon: Zap, route: "/dmt" },
    { title: "AEPS Micro-ATM Cash Out", icon: Smartphone, route: "/aeps" },
    { title: "Card-to-Bank Payout", icon: CreditCard, route: "/card-to-bank" },
    { title: "UPI Dynamic QR 2.0", icon: QrCode, route: "/upi" },
    { title: "Merchant Wallet Withdrawal", icon: TrendingUp, route: "/wallet" },
    { title: "T+0 Instant Settlement", icon: Building2, route: "/settlement" }
  ];

  return (
    <div className="space-y-6 select-none font-sans pb-10">
      
      {/* 1. Top Status Banner - High Contrast Gold & White */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-slate-900 to-amber-600/25 border-2 border-amber-400/50 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/40 text-yellow-300 flex items-center justify-center font-bold shrink-0 shadow-lg shadow-amber-500/20">
            <Clock className="w-6 h-6 animate-spin-slow text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-extrabold text-white flex flex-wrap items-center gap-2">
              <span>{statusMessage || "Your retailer verification is currently under review."}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/25 text-yellow-300 border border-amber-400/50 text-[11px] font-black uppercase tracking-wider">
                {verificationStatus}
              </span>
            </h3>
            <p className="text-xs text-slate-100 font-semibold mt-1">
              Estimated completion: <span className="font-extrabold text-yellow-400 text-sm">2 Hours</span> · Financial services will unlock automatically upon approval.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openContactSupportModal()}
          className="px-4 py-2.5 rounded-xl bg-slate-950/90 border border-amber-400/40 text-yellow-300 hover:text-white font-extrabold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shrink-0 shadow-md hover:border-amber-400 cursor-pointer"
        >
          <PhoneCall className="w-4 h-4 text-yellow-400" />
          <span>Need Help? Contact Support</span>
        </button>
      </div>

      {/* 2. ON HOLD / REJECTED ALERT CARDS */}
      {verificationStatus === "ON_HOLD" && (
        <div className="p-5 rounded-3xl bg-amber-500/15 border-2 border-amber-400/50 text-white space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-base font-black text-yellow-300">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span>Application On Hold</span>
          </div>
          <p className="text-xs font-semibold text-slate-100">
            <strong className="text-yellow-300">Reason:</strong> {adminRemarks || "Missing or blurry document proof. Please re-upload required documents to proceed."}
          </p>
          <button className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg hover:bg-amber-300">
            <UploadCloud className="w-4 h-4" />
            <span>Upload Required Documents</span>
          </button>
        </div>
      )}

      {verificationStatus === "REJECTED" && (
        <div className="p-5 rounded-3xl bg-red-500/15 border-2 border-red-500/50 text-white space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-base font-black text-red-400">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span>Application Rejected</span>
          </div>
          <p className="text-xs font-semibold text-slate-100">
            <strong className="text-red-400">Admin Remarks:</strong> {adminRemarks || "Identity or business address verification failed against government databases."}
          </p>
          <div className="flex gap-2.5">
            <button className="px-4 py-2 rounded-xl bg-red-600 text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-lg">
              <UploadCloud className="w-4 h-4" />
              <span>Reupload Documents & Re-submit</span>
            </button>
            <Link href="/support" className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-extrabold text-xs">
              Appeal Decision
            </Link>
          </div>
        </div>
      )}

      {/* 3. Large Premium Verification Status Card with Connected Company Info */}
      <div className="p-6 rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-yellow-400/90 block mb-0.5">Application Reference ID</span>
            <h2 className="text-xl font-black text-white font-mono tracking-wide">{applicationRef}</h2>
          </div>

          {/* Connected Company & Store Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-1.5 rounded-2xl bg-blue-500/10 border border-blue-400/40 flex items-center gap-2.5 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="text-[9.5px] font-extrabold text-blue-300 uppercase block tracking-wider leading-none">Connected Company</span>
                <span className="text-xs font-black text-white flex items-center gap-1.5 mt-0.5">
                  {companyName || "Platform HQ Enterprise Ltd"}
                  <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9.5px] font-mono">
                    {companyCode || "HQ_COMP"}
                  </span>
                </span>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center gap-2.5 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-yellow-400 flex items-center justify-center font-bold">
                <UserCheck className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <span className="text-[9.5px] font-extrabold text-yellow-400/90 uppercase block tracking-wider leading-none">Outlet / Store</span>
                <span className="text-xs font-black text-white mt-0.5 block">
                  {storeName || "Enterprises"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-bold">
            <div>
              <span className="text-yellow-400/90 block text-[10px] uppercase font-extrabold">Submitted Date</span>
              <span className="text-white flex items-center gap-1.5 font-bold mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Today
              </span>
            </div>
            <div>
              <span className="text-yellow-400/90 block text-[10px] uppercase font-extrabold">Estimated Approval</span>
              <span className="text-emerald-300 flex items-center gap-1.5 font-black mt-0.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> ~2 Hours
              </span>
            </div>
            <div>
              <span className="text-yellow-400/90 block text-[10px] uppercase font-extrabold">Current Status</span>
              <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/60 text-yellow-300 font-extrabold uppercase text-[11px] block mt-0.5">
                {verificationStatus}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Animated Verification Timeline */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-yellow-400 mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-yellow-400" />
            Verification Progress Timeline
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
            {TIMELINE_STEPS.map((step, idx) => {
              const isCompleted = step.status === "COMPLETED" || step.status === "VERIFIED" || step.status === "UPLOADED";
              const isInProgress = step.status === "IN_PROGRESS";
              const isHold = step.status === "ON_HOLD";
              const isRejected = step.status === "REJECTED";

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isCompleted
                      ? "bg-emerald-950/40 border-emerald-400/60 text-emerald-300 shadow-sm"
                      : isInProgress
                      ? "bg-amber-950/60 border-2 border-yellow-400 text-yellow-300 ring-2 ring-yellow-400/40 animate-pulse shadow-lg"
                      : isHold
                      ? "bg-amber-500/20 border-amber-500/60 text-yellow-300"
                      : isRejected
                      ? "bg-red-500/20 border-red-500/60 text-red-400"
                      : "bg-slate-950/80 border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-black">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isInProgress ? (
                      <Clock className="w-4 h-4 text-yellow-400 animate-spin-slow" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <p className="text-[12px] font-extrabold truncate text-white">{step.label}</p>
                  <p className={`text-[9.5px] font-extrabold uppercase tracking-tight mt-0.5 ${
                    isCompleted ? "text-emerald-300" : isInProgress ? "text-yellow-300" : "text-slate-400"
                  }`}>
                    {step.status}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Transaction Control Locks (Financial Services Disabled Tooltips) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-yellow-400" />
            <span>Financial Services Control (Locked Until Approval)</span>
          </h3>
          <span className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-yellow-400" />
            Hover to view activation status
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOCKED_SERVICES.map((srv) => {
            const IconComp = srv.icon;
            return (
              <div
                key={srv.title}
                onMouseEnter={() => setShowTooltip(srv.title)}
                onMouseLeave={() => setShowTooltip(null)}
                className="relative p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between cursor-not-allowed group hover:border-amber-400/60 transition-all shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-yellow-400 flex items-center justify-center font-bold border border-slate-700">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-yellow-200 transition-colors">{srv.title}</h4>
                    <span className="text-[11px] font-extrabold text-yellow-400 flex items-center gap-1 mt-0.5">
                      <Lock className="w-3 h-3 text-yellow-400" /> Restricted
                    </span>
                  </div>
                </div>

                <Lock className="w-4 h-4 text-yellow-400/70 group-hover:text-yellow-400 transition-colors" />

                {/* Hover Tooltip */}
                {showTooltip === srv.title && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-400 text-yellow-300 text-[11px] font-black whitespace-nowrap shadow-2xl z-30">
                    🔒 Available after account approval.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Accessible Operations Quick Links */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-700/80 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Allowed & Active Features</h4>
          <p className="text-[11px] font-semibold text-slate-200 mt-0.5">Manage account preferences while waiting for verification.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link href="/dashboard/verification" className="px-3.5 py-2 rounded-xl bg-blue-600/30 border border-blue-400/50 text-blue-300 hover:text-white font-extrabold text-xs flex items-center gap-1.5 hover:bg-blue-600/40 transition-all">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Track Verification
          </Link>
          <Link href="/profile" className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white font-bold text-xs hover:text-yellow-300 hover:border-amber-400/40 transition-all">
            Profile & Documents
          </Link>
          <Link href="/notifications" className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white font-bold text-xs hover:text-yellow-300 hover:border-amber-400/40 transition-all">
            Notifications
          </Link>
          <Link href="/settings" className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white font-bold text-xs hover:text-yellow-300 hover:border-amber-400/40 transition-all">
            Security Settings
          </Link>
        </div>
      </div>
    </div>
  );
};
