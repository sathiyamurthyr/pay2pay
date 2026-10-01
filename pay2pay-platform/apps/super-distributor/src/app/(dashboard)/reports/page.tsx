"use client";

import React from "react";
import Link from "next/link";
import {
  BarChart3,
  ReceiptText,
  ArrowRight,
  Layers,
  Crown,
} from "lucide-react";

export default function SuperDistributorReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
            Master Distributor Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Network-wide financial analytics, topup reconciliation and audit center.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/[0.08] border border-amber-500/25">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-300">Master Hub</span>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Topup Requests Report */}
        <Link
          href="/reports/topup-requests"
          className="group flex flex-col gap-3 p-5 rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] hover:border-amber-500/30 hover:bg-[#111827] shadow-xl transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-500/10 flex items-center justify-center border border-amber-500/20">
              <ReceiptText className="w-5 h-5 text-amber-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Topup Requests Report</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Network-wide topup allocations, UTR reconciliation, mapped distributors & fee audits.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Live
            </span>
            <span className="text-[10px] text-slate-500">Real-time data via API</span>
          </div>
        </Link>

        {/* Network Overview */}
        <Link
          href="/transactions"
          className="group flex flex-col gap-3 p-5 rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] hover:border-blue-500/30 hover:bg-[#111827] shadow-xl transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-400/20 to-indigo-500/10 flex items-center justify-center border border-blue-500/20">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Transaction Overview</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Network transaction history, service volumes and distributor performance metrics.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Analytics
            </span>
          </div>
        </Link>

        {/* Distributor Network */}
        <Link
          href="/distributors"
          className="group flex flex-col gap-3 p-5 rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] hover:border-emerald-500/30 hover:bg-[#111827] shadow-xl transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-green-500/10 flex items-center justify-center border border-emerald-500/20">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Distributor Network</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              View all mapped distributors, their performance and wallet status across your network.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Network
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
