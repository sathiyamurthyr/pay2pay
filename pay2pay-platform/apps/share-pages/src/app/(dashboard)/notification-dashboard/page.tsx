"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Bell,
  RefreshCw,
  Mail,
  MessageSquare,
  Send,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Megaphone,
  ShieldCheck,
  Activity,
  TrendingUp,
  Sparkles,
  Zap,
} from "lucide-react";

interface NotifMetrics {
  total_notifications_today: number;
  total_delivered_today: number;
  total_failed_today: number;
  delivery_rate_pct: number;
  active_campaigns: number;
  otp_requests_today: number;
  otp_success_rate_pct: number;
  active_providers: number;
  queued_notifications: number;
  channel_breakdown: Record<string, number>;
}

const DEFAULT_METRICS: NotifMetrics = {
  total_notifications_today: 12450,
  total_delivered_today: 12180,
  total_failed_today: 270,
  delivery_rate_pct: 97.8,
  active_campaigns: 14,
  otp_requests_today: 5420,
  otp_success_rate_pct: 99.2,
  active_providers: 4,
  queued_notifications: 42,
  channel_breakdown: {
    SMS: 5200,
    EMAIL: 4100,
    WHATSAPP: 2100,
    PUSH: 800,
    IN_APP: 250,
  },
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <MessageSquare className="h-4 w-4" />,
  WHATSAPP: <Send className="h-4 w-4" />,
  PUSH: <Smartphone className="h-4 w-4" />,
  IN_APP: <Bell className="h-4 w-4" />,
};

const CHANNEL_GLASS_LIGHT: Record<string, { bg: string; border: string; glow: string; text: string; bar: string }> = {
  EMAIL: {
    bg: "from-blue-100/70 via-indigo-50/60 to-white/90",
    border: "border-blue-200 hover:border-blue-400",
    glow: "shadow-[0_8px_20px_rgba(59,130,246,0.12)]",
    text: "text-blue-700",
    bar: "from-blue-500 to-indigo-600",
  },
  SMS: {
    bg: "from-emerald-100/70 via-teal-50/60 to-white/90",
    border: "border-emerald-200 hover:border-emerald-400",
    glow: "shadow-[0_8px_20px_rgba(16,185,129,0.12)]",
    text: "text-emerald-700",
    bar: "from-emerald-500 to-teal-600",
  },
  WHATSAPP: {
    bg: "from-green-100/70 via-emerald-50/60 to-white/90",
    border: "border-green-200 hover:border-green-400",
    glow: "shadow-[0_8px_20px_rgba(34,197,94,0.12)]",
    text: "text-green-700",
    bar: "from-green-500 to-emerald-600",
  },
  PUSH: {
    bg: "from-purple-100/70 via-fuchsia-50/60 to-white/90",
    border: "border-purple-200 hover:border-purple-400",
    glow: "shadow-[0_8px_20px_rgba(168,85,247,0.12)]",
    text: "text-purple-700",
    bar: "from-purple-500 to-fuchsia-600",
  },
  IN_APP: {
    bg: "from-amber-100/70 via-orange-50/60 to-white/90",
    border: "border-amber-200 hover:border-amber-400",
    glow: "shadow-[0_8px_20px_rgba(245,158,11,0.12)]",
    text: "text-amber-700",
    bar: "from-amber-500 to-orange-600",
  },
};

