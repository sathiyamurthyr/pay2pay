"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Percent,
  PlusCircle,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { DistributorAPI, DistributorDashboardData } from "@/services/distributor-api";

export default function DistributorDashboardPage() {
  const [data, setData] = useState<DistributorDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await DistributorAPI.getDashboard();
      setData(res);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const walletBalance = Number(data?.wallet?.balance) || 0.0;
  const retailers = data?.retailers || { total: 0, active: 0, pending: 0, inactive: 0 };
  const business = data?.business || {
    total_transactions: 0,
    total_business_volume: 0,
    success_count: 0,
    pending_count: 0,
    failed_count: 0
  };
  const topup = data?.topup || {
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    pending_amount: 0
  };
  const services = data?.services || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Distributor Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-500/20">
              Live Network
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Monitor mapped retailers, wallet liquidity, top-up workflows, and service business metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            Refresh
          </button>
          <Link
            href="/retailers"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Invite Retailer
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Grid: Wallet & Retailer Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#131B2E] to-[#0E1524] border border-amber-500/30 p-5 shadow-xl shadow-amber-500/5 group hover:border-amber-500/50 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-400/90">
              Distributor Wallet
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-400/15 flex items-center justify-center border border-amber-400/30">
              <Wallet className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-xs text-amber-400 font-bold">₹</span>
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {loading ? "..." : walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
            <span className="text-slate-400 text-[11px]">Available Funds</span>
            <Link
              href="/topup"
              className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-semibold text-xs group-hover:translate-x-0.5 transition-all"
            >
              Request Top-up
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Total Mapped Retailers */}
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Total Retailers</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mb-2">
            {loading ? "..." : retailers.total}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-white/[0.06]">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <UserCheck className="w-3 h-3" />
              {retailers.active} Active
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Clock className="w-3 h-3" />
              {retailers.pending} Pending
            </span>
          </div>
        </div>

        {/* Total Business Volume */}
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Network GMV</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mb-2 truncate">
            ₹{loading ? "..." : Number(business.total_business_volume).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/[0.06]">
            <span>{business.total_transactions} Total Txns</span>
            <span className="text-emerald-400 font-medium">{business.success_count} Success</span>
          </div>
        </div>

        {/* MDR & Top-up Summary */}
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Top-up & MDR Status</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Percent className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-lg font-bold text-white">{topup.pending_count}</span>
              <span className="text-[10px] text-slate-400 block">Pending Top-ups</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-amber-300">{data?.mdr?.configured_retailers_count || 0}</span>
              <span className="text-[10px] text-slate-400 block">Configured MDR</span>
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-medium">{topup.approved_count} Approved</span>
            <Link href="/mdr" className="text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-0.5">
              MDR Setup <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Service-Wise Business Breakdown Section */}
      <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Service-Wise Business Visibility
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time platform transaction performance across all enabled service channels.
            </p>
          </div>
          <Link
            href="/transactions"
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1"
          >
            All Transactions <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-10 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No business data available yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Transactions processed by your mapped retailers will appear here automatically with complete volume breakdowns.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.08] bg-white/[0.02]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Service Channel</th>
                  <th className="py-3 px-4 font-semibold text-right">Transactions</th>
                  <th className="py-3 px-4 font-semibold text-right">Volume (INR)</th>
                  <th className="py-3 px-4 font-semibold text-center">Success</th>
                  <th className="py-3 px-4 font-semibold text-center">Pending</th>
                  <th className="py-3 px-4 font-semibold text-center">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-200 font-medium">
                {services.map((svc, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      {svc.service_name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      {svc.transaction_count.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-300">
                      ₹{Number(svc.transaction_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {svc.success_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {svc.pending_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {svc.failed_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two Columns: Top-up Status & Mapped Retailers Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top-up Requests Section (Display Only) */}
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                Wallet Top-up Requests
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Admin-authorized liquidity pipeline. Submit requests for review.
              </p>
            </div>
            <Link
              href="/topup"
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1"
            >
              Submit Top-up <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 text-center">
              <span className="text-[10px] uppercase font-semibold text-amber-400/90 block">Pending</span>
              <span className="text-xl font-bold text-amber-300 mt-0.5 block">{topup.pending_count}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20 text-center">
              <span className="text-[10px] uppercase font-semibold text-emerald-400/90 block">Approved</span>
              <span className="text-xl font-bold text-emerald-300 mt-0.5 block">{topup.approved_count}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/[0.05] border border-rose-500/20 text-center">
              <span className="text-[10px] uppercase font-semibold text-rose-400/90 block">Rejected</span>
              <span className="text-xl font-bold text-rose-300 mt-0.5 block">{topup.rejected_count}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Only Admin approves or rejects distributor top-up requests.</span>
            </div>
            <Link href="/topup" className="text-amber-300 hover:underline font-semibold text-[11px] shrink-0">
              View History
            </Link>
          </div>
        </div>

        {/* Network Retailers Quick Status */}
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Mapped Retailers Network
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Retailers registered under your distributor code.
                </p>
              </div>
              <Link
                href="/retailers"
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1"
              >
                Manage Retailers <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {retailers.total === 0 ? (
              <div className="text-center py-6 px-4 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] my-auto">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-300">No retailers mapped yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Invite your first retailer to start configuring custom MDR rates and tracking transactions.
                </p>
                <Link
                  href="/retailers"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-sm transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Invite your first retailer
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-xs text-slate-300">Active Retailers</span>
                  <span className="text-xs font-bold text-emerald-400">{retailers.active}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-xs text-slate-300">Pending Verification</span>
                  <span className="text-xs font-bold text-amber-400">{retailers.pending}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-xs text-slate-300">Inactive Accounts</span>
                  <span className="text-xs font-bold text-slate-400">{retailers.inactive}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Configured MDR: {data?.mdr?.configured_retailers_count || 0} Retailers</span>
            <Link href="/mdr" className="text-amber-300 hover:underline font-semibold">
              Open MDR Setup
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
