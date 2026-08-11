"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  FileCheck,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  TrendingUp
} from "lucide-react";

interface IntakeMetrics {
  total_files_uploaded: number;
  files_processing_count: number;
  files_failed_count: number;
  files_completed_count: number;
  total_records_count: number;
  valid_staged_records_count: number;
  rejected_records_count: number;
  duplicate_records_count: number;
  todays_upload_volume: number;
}

export default function SettlementIntakeDashboardPage() {
  const [metrics, setMetrics] = useState<IntakeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/settlement-intake/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch settlement intake metrics", err);
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
          <span className="text-lg font-medium">Loading Settlement Intake Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Bank Files Uploaded", value: metrics.total_files_uploaded, icon: UploadCloud, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Staged Valid Records", value: metrics.valid_staged_records_count.toLocaleString("en-IN"), icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Isolated Rejected Records", value: metrics.rejected_records_count, icon: AlertTriangle, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30" },
    { label: "Duplicate Blocked Files", value: metrics.duplicate_records_count, icon: XCircle, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "Staged Settlement Volume", value: `₹${metrics.todays_upload_volume.toLocaleString("en-IN")}`, icon: TrendingUp, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Total Ingested Records", value: metrics.total_records_count, icon: FileText, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-emerald-400" />
            Settlement File Intake Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            SHA-256 Checksum verification, Bank format header/trailer validation, MID/TID mapping, and rejection staging
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

      {/* Supported Bank Gateways */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-emerald-400" /> Integrated Bank File Formats
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-blue-400 text-sm">HDFC Bank Settlement</span>
            <p className="mt-1 text-slate-400">CSV & Fixed-width format with Trailer checksum reconciliation.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-emerald-400 text-sm">ICICI Bank Merchant Feed</span>
            <p className="mt-1 text-slate-400">Encrypted ZIP archive with SHA-256 header validation.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-amber-400 text-sm">State Bank of India (SBI)</span>
            <p className="mt-1 text-slate-400">T+1 Daily batch CSV stream with MID/TID mapping.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <span className="font-semibold text-purple-400 text-sm">Axis Bank File Parser</span>
            <p className="mt-1 text-slate-400">XLSX merchant batch stream with auto-reject isolation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
