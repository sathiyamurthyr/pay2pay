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
  Zap,
  ExternalLink,
  ArrowUpRight,
  Terminal,
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
    {
      label: "Today's Payout Volume",
      value: `₹${metrics.todays_total_payout_volume.toLocaleString("en-IN")}`,
      icon: Send,
      color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30",
      actionText: "View Transaction Report",
      href: "/reports/retailer-payout",
    },
    {
      label: "Successful Transfers",
      value: metrics.successful_payouts_count,
      icon: CheckCircle2,
      color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30",
      actionText: "View Successful Transfers",
      href: "/reports/retailer-payout?status=SUCCESS",
    },
    {
      label: "Pending Maker-Checker",
      value: metrics.pending_approval_count,
      icon: Clock,
      color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30",
      actionText: "Review Pending Payouts",
      href: "/reports/retailer-payout?status=PENDING",
    },
    {
      label: "Reversed Payouts",
      value: metrics.reversed_payouts_count,
      icon: RotateCcw,
      color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30",
      actionText: "View Reversals",
      href: "/reports/retailer-payout?status=REVERSED",
    },
    {
      label: "Avg Bank Gateway Latency",
      value: `${metrics.avg_bank_latency_ms} ms`,
      icon: Zap,
      color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30",
      actionText: "Inspect Gateway Telemetry",
      href: "/operations/api-logs?tab=vendor_logs&service=PAYOUT&direction=OUTBOUND",
    },
    {
      label: "Failed Transfers",
      value: metrics.failed_payouts_count,
      icon: AlertTriangle,
      color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20",
      actionText: "Inspect Vendor Failure Logs",
      href: "/operations/api-logs?tab=payout_vendor_errors&service=PAYOUT&direction=OUTBOUND&is_error=true",
      highlight: metrics.failed_payouts_count > 0,
    },
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
            Automated IMPS, NEFT, RTGS, & UPI bank transfers with UTR generation, vendor switches, and telemetry audits
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="/operations/api-logs?tab=payout_vendor_errors&service=PAYOUT&direction=OUTBOUND&is_error=true"
            className="flex items-center gap-2 rounded-lg bg-rose-950/40 px-3.5 py-2.5 text-sm font-semibold text-rose-300 border border-rose-800/60 hover:bg-rose-900/60 transition-all shadow-sm"
          >
            <Terminal className="h-4 w-4 text-rose-400" />
            Vendor Failure Logs
            {metrics.failed_payouts_count > 0 && (
              <span className="ml-1 rounded-full bg-rose-500/30 px-2 py-0.5 text-xs text-rose-200 border border-rose-500/40 font-bold">
                {metrics.failed_payouts_count}
              </span>
            )}
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
          </a>

          <a
            href="/operations/api-logs?tab=vendor_logs&service=PAYOUT&direction=OUTBOUND"
            className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-3.5 py-2.5 text-sm font-medium text-slate-200 border border-slate-700 hover:bg-slate-700/80 transition-all"
          >
            <Terminal className="h-4 w-4 text-indigo-400" />
            Vendor Telemetry
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
          </a>

          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 border border-slate-700 hover:bg-slate-700/80 transition-all"
          >
            <RefreshCw className={`h-4 w-4 text-emerald-400 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`relative flex flex-col justify-between overflow-hidden rounded-xl border bg-gradient-to-br p-5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] shadow-lg ${kpi.color}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">{kpi.label}</span>
                  <Icon className="h-5 w-5 opacity-80" />
                </div>
                <div className="mt-3 text-3xl font-extrabold text-white">{kpi.value}</div>
              </div>

              {kpi.href && (
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <a
                    href={kpi.href}
                    className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${
                      kpi.highlight ? "text-rose-300 hover:text-rose-200" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <span>{kpi.actionText}</span>
                    <ExternalLink className="h-3 w-3 opacity-80" />
                  </a>
                  {kpi.highlight && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                      Action Needed
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Diagnostics & Telemetry Links */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Granular Telemetry & Payout Gateway Logs</h4>
            <p className="text-xs text-slate-400">
              Audit outbound vendor switch requests, HTTP responses, payloads, and internal API traces separately.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/operations/api-logs?tab=vendor_logs&service=PAYOUT&direction=OUTBOUND"
            className="text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
          >
            Vendor Logs (BulkPe/Axis)
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <a
            href="/operations/api-logs?tab=internal_logs&service=PAYOUT&direction=INBOUND"
            className="text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-all flex items-center gap-1.5"
          >
            Internal API Logs
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
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
