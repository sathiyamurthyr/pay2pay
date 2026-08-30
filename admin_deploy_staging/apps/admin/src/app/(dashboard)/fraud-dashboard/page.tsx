"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  Lock,
  UserX,
  CreditCard,
  Send,
  CheckCircle2,
  Activity
} from "lucide-react";

interface FraudMetrics {
  today_alerts: number;
  critical_alerts: number;
  high_risk_retailers: number;
  blocked_retailers: number;
  blocked_machines: number;
  high_risk_payouts: number;
  cases_under_investigation: number;
  resolved_cases: number;
}

export default function FraudDashboardPage() {
  const [metrics, setMetrics] = useState<FraudMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/fraud/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch fraud telemetry", err);
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
          <span className="text-lg font-medium">Loading Fraud & Risk Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Today's Fraud Alerts", value: metrics.today_alerts, icon: AlertTriangle, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Critical Severity Alerts", value: metrics.critical_alerts, icon: ShieldAlert, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30" },
    { label: "High Risk Retailers", value: metrics.high_risk_retailers, icon: UserX, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "Blocked Merchant Entities", value: metrics.blocked_retailers, icon: Lock, color: "from-red-500/20 to-rose-500/10 text-red-400 border-red-500/30" },
    { label: "High Risk Outbound Payouts", value: metrics.high_risk_payouts, icon: Send, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Cases Under Investigation", value: metrics.cases_under_investigation, icon: Activity, color: "from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-rose-400" />
            Enterprise Fraud, Risk & Compliance Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time fraud screening, automated risk scoring, blacklist enforcement, & investigation workspace
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

      {/* Risk Spectrum */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-400" /> Multi-Layer Risk Evaluation Spectrum
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 text-xs">
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <span className="font-bold text-emerald-400 block text-sm">LOW RISK (0 - 25)</span>
            <span className="text-slate-300">Automated Instant Clearance</span>
          </div>
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10">
            <span className="font-bold text-blue-400 block text-sm">MEDIUM RISK (26 - 50)</span>
            <span className="text-slate-300">Enhanced Audit Logging</span>
          </div>
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
            <span className="font-bold text-amber-400 block text-sm">HIGH RISK (51 - 75)</span>
            <span className="text-slate-300">Hold for Manual Review</span>
          </div>
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10">
            <span className="font-bold text-rose-400 block text-sm">CRITICAL RISK (&gt; 75)</span>
            <span className="text-slate-300">Reject & Freeze Wallet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
