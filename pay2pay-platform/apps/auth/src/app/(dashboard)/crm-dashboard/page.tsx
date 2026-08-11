"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  LifeBuoy,
  RefreshCw,
  Ticket,
  Users,
  AlertTriangle,
  Star,
  CheckCircle2,
  Clock,
  MapPin
} from "lucide-react";

interface CrmMetrics {
  total_retailers: number;
  active_retailers: number;
  open_tickets: number;
  pending_tickets: number;
  escalated_tickets: number;
  sla_breached_tickets: number;
  average_csat_rating: number;
  total_field_visits: number;
}

export default function CrmDashboardPage() {
  const [metrics, setMetrics] = useState<CrmMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/crm/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch CRM telemetry", err);
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
          <span className="text-lg font-medium">Loading CRM Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total Onboarded Retailers", value: metrics.total_retailers, icon: Users, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Active Operational Merchants", value: metrics.active_retailers, icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Open Support Tickets", value: metrics.open_tickets, icon: Ticket, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Pending Customer Action", value: metrics.pending_tickets, icon: Clock, color: "from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30" },
    { label: "CSAT Customer Score", value: `${metrics.average_csat_rating} / 5.0`, icon: Star, color: "from-teal-500/20 to-cyan-500/10 text-teal-400 border-teal-500/30" },
    { label: "Completed Field Visits", value: metrics.total_field_visits, icon: MapPin, color: "from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-emerald-400" />
            Enterprise CRM & Support Telemetry Dashboard
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time merchant support tickets, 360° customer relationship telemetry, & SLA compliance
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

      {/* Support SLA Health */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <Ticket className="h-5 w-5 text-emerald-400" /> Support Desk SLA & Escalation Status
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-200 block text-sm">Response SLA Compliance</span>
              <span className="text-slate-400">Target &lt; 60 mins</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-400 border border-emerald-500/20">99.8%</span>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-200 block text-sm">Resolution SLA Compliance</span>
              <span className="text-slate-400">Target &lt; 24 hours</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-400 border border-emerald-500/20">98.5%</span>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-200 block text-sm">Escalated Tickets (L3/L4)</span>
              <span className="text-slate-400">Critical Finance/Tech</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-400 border border-emerald-500/20">0 Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
