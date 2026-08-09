"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Lock,
  UploadCloud,
  FileCheck,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

interface OnboardingStatusDashboardProps {
  mobileNumber?: string;
}

export const OnboardingStatusDashboard: React.FC<OnboardingStatusDashboardProps> = ({ mobileNumber }) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    setLoading(true);
    const identifier = mobileNumber || localStorage.getItem("pay2pay_reg_mobile") || "9972334411";
    try {
      const res = await fetch(`http://localhost:8000/api/v1/retailer/verification/status?identifier=${identifier}`);
      const data = await res.json();
      setLoading(false);
      setStatusData(data);
    } catch {
      setLoading(false);
      setStatusData({
        verification_status: "UNDER_REVIEW",
        account_status: "ONBOARDING",
        retailer_status: "UNDER_REVIEW",
        can_transact: false,
        admin_remarks: "Your application has been received and is under compliance verification by Pay2Pay Risk Team.",
        progress: {
          registration: "COMPLETED",
          pan: "VERIFIED",
          gst: "VERIFIED",
          aadhaar: "VERIFIED",
          bank: "VERIFIED",
          documents: "SUBMITTED",
          admin_review: "UNDER_REVIEW",
          approval: "PENDING"
        }
      });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const verifStatus = statusData?.verification_status || "PENDING";
  const remarks = statusData?.admin_remarks || "Verification in progress.";
  const progress = statusData?.progress || {};

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white p-6 sm:p-8 font-sans space-y-6">
      
      {/* Top Banner Status Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-4 relative overflow-hidden ${
        verifStatus === "ON_HOLD"
          ? "bg-gradient-to-r from-amber-950/60 to-slate-900 border-amber-500/30 text-amber-300"
          : verifStatus === "REJECTED"
          ? "bg-gradient-to-r from-red-950/60 to-slate-900 border-red-500/30 text-red-300"
          : "bg-gradient-to-r from-blue-950/60 to-slate-900 border-blue-500/30 text-blue-300"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              {verifStatus === "ON_HOLD" ? (
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              ) : verifStatus === "REJECTED" ? (
                <XCircle className="w-6 h-6 text-red-400" />
              ) : (
                <Clock className="w-6 h-6 text-blue-400 animate-spin" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Application Status: <span className="uppercase">{verifStatus}</span>
              </h1>
              <p className="text-xs font-semibold opacity-80 mt-0.5">
                Estimated Review Time: <span className="font-extrabold underline">Under 60 Minutes</span>
              </p>
            </div>
          </div>

          <button
            onClick={fetchStatus}
            className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center gap-1.5 backdrop-blur-md transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Status Update</span>
          </button>
        </div>

        {/* Admin Remarks Box */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-xs space-y-1">
          <p className="text-[10px] font-black uppercase text-slate-400">Compliance Officer Remarks:</p>
          <p className="font-extrabold text-white text-sm leading-relaxed">"{remarks}"</p>
        </div>

        {/* Resubmit / Upload Button for ON_HOLD or REJECTED */}
        {(verifStatus === "ON_HOLD" || verifStatus === "REJECTED" || verifStatus === "NEED_INFO") && (
          <div className="pt-2">
            <button
              onClick={() => (window.location.href = "/retailers/onboard")}
              className="px-6 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-xl hover:bg-amber-400 transition-all flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Requested Documents & Resubmit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Verification Progress Tracker Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
        <h2 className="text-sm font-black text-white uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-400" />
          Retailer Verification Progress Tracker
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {[
            { step: "Registration", status: progress.registration },
            { step: "PAN Check", status: progress.pan },
            { step: "GSTIN Check", status: progress.gst },
            { step: "Aadhaar eKYC", status: progress.aadhaar },
            { step: "Bank Sync", status: progress.bank },
            { step: "Documents", status: progress.documents },
            { step: "Admin Audit", status: progress.admin_review },
            { step: "Activation", status: progress.approval }
          ].map((item, idx) => {
            const isDone = item.status === "COMPLETED" || item.status === "VERIFIED" || item.status === "APPROVED" || item.status === "SKIPPED";
            const isPending = item.status === "PENDING" || item.status === "UNDER_REVIEW";

            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl border text-center space-y-1 transition-all ${
                  isDone
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : isPending
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-slate-950 flex items-center justify-center mx-auto text-xs font-black">
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : idx + 1}
                </div>
                <p className="text-[11px] font-black text-white truncate">{item.step}</p>
                <p className="text-[9px] font-extrabold uppercase">{item.status}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Control Blocked Modules Overlay Notice */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-400" />
            Financial Transaction Modules (Locked Until Approval)
          </h3>
          <span className="text-xs font-bold text-red-400 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
            HTTP 403 Restricted
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {["Money Transfer (DMT)", "AEPS Cash Withdrawal", "BBPS Bill Payments", "UPI Payments", "Wallet Top-up", "Settlement Payout"].map((mod, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2 opacity-60 pointer-events-none select-none relative">
              <Lock className="w-5 h-5 text-red-400 mx-auto" />
              <p className="text-xs font-extrabold text-slate-300">{mod}</p>
              <p className="text-[10px] text-red-400 font-bold">DISABLED</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
