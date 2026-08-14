"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import { Network, Layers, ShieldCheck, TrendingUp } from "lucide-react";

export default function SDDashboardPage() {
  return (
    <AppShell pageTitle="Pay2Pay SD Portal — Dashboard" activePath="/sd/dashboard">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Pay2Pay SD Portal — Master Console</h1>
            <p className="text-xs text-slate-400 mt-1">Super Distributor Network Oversight & Master Liquidity Allocation</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
              Role: SD (Super Distributor)
            </span>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Assigned Distributors</span>
              <Network className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">24</p>
            <span className="text-[11px] text-emerald-400 font-semibold">Across Active Territories</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Network Volume</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-black text-white">1,480</p>
            <span className="text-[11px] text-emerald-400 font-semibold">+86 this month</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Master Wallet Balance</span>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">₹1,25,00,000</p>
            <span className="text-[11px] text-emerald-400 font-semibold">Instant liquidity allocation</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Gross Monthly Turnover</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-black text-white">₹4.82 Cr</p>
            <span className="text-[11px] text-emerald-400 font-semibold">Verified growth</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
