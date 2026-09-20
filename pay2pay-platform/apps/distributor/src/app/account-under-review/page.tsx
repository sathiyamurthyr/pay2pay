"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  RefreshCw,
  LogOut,
  PhoneCall,
  CheckCircle2,
  Clock,
  Building2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { DistributorAPI } from "@/services/distributor-api";
import { fetchAuthoritativeRetailerStatus } from "@/lib/retailer-destination-resolver";

export default function DistributorAccountUnderReviewPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Your distributor partner account verification is currently under review by our administration team."
  );
  const [distributorInfo, setDistributorInfo] = useState<{
    name: string;
    mobile: string;
    ref: string;
    status: string;
  }>({
    name: "Distributor Partner",
    mobile: "",
    ref: "P2P-DIST-2026",
    status: "PENDING"
  });

  const checkStatus = async (showLoading = true) => {
    if (showLoading) setChecking(true);
    try {
      const data = await fetchAuthoritativeRetailerStatus(true);
      if (data) {
        setDistributorInfo({
          name: data.retailer_name || "Distributor Partner",
          mobile: data.registered_mobile || "",
          ref: data.application_reference || "P2P-DIST-2026",
          status: data.verification_status || data.approval_status || "PENDING"
        });

        let dynamicMsg = "";
        if (data.approve_status && data.active_status) {
          dynamicMsg = "Your distributor account is approved and active.";
        } else if (!data.approve_status && data.active_status) {
          dynamicMsg = "Your distributor application approval is currently pending. Please wait for admin approval.";
        } else if (data.approve_status && !data.active_status) {
          dynamicMsg = "Your distributor account is approved but currently inactive. Please wait until your account is activated.";
        } else {
          dynamicMsg = "Your distributor application approval and activation are currently pending review.";
        }
        setStatusMessage(dynamicMsg);

        if (data.approve_status === true && data.active_status === true) {
          router.replace("/dashboard");
          return;
        }
      }
    } catch (err) {
      console.error("Status check error:", err);
    } finally {
      if (showLoading) setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus(false);
    const interval = setInterval(() => checkStatus(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    if (typeof document !== "undefined") {
      const cookieList = ["p2p_access_token", "pay2pay_access_token", "access_token"];
      cookieList.forEach((c) => {
        document.cookie = `${c}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      localStorage.clear();
      sessionStorage.clear();
    }
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg rounded-3xl bg-[#111827]/90 backdrop-blur-2xl border border-amber-500/30 p-6 sm:p-8 shadow-2xl shadow-amber-500/10 text-center space-y-6">
        {/* Animated Brand Logo */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-xl shadow-amber-500/20 animate-pulse">
              <Clock className="w-8 h-8 text-slate-950" />
            </div>
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-400 border-2 border-[#111827] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-slate-950" />
            </span>
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25">
            Partner Verification
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-2 mb-1">
            Application Under Review
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            {statusMessage}
          </p>
        </div>

        {/* Distributor Reference Card */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-left space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Partner Name:</span>
            <strong className="text-white font-semibold">{distributorInfo.name}</strong>
          </div>
          {distributorInfo.mobile && (
            <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
              <span className="text-slate-400">Registered Mobile:</span>
              <strong className="text-amber-300 font-mono">{distributorInfo.mobile}</strong>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
            <span className="text-slate-400">Application Reference:</span>
            <strong className="text-white font-mono">{distributorInfo.ref}</strong>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
            <span className="text-slate-400">Current Status:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {distributorInfo.status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => checkStatus(true)}
            disabled={checking}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking Approval..." : "Check Status Now"}
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href="tel:+918001234567"
              className="py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
              Help Desk
            </a>
            <button
              onClick={handleLogout}
              className="py-2.5 rounded-xl bg-rose-500/[0.08] hover:bg-rose-500/[0.15] border border-rose-500/20 text-xs font-semibold text-rose-400 transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pay2Pay Enterprise Network — Automated Polling Active</span>
        </div>
      </div>
    </div>
  );
}
