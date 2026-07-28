"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Code,
  Key,
  Webhook,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  PieChart as PieIcon,
  Activity
} from "lucide-react";

interface DeveloperMetrics {
  total_api_keys: number;
  active_webhooks: number;
  total_webhook_events_delivered: number;
  webhook_success_rate_pct: number;
  open_fraud_alerts: number;
  active_chargebacks: number;
  total_disputed_amount: number;
  event_distribution: Record<string, number>;
}

export default function DeveloperDashboardPage() {
  const [metrics, setMetrics] = useState<DeveloperMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/developer/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch developer dashboard metrics", err);
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
          <span className="text-lg font-medium">Loading Developer & Risk Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Active API Keys", value: metrics.total_api_keys, icon: Key, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Webhook Subscriptions", value: metrics.active_webhooks, icon: Webhook, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Events Delivered", value: metrics.total_webhook_events_delivered.toLocaleString("en-IN"), icon: CheckCircle2, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Webhook Delivery Rate", value: `${metrics.webhook_success_rate_pct}%`, icon: Activity, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "Active Chargebacks", value: metrics.active_chargebacks, icon: AlertTriangle, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30" },
    { label: "Total Disputed Volume", value: `₹${metrics.total_disputed_amount.toLocaleString("en-IN")}`, icon: ShieldAlert, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Code className="h-8 w-8 text-emerald-400" />
            Developer API & Risk Gateway
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time webhook delivery logs, HMAC signature verification, velocity fraud rules, and chargebacks
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

      {/* Event Breakdown Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Webhook className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200 text-lg">Webhook Event Types Dispatched</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(metrics.event_distribution).map(([event, count]) => {
              const total = metrics.total_webhook_events_delivered || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={event} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-mono">{event}</span>
                    <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & Risk Rules Info */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-slate-200 text-lg">Automated Velocity & Fraud Policies</h3>
          </div>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40">
              <span className="font-semibold text-emerald-400">HMAC-SHA256 Delivery Signatures</span>
              <p className="mt-0.5 text-slate-400">All webhook payloads signed with <code className="text-emerald-400">X-Pay2Pay-Signature</code> header.</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40">
              <span className="font-semibold text-blue-400">Max Transaction Amount Rule</span>
              <p className="mt-0.5 text-slate-400">Transactions exceeding ₹2,00,000 flagged for manual compliance review.</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40">
              <span className="font-semibold text-purple-400">Chargeback Reserve Hold</span>
              <p className="mt-0.5 text-slate-400">Merchant wallet balances auto-reserved upon receiving chargeback notice.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
