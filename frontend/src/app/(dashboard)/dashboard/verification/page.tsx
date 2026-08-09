"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  UserCheck,
  UploadCloud,
  PhoneCall,
  ArrowLeft,
  Lock,
  Sparkles
} from "lucide-react";
import { VerificationPendingDashboard } from "@/components/dashboard/VerificationPendingDashboard";

export default function TrackVerificationPage() {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const regId = localStorage.getItem("pay2pay_reg_id");
    const mobile = localStorage.getItem("pay2pay_reg_mobile") || localStorage.getItem("pay2pay_user_mobile");
    const queryKey = regId || mobile || "DEMO_RETAILER";

    fetch(`http://localhost:8000/api/v1/onboarding/status/${queryKey}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "SUCCESS") {
          setStatusData(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              Track Application & Verification Status
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs uppercase">
                RBI Verification Portal
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Real-time enterprise retailer compliance tracking</p>
          </div>
        </div>

        <Link
          href="/support"
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Support Chat</span>
        </Link>
      </div>

      {/* Main Verification Status Dashboard */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400">Fetching live verification details...</p>
        </div>
      ) : (
        <VerificationPendingDashboard
          verificationStatus={statusData?.verification_status || "PENDING"}
          applicationRef={statusData?.application_ref || "P2P-REG-2026-889021"}
          adminRemarks={statusData?.admin_remarks}
        />
      )}
    </div>
  );
}
