"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import { Users, TrendingUp, DollarSign, Activity } from "lucide-react";

export default function DistDashboardPage() {
  return (
    <AppShell pageTitle="Pay2Pay Distributor Portal — Dashboard" activePath="/dist/dashboard">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Pay2Pay Distributor Portal — Operations</h1>
            <p className="text-xs text-slate-400 mt-1">Real-Time Distribution Network & Liquidity Operations</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
              Role: DIST (Distributor)
            </span>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Territory Network Partners</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-black text-white">128</p>
            <span className="text-[11px] text-emerald-400 font-semibold">+12 active partners</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Daily Distribution Volume</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-black text-white">₹14,85,200</p>
            <span className="text-[11px] text-emerald-400 font-semibold">+18.4% vs yesterday</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Commission Margin</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white">₹32,450</p>
            <span className="text-[11px] text-emerald-400 font-semibold">Real-time margin payout</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Pending Network Activations</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-black text-white">4 Partners</p>
            <span className="text-[11px] text-amber-400 font-semibold">In verification queue</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
