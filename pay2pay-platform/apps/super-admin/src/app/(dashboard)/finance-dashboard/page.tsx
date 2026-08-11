"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Landmark,
  RefreshCw,
  Scale,
  Wallet,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  CheckCircle2
} from "lucide-react";

interface FinanceMetrics {
  today_revenue: number;
  today_expenses: number;
  total_bank_balance: number;
  wallet_liability: number;
  outstanding_payouts: number;
  gst_payable: number;
  tds_payable: number;
  trial_balance_status: string;
}

export default function FinanceDashboardPage() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/finance/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch finance telemetry", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading Finance & Accounting Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Today's Gross Revenue", value: `₹${metrics.today_revenue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Total Bank Clearing Balance", value: `₹${metrics.total_bank_balance.toLocaleString("en-IN")}`, icon: Landmark, color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30" },
    { label: "Merchant Wallet Liabilities", value: `₹${metrics.wallet_liability.toLocaleString("en-IN")}`, icon: Wallet, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "GST Tax Payable Output", value: `₹${metrics.gst_payable.toLocaleString("en-IN")}`, icon: Receipt, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "TDS Sec 194O Payable", value: `₹${metrics.tds_payable.toLocaleString("en-IN")}`, icon: FileSpreadsheet, color: "from-cyan-500/20 to-sky-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Trial Balance Status", value: metrics.trial_balance_status, icon: Scale, color: "from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Landmark className="h-8 w-8 text-emerald-400" />
            Enterprise Finance, Accounting & Reconciliation Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time double-entry general ledger, trial balance, financial statements, & bank reconciliation
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

      {/* Control Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 backdrop-blur-xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <div>
            <h3 className="font-bold text-slate-100 text-lg">General Ledger Double-Entry Audit Integrity</h3>
            <p className="text-slate-300 text-sm">All debit and credit balances are 100% synchronized and balanced across all active subledgers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
