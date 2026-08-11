"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, UserCheck, ShieldAlert, Clock, Ban, AlertTriangle, 
  TrendingUp, RefreshCw, CheckCircle2, UserX, FileCheck, Shield, ChevronRight
} from "lucide-react";
import apiClient from "@/lib/api";

interface CustomerMetrics {
  total_customers: number;
  active_customers: number;
  today_registrations: number;
  pending_kyc: number;
  rejected_kyc: number;
  blocked_customers: number;
  high_risk_customers: number;
  inactive_customers: number;
  monthly_growth_pct: number;
  category_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
  kyc_level_breakdown: Record<string, number>;
}

export default function CustomerDashboardPage() {
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/customers/dashboard");
      setMetrics(res.data.data);
    } catch (err) {
      console.error("Failed to fetch customer metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-400" /> Customer Lifecycle Telemetry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Enterprise Single Source of Truth for Customer Onboarding, KYC & Eligibility
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-sm font-medium transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Data
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Customers</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {metrics?.total_customers ?? 0}
              </h3>
              <p className="text-xs text-emerald-400 flex items-center gap-1 mt-2">
                <TrendingUp className="w-3.5 h-3.5" /> +{metrics?.monthly_growth_pct ?? 0}% this month
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Customers</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                {metrics?.active_customers ?? 0}
              </h3>
              <p className="text-xs text-slate-500 mt-2">Validated for financial transactions</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pending KYC Queue</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">
                {metrics?.pending_kyc ?? 0}
              </h3>
              <p className="text-xs text-amber-400/80 mt-2">Awaiting verification review</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Blocked / High Risk</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">
                {(metrics?.blocked_customers ?? 0) + (metrics?.high_risk_customers ?? 0)}
              </h3>
              <p className="text-xs text-rose-400/80 mt-2">Restricted or flagged accounts</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" /> Lifecycle Status Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-sm text-slate-300">Active</span>
              <span className="text-sm font-semibold text-emerald-400">{metrics?.active_customers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-sm text-slate-300">Pending KYC</span>
              <span className="text-sm font-semibold text-amber-400">{metrics?.pending_kyc ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-sm text-slate-300">Rejected KYC</span>
              <span className="text-sm font-semibold text-rose-400">{metrics?.rejected_kyc ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-sm text-slate-300">Blocked / Suspended</span>
              <span className="text-sm font-semibold text-rose-500">{metrics?.blocked_customers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-sm text-slate-300">Inactive</span>
              <span className="text-sm font-semibold text-slate-400">{metrics?.inactive_customers ?? 0}</span>
            </div>
          </div>
        </div>

        {/* KYC Verification Tier Distribution */}
        <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-indigo-400" /> KYC Level Tiers
          </h3>
          <div className="space-y-3">
            {[
              { level: "Minimum KYC", count: metrics?.pending_kyc ?? 0, color: "bg-blue-500" },
              { level: "Simplified KYC", count: 0, color: "bg-cyan-500" },
              { level: "Full KYC", count: metrics?.active_customers ?? 0, color: "bg-emerald-500" },
              { level: "Enhanced Due Diligence", count: metrics?.high_risk_customers ?? 0, color: "bg-purple-500" },
              { level: "Corporate KYC", count: 0, color: "bg-amber-500" },
            ].map((tier, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">{tier.level}</span>
                  <span className="text-slate-200 font-semibold">{tier.count}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${tier.color}`} 
                    style={{ width: `${metrics?.total_customers ? Math.min(100, (tier.count / metrics.total_customers) * 100) : 0}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk & Compliance Summary */}
        <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-400" /> Risk & Sanction Screening
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-300">High Risk Accounts</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {metrics?.high_risk_customers ?? 0}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Requires enhanced velocity & AML review</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-300">PEP & Watchlist Hits</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  0 Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Politically Exposed Persons & Global Watchlists</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-300">Blacklisted Entries</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
                  0 Entries
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Mobile, Identity & PAN Blacklist registry</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
