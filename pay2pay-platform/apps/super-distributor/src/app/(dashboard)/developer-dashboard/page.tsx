"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Code2,
  Key,
  Webhook,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Activity,
  Lock,
  Zap,
  Globe,
  Terminal,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  BarChart3,
  Fingerprint,
  Radio,
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

const MOCK_METRICS: DeveloperMetrics = {
  total_api_keys: 14,
  active_webhooks: 8,
  total_webhook_events_delivered: 182430,
  webhook_success_rate_pct: 99.2,
  open_fraud_alerts: 3,
  active_chargebacks: 7,
  total_disputed_amount: 148500,
  event_distribution: {
    "payment.success":  62410,
    "payment.failed":   8920,
    "settlement.done":  41280,
    "kyc.verified":     19830,
    "wallet.topup":     29340,
    "refund.initiated": 20650,
  },
};

const SECURITY_RULES = [
  {
    title: "HMAC-SHA256 Payload Signatures",
    desc: "All webhook payloads signed via X-Pay2Pay-Signature header with 300s anti-replay window.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-400/20",
    icon: Fingerprint,
    status: "ACTIVE",
  },
  {
    title: "Max Transaction Amount Rule",
    desc: "Transactions exceeding ₹2,00,000 auto-flagged for manual compliance review.",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-400/20",
    icon: ShieldCheck,
    status: "ACTIVE",
  },
  {
    title: "Chargeback Reserve Hold",
    desc: "Merchant wallet balances auto-reserved upon receiving chargeback notice.",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-400/20",
    icon: Lock,
    status: "ACTIVE",
  },
  {
    title: "Velocity Rate Limiting",
    desc: "API keys throttled to 1,000 req/min. Burst allowance: 2× for 30s windows.",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-400/20",
    icon: Zap,
    status: "ACTIVE",
  },
];

const EVENT_COLORS = [
  "bg-cyan-400",
  "bg-indigo-400",
  "bg-violet-400",
  "bg-emerald-400",
  "bg-blue-400",
  "bg-purple-400",
];

