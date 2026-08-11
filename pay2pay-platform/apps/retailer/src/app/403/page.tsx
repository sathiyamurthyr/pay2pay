"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";

export default function AccessForbiddenPage() {
  const getUserPortalLink = () => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/(?:^|; )p2p_user_role=([^;]*)/);
      const role = match ? decodeURIComponent(match[1]) : "";
      if (role === "ADMIN") return "/admin/dashboard";
      if (role === "DISTRIBUTOR") return "/distributor/dashboard";
      if (role === "SUPER_DISTRIBUTOR") return "/super-distributor/dashboard";
      return "/retailer/dashboard";
    }
    return "/retailer/dashboard";
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/20 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full rounded-3xl bg-slate-900/60 border border-red-500/30 p-8 text-center backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto shadow-xl shadow-red-500/20 animate-pulse">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black tracking-widest uppercase">
            <Lock className="w-3 h-3" />
            <span>HTTP 403 · FORBIDDEN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Role Access Mismatch
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            Your authenticated account role does not have security permission to access this portal route.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={getUserPortalLink()}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to My Authorized Workstation</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
