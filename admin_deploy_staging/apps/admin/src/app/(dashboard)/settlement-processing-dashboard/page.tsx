"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Cpu,
  RefreshCw,
  Wallet,
  Receipt,
  CheckCircle2,
  TrendingUp,
  Clock,
  BookOpen
} from "lucide-react";

interface ProcessingMetrics {
  pending_processing_count: number;
  processing_count: number;
  completed_settlements_count: number;
  failed_settlements_count: number;
  retried_count: number;
  total_wallet_credits: number;
  total_commission_amount: number;
  total_gst_amount: number;
  avg_processing_time_ms: number;
}

export default function SettlementProcessingDashboardPage() {
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/settlement-processing/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch settlement processing metrics", err);
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
          <span className="text-lg font-medium">Loading Processing Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Completed Settlements", value: metrics.completed_settlements_count, icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Total Net Wallet Credits", value: `₹${metrics.total_wallet_credits.toLocaleString("en-IN")}`, icon: Wallet, color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30" },
    { label: "5-Tier Commission Volume", value: `₹${metrics.total_commission_amount.toLocaleString("en-IN")}`, icon: TrendingUp, color: "from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30" },
    { label: "Total GST Tax Deducted", value: `₹${metrics.total_gst_amount.toLocaleString("en-IN")}`, icon: Receipt, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Avg Execution Latency", value: `${metrics.avg_processing_time_ms} ms`, icon: Clock, color: "from-cyan-500/20 to-teal-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Double-Entry Journals", value: metrics.completed_settlements_count, icon: BookOpen, color: "from-indigo-500/20 to-blue-500/10 text-indigo-400 border-indigo-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Cpu className="h-8 w-8 text-emerald-400" />
            Settlement Processing Engine Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time financial calculation engine, net wallet crediting, and double-entry general ledger posting
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

      {/* Pipeline Status Overview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <Cpu className="h-5 w-5 text-emerald-400" /> Settlement Processing Pipeline Flow
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 text-center text-xs">
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-blue-400 block mb-1">1. Staging Ingest</span>
            <span className="text-slate-400">Validated records read from intake engine</span>
          </div>
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-purple-400 block mb-1">2. Config Resolution</span>
            <span className="text-slate-400">7-tier MDR, GST, TDS, Commission rules applied</span>
          </div>
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-emerald-400 block mb-1">3. Net Settlement</span>
            <span className="text-slate-400">Gross Amount - MDR - GST - TDS calculated</span>
          </div>
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-amber-400 block mb-1">4. Wallet Credit</span>
            <span className="text-slate-400">Retailer wallet balance credited instantly</span>
          </div>
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-indigo-400 block mb-1">5. Journal Posted</span>
            <span className="text-slate-400">Double-entry accounting entries written to ledger</span>
          </div>
        </div>
      </div>
    </div>
  );
}
