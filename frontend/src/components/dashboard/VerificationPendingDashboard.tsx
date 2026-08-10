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
}

export const VerificationPendingDashboard: React.FC<VerificationPendingProps> = ({
  verificationStatus = "PENDING",
  applicationRef = "P2P-REG-2026-889021",
  adminRemarks
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
      
      {/* 1. Top Status Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-indigo-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5 animate-spin-slow text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Your retailer verification is currently under review.
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                {verificationStatus}
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Estimated completion: <span className="font-extrabold text-amber-400">2 Hours</span> · Financial services will unlock automatically upon approval.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openContactSupportModal()}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-800 transition-colors shrink-0"
        >
          <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
          <span>Need Help? Contact Support</span>
        </button>
      </div>

      {/* 2. ON HOLD / REJECTED ALERT CARDS (Case 5) */}
      {verificationStatus === "ON_HOLD" && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-3">
          <div className="flex items-center gap-2 text-base font-black text-amber-400">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Application On Hold</span>
          </div>
          <p className="text-xs font-medium text-slate-200">
            <strong>Reason:</strong> {adminRemarks || "Missing or blurry document proof. Please re-upload required documents to proceed."}
          </p>
          <button className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg">
            <UploadCloud className="w-4 h-4" />
            <span>Upload Required Documents</span>
          </button>
        </div>
      )}

      {verificationStatus === "REJECTED" && (
        <div className="p-5 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-3">
          <div className="flex items-center gap-2 text-base font-black text-red-400">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span>Application Rejected</span>
          </div>
          <p className="text-xs font-medium text-slate-200">
            <strong>Admin Remarks:</strong> {adminRemarks || "Identity or business address verification failed against government databases."}
          </p>
          <div className="flex gap-2.5">
            <button className="px-4 py-2 rounded-xl bg-red-600 text-white font-extrabold text-xs inline-flex items-center gap-2">
              <UploadCloud className="w-4 h-4" />
              <span>Reupload Documents & Re-submit</span>
            </button>
            <Link href="/support" className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-extrabold text-xs">
              Appeal Decision
            </Link>
          </div>
        </div>
      )}

      {/* 3. Large Premium Verification Status Card */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Application Reference ID</span>
            <h2 className="text-lg font-black text-white font-mono">{applicationRef}</h2>
          </div>

          <div className="flex items-center gap-6 text-xs font-bold">
            <div>
              <span className="text-slate-400 block text-[10px]">Submitted Date</span>
              <span className="text-slate-200 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Today
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Estimated Approval</span>
              <span className="text-emerald-400 flex items-center gap-1 font-black">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> ~2 Hours
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Current Status</span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold uppercase text-[11px]">
                {verificationStatus}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Animated Verification Timeline */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-400" />
            Verification Progress Timeline
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {TIMELINE_STEPS.map((step, idx) => {
              const isCompleted = step.status === "COMPLETED" || step.status === "VERIFIED" || step.status === "UPLOADED";
              const isInProgress = step.status === "IN_PROGRESS";
              const isHold = step.status === "ON_HOLD";
              const isRejected = step.status === "REJECTED";

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    isCompleted
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : isInProgress
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-300 ring-2 ring-amber-500/30 animate-pulse"
                      : isHold
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                      : isRejected
                      ? "bg-red-500/20 border-red-500/50 text-red-400"
                      : "bg-slate-950/60 border-slate-800 text-slate-500"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-black">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isInProgress ? (
                      <Clock className="w-4 h-4 text-amber-400 animate-spin-slow" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                  <p className="text-[11px] font-extrabold truncate text-white">{step.label}</p>
                  <p className="text-[9px] font-semibold opacity-80 uppercase tracking-tight">{step.status}</p>
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
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Financial Services Control (Locked Until Approval)</span>
          </h3>
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-400" />
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
                className="relative p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between opacity-60 cursor-not-allowed group hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">{srv.title}</h4>
                    <span className="text-[10px] font-extrabold text-amber-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" /> Restricted
                    </span>
                  </div>
                </div>

                <Lock className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />

                {/* Hover Tooltip */}
                {showTooltip === srv.title && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-300 text-[10px] font-black whitespace-nowrap shadow-xl z-30">
                    🔒 Available after account approval.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Accessible Operations Quick Links */}
      <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Allowed & Active Features</h4>
          <p className="text-[11px] font-medium text-slate-400">Manage account preferences while waiting for verification.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/verification" className="px-3.5 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-extrabold text-xs flex items-center gap-1.5 hover:bg-blue-600/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Track Verification
          </Link>
          <Link href="/profile" className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:text-white">
            Profile & Documents
          </Link>
          <Link href="/notifications" className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:text-white">
            Notifications
          </Link>
          <Link href="/settings" className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:text-white">
            Security Settings
          </Link>
        </div>
      </div>
    </div>
  );
};
