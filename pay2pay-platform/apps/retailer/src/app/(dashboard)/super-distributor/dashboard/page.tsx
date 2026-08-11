"use client";

import React from "react";
import { Network, Layers, ShieldCheck, TrendingUp } from "lucide-react";

export default function SuperDistributorDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Super Distributor Master Console</h1>
          <p className="text-xs text-slate-400 mt-1">Regional Network Oversight & Master Wallet Liquidity</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold">
            Role: SUPER_DISTRIBUTOR
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Assigned Distributors</span>
            <Network className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-black text-white">24</p>
          <span className="text-[11px] text-emerald-400 font-semibold">Across 4 States</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Total Network Agents</span>
            <Layers className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-black text-white">1,480</p>
          <span className="text-[11px] text-emerald-400 font-semibold">+86 this month</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Master Wallet Liquidity</span>
            <ShieldCheck className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-black text-white">₹1,25,00,000</p>
          <span className="text-[11px] text-emerald-400 font-semibold">Instant credit allocation</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Monthly Gross Volume</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">₹4.82 Cr</p>
          <span className="text-[11px] text-emerald-400 font-semibold">Record volume</span>
        </div>
      </div>
    </div>
  );
}
