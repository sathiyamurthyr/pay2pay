"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Settings, Lock, Key, Shield, Globe, Server, Bell, Database,
  ChevronRight, Eye, EyeOff, RefreshCw, Edit2,
} from "lucide-react";

// ─── Mock System Config Data ─────────────────────────────────────
const MOCK_CONFIGS = [
  { public_id: "cfg_001", key: "MAX_DAILY_TXN_LIMIT",       value: "₹5,00,000",       category: "TRANSACTION",  version: 2, is_sensitive: false },
  { public_id: "cfg_002", key: "SETTLEMENT_CUTOFF_TIME",    value: "22:00:00 IST",    category: "SETTLEMENT",   version: 1, is_sensitive: false },
  { public_id: "cfg_003", key: "WALLET_AUTO_RELOAD_MIN",    value: "₹1,000",          category: "WALLET",       version: 1, is_sensitive: false },
  { public_id: "cfg_004", key: "MFA_REQUIRED_ROLES",        value: "PLATFORM_ADMIN",  category: "SECURITY",     version: 3, is_sensitive: false },
  { public_id: "cfg_005", key: "JWT_EXPIRY_MINUTES",        value: "60",              category: "SECURITY",     version: 1, is_sensitive: false },
  { public_id: "cfg_006", key: "API_RATE_LIMIT_PER_MIN",    value: "1000",            category: "API",          version: 2, is_sensitive: false },
  { public_id: "cfg_007", key: "SMTP_HOST",                 value: "smtp.pay2pay.in", category: "NOTIFICATION", version: 1, is_sensitive: false },
  { public_id: "cfg_008", key: "REDIS_CACHE_TTL_SECONDS",   value: "300",             category: "SYSTEM",       version: 1, is_sensitive: false },
  { public_id: "cfg_009", key: "DB_POOL_MAX_CONNECTIONS",   value: "50",              category: "SYSTEM",       version: 1, is_sensitive: false },
  { public_id: "cfg_010", key: "HDFC_API_SECRET_KEY",       value: "••••••••••••",    category: "SECURITY",     version: 4, is_sensitive: true },
];

const CATEGORY_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  TRANSACTION:  { icon: Globe,     color: "#6C63FF", bg: "#EDE9FE", border: "#DDD6FE" },
  SETTLEMENT:   { icon: Database,  color: "#10B981", bg: "#D1FAE5", border: "#6EE7B7" },
  WALLET:       { icon: Shield,    color: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D" },
  SECURITY:     { icon: Lock,      color: "#EF4444", bg: "#FEE2E2", border: "#FECACA" },
  API:          { icon: Server,    color: "#3B82F6", bg: "#DBEAFE", border: "#93C5FD" },
  NOTIFICATION: { icon: Bell,      color: "#8B5CF6", bg: "#F3E8FF", border: "#DDD6FE" },
  SYSTEM:       { icon: Settings,  color: "#64748B", bg: "#F1F5F9", border: "#CBD5E1" },
};

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [showSensitive, setShowSensitive] = useState(false);

  const { data: fetchedConfigs = [], isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await apiClient.get("/settings");
      return res.data;
    },
  });

  const configs = Array.isArray(fetchedConfigs) && fetchedConfigs.length > 0 ? fetchedConfigs : MOCK_CONFIGS;
  const categories = ["ALL", ...Array.from(new Set(configs.map((c: any) => c.category)))];
  const filtered = activeCategory === "ALL" ? configs : configs.filter((c: any) => c.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="ent-page-title">System Settings</h1>
          <p className="ent-caption mt-1">Tenant system configurations & security policy defaults</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSensitive(!showSensitive)}
            className="ent-btn ent-btn-secondary text-[12px]"
          >
            {showSensitive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showSensitive ? "Hide Sensitive" : "Reveal Sensitive"}
          </button>
        </div>
      </div>

      {/* ── Category KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(CATEGORY_ICONS).map(([cat, meta]) => {
          const count = configs.filter((c: any) => c.category === cat).length;
          const Icon = meta.icon;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isActive ? "ALL" : cat)}
              className={`ent-card p-3 text-left transition-all ${isActive ? "ring-2 ring-[#6C63FF] ring-offset-1" : ""}`}
              style={{ borderLeft: `2px solid ${meta.color}` }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: meta.bg }}>
                <Icon style={{ color: meta.color, width: "14px", height: "14px" }} />
              </div>
              <div className="font-mono text-[18px] font-bold text-[#0F172A]">{count}</div>
              <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mt-0.5 truncate">{cat}</p>
            </button>
          );
        })}
      </div>

      {/* ── Settings Table ── */}
      <div className="ent-card overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFBFF]">
          <h3 className="ent-card-title flex items-center gap-2">
            <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center bg-[#EDE9FE]">
              <Settings className="w-3.5 h-3.5 text-[#6C63FF]" />
            </span>
            Configuration Registry
            {activeCategory !== "ALL" && (
              <span className="ent-badge ent-badge-pending ml-1">{activeCategory}</span>
            )}
          </h3>
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`text-[11px] font-semibold text-[#6C63FF] hover:underline ${activeCategory === "ALL" ? "opacity-0 pointer-events-none" : ""}`}
          >
            Clear filter
          </button>
        </div>

        <div className="ent-table-container border-0 rounded-none">
          <table className="ent-table">
            <thead>
              <tr>
                <th>Config Key</th>
                <th>Value</th>
                <th>Category</th>
                <th>Version</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(5)].map((_, j) => (
                      <td key={j}><div className="h-4 bg-[#F1F5F9] rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                        <Settings className="w-5 h-5 text-[#94A3B8]" />
                      </div>
                      <p className="text-sm font-semibold text-[#334155]">No configurations found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c: any) => {
                  const cm = CATEGORY_ICONS[c.category] || CATEGORY_ICONS.SYSTEM;
                  const Icon = cm.icon;
                  const displayValue = c.is_sensitive && !showSensitive ? "••••••••••••" : c.value;
                  return (
                    <tr key={c.public_id}>
                      <td>
                        <div className="flex items-center gap-2">
                          {c.is_sensitive && <Lock className="w-3 h-3 text-[#EF4444] shrink-0" />}
                          <span className="font-mono text-[12px] font-semibold text-[#334155]">{c.key}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`font-mono text-[12px] font-bold ${c.is_sensitive ? "text-[#EF4444]" : "text-[#6C63FF]"}`}>
                          {displayValue}
                        </span>
                      </td>
                      <td>
                        <span
                          className="ent-badge"
                          style={{ background: cm.bg, color: cm.color, border: `1px solid ${cm.border}` }}
                        >
                          <Icon style={{ width: "10px", height: "10px" }} />
                          {c.category}
                        </span>
                      </td>
                      <td className="font-mono text-[11px] text-[#94A3B8]">v{c.version}</td>
                      <td className="text-right">
                        <button className="ent-btn ent-btn-secondary text-[11px] py-1 px-2.5">
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