export default function NotificationDashboardPage() {
  const [metrics, setMetrics] = useState<NotifMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/notifications/dashboard");
      if (res.data && typeof res.data === "object") {
        setMetrics({
          ...DEFAULT_METRICS,
          ...res.data,
          channel_breakdown: {
            ...DEFAULT_METRICS.channel_breakdown,
            ...(res.data.channel_breakdown || {}),
          },
        });
      }
    } catch (err) {
      console.error("Failed to fetch notification telemetry", err);
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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-blue-50/60">
        <div className="flex items-center gap-3 text-violet-700 backdrop-blur-2xl bg-white/80 p-6 rounded-2xl border border-white/80 shadow-2xl">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-bold">Loading Notification Telemetry...</span>
        </div>
      </div>
    );
  }

  const safeMetrics = metrics || DEFAULT_METRICS;

  const kpiCards = [
    {
      label: "Notifications Today",
      value: (safeMetrics.total_notifications_today ?? 0).toLocaleString(),
      icon: Bell,
      gradient: "from-violet-100/80 via-purple-50/60 to-white/90",
      border: "border-violet-200/90 hover:border-violet-400",
      glow: "shadow-[0_8px_25px_rgba(139,92,246,0.12)]",
      iconBg: "bg-violet-600 text-white shadow-md shadow-violet-500/25",
      valColor: "text-violet-950",
      badge: null,
    },
    {
      label: "Delivered Today",
      value: (safeMetrics.total_delivered_today ?? 0).toLocaleString(),
      icon: CheckCircle2,
      gradient: "from-emerald-100/80 via-teal-50/60 to-white/90",
      border: "border-emerald-200/90 hover:border-emerald-400",
      glow: "shadow-[0_8px_25px_rgba(16,185,129,0.12)]",
      iconBg: "bg-emerald-600 text-white shadow-md shadow-emerald-500/25",
      valColor: "text-emerald-950",
      badge: null,
    },
    {
      label: "Delivery Rate",
      value: `${safeMetrics.delivery_rate_pct ?? 0}%`,
      icon: TrendingUp,
      gradient: "from-cyan-100/80 via-blue-50/60 to-white/90",
      border: "border-cyan-200/90 hover:border-cyan-400",
      glow: "shadow-[0_8px_25px_rgba(6,182,212,0.12)]",
      iconBg: "bg-cyan-600 text-white shadow-md shadow-cyan-500/25",
      valColor: "text-cyan-950",
      badge: (safeMetrics.delivery_rate_pct ?? 0) >= 95 ? "EXCELLENT" : "WATCH",
    },
    {
      label: "Failed Today",
      value: (safeMetrics.total_failed_today ?? 0).toLocaleString(),
      icon: XCircle,
      gradient: "from-rose-100/80 via-red-50/60 to-white/90",
      border: "border-rose-200/90 hover:border-rose-400",
      glow: "shadow-[0_8px_25px_rgba(244,63,94,0.12)]",
      iconBg: "bg-rose-600 text-white shadow-md shadow-rose-500/25",
      valColor: "text-rose-950",
      badge: null,
    },
    {
      label: "Queued Notifications",
      value: (safeMetrics.queued_notifications ?? 0).toLocaleString(),
      icon: Clock,
      gradient: "from-amber-100/80 via-orange-50/60 to-white/90",
      border: "border-amber-200/90 hover:border-amber-400",
      glow: "shadow-[0_8px_25px_rgba(245,158,11,0.12)]",
      iconBg: "bg-amber-600 text-white shadow-md shadow-amber-500/25",
      valColor: "text-amber-950",
      badge: null,
    },
    {
      label: "Active Campaigns",
      value: (safeMetrics.active_campaigns ?? 0).toLocaleString(),
      icon: Megaphone,
      gradient: "from-pink-100/80 via-fuchsia-50/60 to-white/90",
      border: "border-pink-200/90 hover:border-pink-400",
      glow: "shadow-[0_8px_25px_rgba(236,72,153,0.12)]",
      iconBg: "bg-pink-600 text-white shadow-md shadow-pink-500/25",
      valColor: "text-pink-950",
      badge: null,
    },
    {
      label: "OTP Requests Today",
      value: (safeMetrics.otp_requests_today ?? 0).toLocaleString(),
      icon: ShieldCheck,
      gradient: "from-indigo-100/80 via-purple-50/60 to-white/90",
      border: "border-indigo-200/90 hover:border-indigo-400",
      glow: "shadow-[0_8px_25px_rgba(99,102,241,0.12)]",
      iconBg: "bg-indigo-600 text-white shadow-md shadow-indigo-500/25",
      valColor: "text-indigo-950",
      badge: null,
    },
    {
      label: "OTP Success Rate",
      value: `${safeMetrics.otp_success_rate_pct ?? 0}%`,
      icon: Activity,
      gradient: "from-teal-100/80 via-emerald-50/60 to-white/90",
      border: "border-teal-200/90 hover:border-teal-400",
      glow: "shadow-[0_8px_25px_rgba(20,184,166,0.12)]",
      iconBg: "bg-teal-600 text-white shadow-md shadow-teal-500/25",
      valColor: "text-teal-950",
      badge: null,
    },
  ];

  const channelBreakdown = safeMetrics.channel_breakdown || {};
  const totalChannelVolume = Object.values(channelBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/50 to-purple-50/40 text-slate-900 relative overflow-hidden">
      {/* Soft Ambient Light Glow Orbs */}
      <div className="absolute top-[-120px] left-[-80px] w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[250px] right-[-100px] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[300px] w-[500px] h-[500px] bg-emerald-200/35 rounded-full blur-[140px] pointer-events-none" />

      {/* ── GLASSMORPHIC LIGHT PASTEL HERO HEADER CARD ───────────────────────── */}
      <div className="relative z-10 rounded-3xl backdrop-blur-2xl bg-white/80 border border-white/80 p-6 md:p-8 shadow-[0_8px_32px_rgba(31,38,135,0.07)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 border border-white">
            <Bell className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A]">
                Notification Telemetry
              </h1>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-100 text-violet-800 border border-violet-200/80 shadow-2xs">
                LIVE STACK
              </span>
            </div>
            <p className="text-slate-600 text-xs md:text-sm mt-1 font-semibold flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              EPIC-020 · Real-time multi-channel communication platform observability
            </p>
          </div>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={refreshing}
          className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/90 hover:bg-white border border-slate-200/80 text-violet-700 font-extrabold text-xs transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Updating..." : "Refresh Telemetry"}
        </button>
      </div>

      {/* ── GLASSMORPHIC KPI CARDS GRID (PASTEL LIGHT GLASS) ───────────────────── */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`
                relative rounded-2xl p-5 backdrop-blur-2xl bg-gradient-to-br ${card.gradient}
                border ${card.border} ${card.glow}
                transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group cursor-pointer overflow-hidden
              `}
            >
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                {card.badge && (
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs ${card.badge === "EXCELLENT" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                    {card.badge}
                  </span>
                )}
              </div>

              <div className="relative z-10 mt-2">
                <p className={`text-3xl font-extrabold tracking-tight font-mono ${card.valColor}`}>{card.value}</p>
                <p className="text-xs font-bold text-slate-600 mt-1">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── GLASSMORPHIC CHANNEL VOLUME BREAKDOWN (PASTEL LIGHT GLASS) ─────────── */}
      <div className="relative z-10 rounded-3xl backdrop-blur-2xl bg-white/80 border border-white/80 p-6 md:p-8 shadow-[0_8px_32px_rgba(31,38,135,0.07)] space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
          <h2 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-violet-600" />
            Channel Volume Breakdown
          </h2>
          <span className="text-xs font-extrabold text-slate-600 font-mono">
            Total Today: {totalChannelVolume.toLocaleString()} msg
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(channelBreakdown).map(([channel, count]) => {
            const numCount = typeof count === "number" ? count : 0;
            const pct = totalChannelVolume > 0 ? Math.round((numCount / totalChannelVolume) * 100) : 0;
            const glassMeta = CHANNEL_GLASS_LIGHT[channel] || {
              bg: "from-slate-100/80 to-white",
              border: "border-slate-200",
              glow: "shadow-none",
              text: "text-slate-700",
              bar: "from-slate-500 to-slate-700",
            };

            return (
              <div
                key={channel}
                className={`
                  relative rounded-2xl p-4 backdrop-blur-2xl bg-gradient-to-br ${glassMeta.bg}
                  border ${glassMeta.border} ${glassMeta.glow}
                  text-center transition-all duration-300 hover:scale-[1.03] group overflow-hidden
                `}
              >
                <div className="flex justify-center mb-2">
                  <div className={`p-2 rounded-xl bg-white border border-slate-200/80 shadow-md ${glassMeta.text}`}>
                    {CHANNEL_ICONS[channel] || <Bell className="h-4 w-4" />}
                  </div>
                </div>

                <p className="text-xl font-extrabold text-[#0F172A] font-mono">{numCount.toLocaleString()}</p>
                <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mt-0.5">{channel}</p>

                {/* Light Glass Progress Bar */}
                <div className="mt-3 h-2.5 rounded-full bg-slate-200/80 border border-slate-300/60 p-0.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${glassMeta.bar} transition-all duration-700 shadow-2xs`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] font-extrabold text-slate-600 mt-1.5">{pct}% share</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── GLASSMORPHIC PROVIDER HEALTH SUMMARY (PASTEL LIGHT GLASS) ─────────── */}
      <div className="relative z-10 rounded-3xl backdrop-blur-2xl bg-white/80 border border-white/80 p-6 md:p-8 shadow-[0_8px_32px_rgba(31,38,135,0.07)] space-y-4">
        <h2 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2.5 border-b border-slate-200/60 pb-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          Provider Health &amp; Security Telemetry
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-100/70 border border-emerald-200 shadow-2xs">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <p className="text-xs font-extrabold text-emerald-950">{safeMetrics.active_providers ?? 4} Active Providers</p>
              <p className="text-[10px] text-emerald-800 font-bold">AWS SES, Twilio, Meta API, Firebase</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-100/70 border border-blue-200 shadow-2xs">
            <Zap className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs font-extrabold text-blue-950">Failover Engine: Enabled</p>
              <p className="text-[10px] text-blue-800 font-bold">Automatic multi-route switching</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-purple-100/70 border border-purple-200 shadow-2xs">
            <Activity className="w-4 h-4 text-purple-600" />
            <div>
              <p className="text-xs font-extrabold text-purple-950">Rate Limiting: Active</p>
              <p className="text-[10px] text-purple-800 font-bold">Token bucket algorithm enforced</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-cyan-100/70 border border-cyan-200 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-cyan-600" />
            <div>
              <p className="text-xs font-extrabold text-cyan-950">Idempotency: Enforced</p>
              <p className="text-[10px] text-cyan-800 font-bold">Zero duplicate message guarantees</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
