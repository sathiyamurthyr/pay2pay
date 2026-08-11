"use client";

import React from "react";
import { Users, TrendingUp, DollarSign, Activity } from "lucide-react";

export default function DistributorDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Distributor Operations Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time Retailer Network & Commission Management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            Role: DISTRIBUTOR
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Active Retailers</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">128</p>
          <span className="text-[11px] text-emerald-400 font-semibold">+12 this month</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Daily Network Volume</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">₹14,85,200</p>
          <span className="text-[11px] text-emerald-400 font-semibold">+18.4% vs yesterday</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Commission Earned</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">₹32,450</p>
          <span className="text-[11px] text-emerald-400 font-semibold">Real-time margin payout</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Pending Activations</span>
            <TrendingUp className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-black text-white">4 Agents</p>
          <span className="text-[11px] text-amber-400 font-semibold">Awaiting Aadhaar KYC</span>
        </div>
      </div>
    </div>
  );
}
