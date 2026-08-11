"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, Clock, ArrowRight, PhoneCall, RefreshCw, CheckCircle2 } from "lucide-react";
import { useRetailerApprovalGuard } from "@/hooks/useRetailerApprovalGuard";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";

interface ApprovalGuardOverlayProps {
  children: React.ReactNode;
  featureName?: string;
}

export const ApprovalGuardOverlay: React.FC<ApprovalGuardOverlayProps> = ({
  children,
  featureName = "Financial & Customer Operations",
}) => {
  const { isApproved, approvalStatus, kycStatus, setApprovalStatus } = useRetailerApprovalGuard();
  const { openContactSupportModal } = useContactSupportModal();

  if (isApproved) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Blurred background preview of the locked component */}
      <div className="aria-hidden:true pointer-events-none select-none opacity-20 blur-sm grayscale max-h-[600px] overflow-hidden">
        {children}
      </div>

      {/* High-Contrast Locked Overlay Box */}
      <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
          {/* Animated Lock Icon Header */}
          <div className="w-16 h-16 bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-amber-500/15">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase mb-2">
              <Clock className="w-3.5 h-3.5" /> Approval Required
            </span>
            <h3 className="text-xl font-black text-white tracking-tight">
              {featureName} Locked
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed mt-2">
              Your account application is currently <strong>PENDING ADMIN APPROVAL</strong>. Transaction features will unlock automatically as soon as Admin completes your KYC verification.
            </p>
          </div>

          {/* Status Breakdown Box */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-400">Account Approval Status:</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold uppercase text-[10px]">
                {approvalStatus}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-400">KYC Verification:</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-extrabold uppercase text-[10px]">
                {kycStatus}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-400">Est. Approval Time:</span>
              <span className="font-bold text-white">Pending Admin Review</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            <div className="flex gap-2">
              <Link
                href="/register/submitted"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-600/20"
              >
                <span>View Application & KYC Status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => openContactSupportModal()}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                <span>Contact Admin Support</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
