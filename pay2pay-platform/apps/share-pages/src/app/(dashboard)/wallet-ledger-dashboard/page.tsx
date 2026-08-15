"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Wallet,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  Scale
} from "lucide-react";

interface WalletMetrics {
  total_wallets_count: number;
  active_wallets_count: number;
  frozen_wallets_count: number;
  todays_total_credits: number;
  todays_total_debits: number;
  total_hold_balance: number;
  reconciliation_discrepancies_count: number;
}

export default function WalletLedgerDashboardPage() {
  const [metrics, setMetrics] = useState<WalletMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/wallet-ledger/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch wallet & ledger metrics", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading Wallet & Ledger Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total Enterprise Wallets", value: metrics.total_wallets_count, icon: Wallet, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Active Operating Wallets", value: metrics.active_wallets_count, icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Frozen Compliance Wallets", value: metrics.frozen_wallets_count, icon: Lock, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30" },
    { label: "Total Available Balance", value: `₹${metrics.todays_total_credits.toLocaleString("en-IN")}`, icon: ArrowUpRight, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Active Hold Balances", value: `₹${metrics.total_hold_balance.toLocaleString("en-IN")}`, icon: ShieldAlert, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Reconciliation Status", value: metrics.reconciliation_discrepancies_count === 0 ? "MATCHED (0)" : "DISCREPANCY", icon: Scale, color: "from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Wallet className="h-8 w-8 text-emerald-400" />
            Enterprise Wallet & Ledger Platform Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            Multi-tier wallet balances, Chart of Accounts, immutable transaction ledgers, and auto-reconciliation
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 border border-slate-700 hover:bg-slate-700/80 transition-all"
        >
          <RefreshCw className={`h-4 w-4 text-emerald-400 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] shadow-lg ${kpi.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">{kpi.label}</span>
                <Icon className="h-5 w-5 opacity-80" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Wallet Hierarchy Specs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-400" /> Multi-Tier Wallet Architecture
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-blue-400 text-sm">Retailer Wallets</span>
            <p className="mt-1 text-slate-400">Stores net settlement credits and enables payout disbursements.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-purple-400 text-sm">Hierarchy Commission Wallets</span>
            <p className="mt-1 text-slate-400">Distributor, Super Distributor, & RM multi-tier commission split balances.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-emerald-400 text-sm">Platform Settlement Wallets</span>
            <p className="mt-1 text-slate-400">Central bank deposit & staging clearing accounts for settlement files.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-amber-400 text-sm">Reserve & Suspense Wallets</span>
            <p className="mt-1 text-slate-400">Hold balances, risk escrow, and unmapped discrepancy isolation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