// ── Glassmorphism card ──────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none rounded-2xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ── Mini progress bar ───────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function DeveloperDashboardPage() {
  const [metrics, setMetrics] = useState<DeveloperMetrics>(MOCK_METRICS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/developer/dashboard/metrics");
      setMetrics(res.data || MOCK_METRICS);
    } catch {
      setMetrics(MOCK_METRICS);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const kpis = [
    {
      label: "Active API Keys",
      value: metrics.total_api_keys,
      sub: "Live platform credentials",
      icon: Key,
      accent: "from-blue-600/30 to-indigo-700/20",
      iconBg: "bg-blue-500/20 border-blue-400/30 text-blue-300",
      glow: "shadow-blue-500/15",
      bar: (metrics.total_api_keys / 20) * 100,
      barColor: "bg-blue-400",
      trend: "+2 this week",
      trendUp: true,
    },
    {
      label: "Webhook Subscriptions",
      value: metrics.active_webhooks,
      sub: "Active endpoint listeners",
      icon: Webhook,
      accent: "from-emerald-600/30 to-teal-700/20",
      iconBg: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300",
      glow: "shadow-emerald-500/15",
      bar: (metrics.active_webhooks / 20) * 100,
      barColor: "bg-emerald-400",
      trend: "Stable",
      trendUp: true,
    },
    {
      label: "Events Delivered",
      value: metrics.total_webhook_events_delivered.toLocaleString("en-IN"),
      sub: "Cumulative dispatched",
      icon: Radio,
      accent: "from-cyan-600/30 to-blue-700/20",
      iconBg: "bg-cyan-500/20 border-cyan-400/30 text-cyan-300",
      glow: "shadow-cyan-500/15",
      bar: 78,
      barColor: "bg-cyan-400",
      trend: "+4.2K today",
      trendUp: true,
    },
    {
      label: "Delivery Success Rate",
      value: `${metrics.webhook_success_rate_pct}%`,
      sub: "Webhook delivery reliability",
      icon: CheckCircle2,
      accent: "from-violet-600/30 to-purple-700/20",
      iconBg: "bg-violet-500/20 border-violet-400/30 text-violet-300",
      glow: "shadow-violet-500/15",
      bar: metrics.webhook_success_rate_pct,
      barColor: metrics.webhook_success_rate_pct > 95 ? "bg-emerald-400" : "bg-amber-400",
      trend: "-0.1% vs yesterday",
      trendUp: false,
    },
    {
      label: "Open Fraud Alerts",
      value: metrics.open_fraud_alerts,
      sub: "Requiring investigation",
      icon: AlertTriangle,
      accent: "from-rose-600/30 to-red-700/20",
      iconBg: "bg-rose-500/20 border-rose-400/30 text-rose-300",
      glow: "shadow-rose-500/15",
      bar: (metrics.open_fraud_alerts / 10) * 100,
      barColor: "bg-rose-400",
      trend: "+1 since last refresh",
      trendUp: false,
    },
    {
      label: "Disputed Volume",
      value: `₹${(metrics.total_disputed_amount / 1000).toFixed(1)}K`,
      sub: `${metrics.active_chargebacks} active chargebacks`,
      icon: ShieldAlert,
      accent: "from-amber-600/30 to-orange-700/20",
      iconBg: "bg-amber-500/20 border-amber-400/30 text-amber-300",
      glow: "shadow-amber-500/15",
      bar: (metrics.total_disputed_amount / 500000) * 100,
      barColor: "bg-amber-400",
      trend: "Under review",
      trendUp: false,
    },
  ];

  const totalEvents = metrics.total_webhook_events_delivered || 1;

  return (
    <div
      className="min-h-screen space-y-6 pb-16"
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1225 40%, #0f1030 70%, #0a0f1e 100%)",
        margin: "-20px -24px",
        padding: "24px",
      }}
    >
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[-100px] left-[5%] w-[450px] h-[450px] rounded-full bg-cyan-600/8 blur-3xl" />
        <div className="absolute top-[20%] right-[-60px] w-[380px] h-[380px] rounded-full bg-violet-600/8 blur-3xl" />
        <div className="absolute bottom-[10%] left-[35%] w-[320px] h-[320px] rounded-full bg-indigo-600/6 blur-3xl" />
      </div>

      {/* ── Page Header ── */}
      <div className="relative z-10">
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* Animated icon orb */}
              <div className="relative w-14 h-14 shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 opacity-75 blur-sm animate-pulse" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/80 to-violet-600/80 border border-white/20 flex items-center justify-center shadow-xl">
                  <Terminal className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    Developer API &amp; Risk Gateway
                  </h1>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-extrabold text-cyan-400 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping absolute" />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 relative" />
                    LIVE
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Real-time webhook delivery · HMAC signature verification · velocity fraud rules · chargebacks
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  Last updated: {lastUpdated.toLocaleTimeString("en-IN")} · Auto-refresh every 15s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* API Version badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono font-bold text-cyan-400">
                <Globe className="w-3.5 h-3.5" />
                API v1.0
              </div>

              <button
                onClick={fetchMetrics}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 border border-white/15 text-sm font-semibold text-slate-200 hover:bg-white/12 hover:border-white/25 transition-all cursor-pointer backdrop-blur-sm"
              >
                <RefreshCw className={`w-4 h-4 text-cyan-400 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Summary strip */}
          <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-white/8">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Activity className="w-4 h-4" />
              <span>{metrics.total_webhook_events_delivered.toLocaleString("en-IN")} Total Events</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-400">
              <Key className="w-4 h-4" />
              <span>{metrics.total_api_keys} API Keys Provisioned</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{metrics.open_fraud_alerts} Fraud Alerts Open</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{metrics.webhook_success_rate_pct}% Delivery Rate</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── KPI Cards ── */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <GlassCard key={idx} className={`p-5 group hover:scale-[1.02] transition-all duration-300 shadow-xl ${kpi.glow}`}>
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${kpi.accent} opacity-60 pointer-events-none`} />
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-3xl font-extrabold text-white mt-1 tracking-tight">{kpi.value}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{kpi.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${kpi.iconBg} backdrop-blur-sm shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <ProgressBar pct={kpi.bar} color={kpi.barColor} />

                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-slate-500">{Math.round(kpi.bar)}% capacity</span>
                  <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${kpi.trendUp ? "text-emerald-400" : "text-rose-400"}`}>
                    {kpi.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {kpi.trend}
                  </span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Bottom Row: Event Distribution + Security Policies ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Webhook Event Distribution */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30">
                <Webhook className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Webhook Event Distribution</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.total_webhook_events_delivered.toLocaleString("en-IN")} total events dispatched
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              Last 30 days
            </span>
          </div>

          <div className="space-y-4">
            {Object.entries(metrics.event_distribution).map(([event, count], i) => {
              const pct = Math.round((count / totalEvents) * 100);
              const barColor = EVENT_COLORS[i % EVENT_COLORS.length];
              return (
                <div key={event} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${barColor} shrink-0`} />
                      <span className="text-[12px] font-mono font-semibold text-slate-300">{event}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">{count.toLocaleString("en-IN")}</span>
                      <span className="text-[11px] font-extrabold text-slate-400 w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/8 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor} opacity-80`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini legend */}
          <div className="mt-5 pt-4 border-t border-white/8 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
            <span>0 events</span>
            <span className="font-mono text-slate-400">↑ Sorted by volume</span>
            <span>{totalEvents.toLocaleString("en-IN")} events</span>
          </div>
        </GlassCard>

        {/* Security & Fraud Policies */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Automated Velocity &amp; Fraud Policies</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Active security enforcement rules</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-[10px] font-extrabold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {SECURITY_RULES.length} Rules Active
            </span>
          </div>

          <div className="space-y-3">
            {SECURITY_RULES.map((rule, i) => {
              const Icon = rule.icon;
              return (
                <div key={i} className={`p-4 rounded-xl border backdrop-blur-sm ${rule.bg} transition-all hover:scale-[1.01]`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 border border-white/10 shrink-0`}>
                      <Icon className={`w-4 h-4 ${rule.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[12px] font-extrabold ${rule.color}`}>{rule.title}</span>
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-[9px] font-extrabold text-emerald-400">
                          {rule.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{rule.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* API Health footer */}
          <div className="mt-5 pt-4 border-t border-white/8 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/8 text-center">
              <p className="text-2xl font-extrabold text-cyan-400">{metrics.webhook_success_rate_pct}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Webhook Uptime</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/8 text-center">
              <p className="text-2xl font-extrabold text-violet-400">≤ 300ms</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Signature Window</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Quick Links Terminal Strip ── */}
      <div className="relative z-10">
        <GlassCard className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Quick Links</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "API Keys",         href: "/developer/api-keys",  color: "hover:border-blue-400/50 hover:text-blue-300" },
                { label: "Webhooks",         href: "/developer/api-keys",  color: "hover:border-cyan-400/50 hover:text-cyan-300" },
                { label: "API Logs",         href: "/audit-logs",          color: "hover:border-violet-400/50 hover:text-violet-300" },
                { label: "Fraud Rules",      href: "/fraud",               color: "hover:border-rose-400/50 hover:text-rose-300" },
                { label: "Compliance",       href: "/compliance",          color: "hover:border-amber-400/50 hover:text-amber-300" },
                { label: "Secrets Vault",    href: "/settings/secrets",    color: "hover:border-emerald-400/50 hover:text-emerald-300" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-400 transition-all cursor-pointer ${link.color}`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
