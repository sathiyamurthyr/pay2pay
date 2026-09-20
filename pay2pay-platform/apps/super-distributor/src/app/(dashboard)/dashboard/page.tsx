"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Wallet,
  TrendingUp,
  ReceiptText,
  Percent,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  CreditCard,
  Network
} from "lucide-react";
import { SuperDistributorAPI, SuperDistributorDashboardData } from "@/services/super-distributor-api";

export default function SuperDistributorDashboardPage() {
  const [data, setData] = useState<SuperDistributorDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await SuperDistributorAPI.getDashboard();
      setData(res);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const wallet = data?.wallet || { balance: 0.0, credit_limit: 0.0, currency: "INR" };
  const dists = data?.distributors || { total: 0, active: 0, pending: 0, inactive: 0 };
  const retailers = data?.retailers || { total: 0, active: 0 };
  const business = data?.business || {
    total_transactions: 0,
    total_business_volume: 0,
    success_count: 0,
    pending_count: 0,
    failed_count: 0,
    today_volume: 0,
    today_transactions: 0,
    commission_earned: 0
  };
  const services = data?.services || [];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-white/[0.04] rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
          <div className="h-72 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Master Distributor Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time analytics for mapped distributors, downstream retailers, and POS commission earnings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/distributors/onboard"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard Distributor</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboardData} className="font-bold underline text-rose-200">
            Retry
          </button>
        </div>
      )}

      {/* ── KPI METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Mapped Distributors */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Distributors</span>
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">{dists.total}</div>
            <div className="mt-2 flex items-center gap-3 text-[11px]">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {dists.active} Active
              </span>
              {dists.pending > 0 && (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {dists.pending} Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Downstream Retailers */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] relative overflow-hidden group hover:border-blue-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Downstream Retailers</span>
            <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">{retailers.total}</div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <span className="text-blue-400 font-semibold">{retailers.active} active in network</span>
            </div>
          </div>
        </div>

        {/* Card 3: Today's POS Volume */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Volume</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400">
              ₹{business.today_volume.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <span>{business.today_transactions} transactions today</span>
            </div>
          </div>
        </div>

        {/* Card 4: Super Distributor Wallet */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] relative overflow-hidden group hover:border-purple-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wallet Liquidity</span>
            <div className="w-9 h-9 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-purple-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">
              ₹{wallet.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Credit: ₹{wallet.credit_limit.toLocaleString("en-IN")}</span>
              <span className="text-emerald-400 font-bold">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS & BUSINESS SUMMARY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Navigation Panels */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Operational Control
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/distributors"
              className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] hover:border-amber-400/30 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-200 group-hover:text-amber-300">Distributor Network</h3>
              <p className="mt-1 text-xs text-slate-400">View and manage your direct mapped distributors, status, and network size.</p>
            </Link>

            <Link
              href="/distributors/onboard"
              className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] hover:border-emerald-400/30 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-200 group-hover:text-emerald-300">Onboard Partner</h3>
              <p className="mt-1 text-xs text-slate-400">Create a new distributor with password credentials and automatic hierarchy linkage.</p>
            </Link>

            <Link
              href="/mdr"
              className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] hover:border-yellow-400/30 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform">
                  <Percent className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-yellow-400 transition-colors" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-200 group-hover:text-yellow-300">MDR Configuration</h3>
              <p className="mt-1 text-xs text-slate-400">Set custom POS MDR rates for mapped downstream partners with full audit protection.</p>
            </Link>

            <Link
              href="/transactions"
              className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] hover:border-blue-400/30 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-200 group-hover:text-blue-300">Network Transactions</h3>
              <p className="mt-1 text-xs text-slate-400">Real-time ledger of transactions processed across all mapped distributors.</p>
            </Link>
          </div>
        </div>

        {/* Service Volume Breakdown */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Service Distribution
            </h2>
            
            {services.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                No service volume recorded yet today.
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((svc, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-200">{svc.service_name}</p>
                      <p className="text-[10px] text-slate-400">{svc.transaction_count} txns ({svc.success_count} success)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-emerald-400">
                        ₹{svc.transaction_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">All-time Volume</span>
            <span className="font-extrabold text-slate-200">
              ₹{business.total_business_volume.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
