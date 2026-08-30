"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Building2,
  Zap
} from "lucide-react";

interface PayoutMetrics {
  todays_total_payout_volume: number;
  pending_approval_count: number;
  queued_payouts_count: number;
  successful_payouts_count: number;
  failed_payouts_count: number;
  reversed_payouts_count: number;
  avg_bank_latency_ms: number;
}

export default function PayoutDashboardPage() {
  const [metrics, setMetrics] = useState<PayoutMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/payouts/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch payout metrics", err);
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
          <span className="text-lg font-medium">Loading Payout Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Today's Payout Volume", value: `₹${metrics.todays_total_payout_volume.toLocaleString("en-IN")}`, icon: Send, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Successful Transfers", value: metrics.successful_payouts_count, icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Pending Maker-Checker", value: metrics.pending_approval_count, icon: Clock, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Reversed Payouts", value: metrics.reversed_payouts_count, icon: RotateCcw, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "Avg Bank Gateway Latency", value: `${metrics.avg_bank_latency_ms} ms`, icon: Zap, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Failed Transfers", value: metrics.failed_payouts_count, icon: AlertTriangle, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Send className="h-8 w-8 text-emerald-400" />
            Enterprise Payout Engine Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            Automated IMPS, NEFT, RTGS, & UPI bank transfers with UTR generation and financial reversals
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

      {/* Transfer Mode Specs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-emerald-400" /> Supported Transfer Payment Modes
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-blue-400 text-sm">IMPS Immediate Transfer</span>
            <p className="mt-1 text-slate-400">Instant 24x7 bank account payouts with real-time UTR confirmation.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-emerald-400 text-sm">NEFT National Electronic Transfer</span>
            <p className="mt-1 text-slate-400">Batch-based bank clearing for high-volume merchant disbursements.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-purple-400 text-sm">RTGS Real-Time Gross Transfer</span>
            <p className="mt-1 text-slate-400">High-value enterprise payouts with instant bank settlement.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-amber-400 text-sm">UPI Virtual Payment Transfer</span>
            <p className="mt-1 text-slate-400">Instant VPA transfers for retail merchants.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
