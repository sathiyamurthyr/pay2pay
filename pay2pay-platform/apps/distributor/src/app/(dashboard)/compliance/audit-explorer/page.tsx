"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  ScrollText, Search, RefreshCw, Download, Filter,
  ShieldCheck, UserCheck, Clock, Hash, Globe,
  FileText, Tag, CheckCircle2, AlertTriangle, XCircle,
  AlignJustify, Columns3, ChevronDown, Maximize2,
  RefreshCcw, Activity, Eye, Lock, Unlock,
} from "lucide-react";

const MOCK_LOGS = [
  { public_id:"al-001", created_date:"2026-08-02T23:05:12Z", actor_email:"admin@pay2pay.in",   action:"USER.LOGIN",           resource_type:"AdminUser",    resource_id:"usr-0041-ab12cd", ip_address:"103.21.44.10",  status:"SUCCESS" },
  { public_id:"al-002", created_date:"2026-08-02T22:48:31Z", actor_email:"ops@pay2pay.in",      action:"BATCH.PROCESS",        resource_type:"SettlementBatch",resource_id:"bat-0091-ef34gh",ip_address:"103.21.44.11",  status:"SUCCESS" },
  { public_id:"al-003", created_date:"2026-08-02T22:30:09Z", actor_email:"dev@pay2pay.in",      action:"API_KEY.CREATE",       resource_type:"APIKey",       resource_id:"key-0014-ij56kl", ip_address:"182.74.12.90",  status:"SUCCESS" },
  { public_id:"al-004", created_date:"2026-08-02T21:15:44Z", actor_email:"ops@pay2pay.in",      action:"MERCHANT.KYC_APPROVE", resource_type:"Merchant",     resource_id:"mer-2291-mn78op", ip_address:"103.21.44.11",  status:"SUCCESS" },
  { public_id:"al-005", created_date:"2026-08-02T20:00:22Z", actor_email:"unknown@external.io", action:"USER.LOGIN_FAILED",    resource_type:"AdminUser",    resource_id:"usr-0041-ab12cd", ip_address:"45.129.56.200", status:"FAILED"  },
  { public_id:"al-006", created_date:"2026-08-02T19:42:11Z", actor_email:"admin@pay2pay.in",    action:"ROLE.PERMISSION_EDIT", resource_type:"Role",         resource_id:"rol-0003-qr90st", ip_address:"103.21.44.10",  status:"SUCCESS" },
  { public_id:"al-007", created_date:"2026-08-02T18:30:55Z", actor_email:"dev@pay2pay.in",      action:"WEBHOOK.DELETE",       resource_type:"Webhook",      resource_id:"wh-0008-uv12wx",  ip_address:"182.74.12.90",  status:"WARNING" },
  { public_id:"al-008", created_date:"2026-08-02T17:10:03Z", actor_email:"admin@pay2pay.in",    action:"USER.LOGOUT",          resource_type:"AdminUser",    resource_id:"usr-0041-ab12cd", ip_address:"103.21.44.10",  status:"SUCCESS" },
];

const ACTION_ICONS: Record<string, React.ElementType> = {
  "USER.LOGIN":           UserCheck,
  "USER.LOGIN_FAILED":    Lock,
  "USER.LOGOUT":          Unlock,
  "BATCH.PROCESS":        Activity,
  "API_KEY.CREATE":       FileText,
  "MERCHANT.KYC_APPROVE": ShieldCheck,
  "ROLE.PERMISSION_EDIT": Eye,
  "WEBHOOK.DELETE":       AlertTriangle,
};

function statusStyle(s: string) {
  if (s === "SUCCESS") return { bg:"bg-emerald-500/10 border-emerald-400/20 text-emerald-600", icon: CheckCircle2 };
  if (s === "FAILED")  return { bg:"bg-rose-500/10 border-rose-400/20 text-rose-600",         icon: XCircle       };
  return                      { bg:"bg-amber-500/10 border-amber-400/20 text-amber-600",       icon: AlertTriangle };
}

const COL_HEADERS = [
  { label:"Timestamp",    icon: Clock,       bg:"bg-[#EFF6FF] border-[#BFDBFE]", iconColor:"text-[#2563EB]" },
  { label:"Actor",        icon: UserCheck,   bg:"bg-[#F5F3FF] border-[#DDD6FE]", iconColor:"text-[#7C3AED]" },
  { label:"Action Code",  icon: FileText,    bg:"bg-[#ECFDF5] border-[#A7F3D0]", iconColor:"text-[#059669]" },
  { label:"Resource",     icon: Tag,         bg:"bg-[#FEF3C7] border-[#FDE68A]", iconColor:"text-[#D97706]" },
  { label:"IP Address",   icon: Globe,       bg:"bg-[#E0E7FF] border-[#C7D2FE]", iconColor:"text-[#4338CA]" },
  { label:"Status",       icon: ShieldCheck, bg:"bg-[#FDF4FF] border-[#E9D5FF]", iconColor:"text-[#9333EA]" },
];

export default function AuditExplorerPage() {
  const [logs, setLogs]         = useState<any[]>(MOCK_LOGS);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showFilter, setShowFilter]     = useState(false);
  const [lastUpdated, setLastUpdated]   = useState(new Date());

  const fetchLogs = async (q = search) => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/audit/logs", { params: { search: q } });
      setLogs(res.data?.items?.length ? res.data.items : MOCK_LOGS);
    } catch { setLogs(MOCK_LOGS); }
    finally { setLoading(false); setLastUpdated(new Date()); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchQ = !q || l.actor_email?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q) || l.resource_type?.toLowerCase().includes(q);
    const matchS = statusFilter === "ALL" || l.status === statusFilter;
    return matchQ && matchS;
  });

  const success  = logs.filter((l) => l.status === "SUCCESS").length;
  const failed   = logs.filter((l) => l.status === "FAILED").length;
  const warnings = logs.filter((l) => l.status === "WARNING").length;

  return (
    <div className="space-y-5 pb-16">

      {/* ── Page Header ── */}
      <div className="border-b border-[#E2E8F0] pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center shadow-lg shrink-0">
              <ScrollText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Security Audit Trail Explorer</h1>
              <p className="text-xs font-medium text-[#64748B] mt-0.5">
                Immutable user activity logs · IP tracking · action signatures · resource mutation diffs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => fetchLogs()} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
              <RefreshCcw className={`w-3.5 h-3.5 text-[#6366F1] ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
              <Download className="w-3.5 h-3.5 text-[#6366F1]" /> Export
            </button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:"Total Events",  value:logs.length,  icon:Activity,      bg:"bg-[#EFF6FF]", border:"border-[#BFDBFE]", text:"text-[#1D4ED8]", ic:"text-[#2563EB]" },
            { label:"Success",       value:success,       icon:CheckCircle2,  bg:"bg-[#F0FDF4]", border:"border-[#BBF7D0]", text:"text-[#15803D]", ic:"text-[#16A34A]" },
            { label:"Failed",        value:failed,        icon:XCircle,       bg:"bg-[#FEF2F2]", border:"border-[#FCA5A5]", text:"text-[#B91C1C]", ic:"text-[#DC2626]" },
            { label:"Warnings",      value:warnings,      icon:AlertTriangle, bg:"bg-[#FFFBEB]", border:"border-[#FDE68A]", text:"text-[#B45309]", ic:"text-[#D97706]" },
          ].map(({ label, value, icon: Icon, bg, border, text, ic }) => (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-2xl border ${bg} ${border} shadow-xs`}>
              <div className={`p-2 rounded-xl bg-white border ${border} shrink-0`}><Icon className={`w-3.5 h-3.5 ${ic}`} /></div>
              <div>
                <p className={`text-base font-extrabold leading-none ${text}`}>{value}</p>
                <p className="text-[9px] font-bold text-[#64748B] mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search actor, action, resource…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-56 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
            />
          </div>
          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />
          <div className="relative">
            <button onClick={() => setShowFilter(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
              <Filter className="w-3.5 h-3.5 text-[#6366F1]" /> Status
              {statusFilter !== "ALL" && <span className="px-1.5 py-0.5 rounded-full bg-[#6366F1] text-white text-[9px] font-extrabold">1</span>}
            </button>
            {showFilter && (
              <div className="absolute top-9 left-0 z-20 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-1 min-w-[140px]">
                {["ALL","SUCCESS","FAILED","WARNING"].map((s) => (
                  <button key={s} onClick={() => { setStatusFilter(s); setShowFilter(false); }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${statusFilter===s ? "bg-[#6366F1]/10 text-[#4338CA]" : "text-[#374151] hover:bg-[#F8FAFC]"}`}>
                    {s === "ALL" ? "All Statuses" : s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <AlignJustify className="w-3.5 h-3.5 text-[#6366F1]" /> Medium
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Columns3 className="w-3.5 h-3.5 text-[#6366F1]" /> Columns
          </button>
          <button 
            onClick={() => {
              if (!filtered.length) return;
              const headers = ["Timestamp", "Actor", "Action", "Resource Type", "Resource ID", "IP Address", "Status"];
              const rows = filtered.map((l) => [
                `"${l.created_date || ""}"`,
                `"${l.actor_email || ""}"`,
                `"${l.action || ""}"`,
                `"${l.resource_type || ""}"`,
                `"${l.resource_id || ""}"`,
                `"${l.ip_address || ""}"`,
                `"${l.status || ""}"`,
              ]);
              const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(csvContent));
              link.setAttribute("download", `audit_explorer_export_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6366F1]" /> Export CSV
          </button>
          <button onClick={() => fetchLogs()} className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#6366F1] hover:bg-[#F8FAFC] transition cursor-pointer" title="Refresh">
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#6366F1]" : ""}`} />
          </button>
          <button className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition cursor-pointer" title="Fullscreen">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-[12px] font-semibold text-[#64748B] whitespace-nowrap shrink-0">
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Data Table ── */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#F8FAFC] to-[#EEF2FF] border-b-2 border-[#E2E8F0]">
                {COL_HEADERS.map(({ label, icon: Icon, bg, iconColor }) => (
                  <th key={label} className="px-4 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${bg} shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">{label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr><td colSpan={6} className="py-14 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#64748B] text-xs font-semibold">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#6366F1]" /> Loading audit logs…
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center">
                  <ScrollText className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
                  <p className="text-[#64748B] text-xs font-semibold">No audit logs match your filters.</p>
                </td></tr>
              ) : (
                filtered.map((l, i) => {
                  const st = statusStyle(l.status);
                  const StatusIcon = st.icon;
                  const ActionIcon = ACTION_ICONS[l.action] ?? FileText;
                  return (
                    <tr key={l.public_id} className={`hover:bg-[#F9FAFB] transition-colors ${i % 2 === 0 ? "" : "bg-[#FAFBFF]/50"}`}>
                      {/* Timestamp */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                          <span className="font-mono text-[11px] text-[#334155] font-semibold whitespace-nowrap">
                            {new Date(l.created_date).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", second:"2-digit" })}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-[9px] font-extrabold shrink-0">
                            {(l.actor_email || "S")[0].toUpperCase()}
                          </div>
                          <span className="text-[12px] font-semibold text-[#0F172A] max-w-[160px] truncate">{l.actor_email || "System"}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <ActionIcon className="w-3.5 h-3.5 text-[#6366F1] shrink-0" />
                          <span className="font-mono font-extrabold text-[#4338CA] text-[11px] bg-[#EEF2FF] border border-[#C7D2FE] px-2 py-0.5 rounded-lg">{l.action}</span>
                        </div>
                      </td>

                      {/* Resource */}
                      <td className="px-4 py-3.5">
                        <div>
                          <span className="text-[11px] font-semibold text-[#0F172A]">{l.resource_type}</span>
                          <p className="font-mono text-[10px] text-[#94A3B8] mt-0.5">{l.resource_id?.slice(0, 14)}…</p>
                        </div>
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] text-[#4338CA] bg-[#E0E7FF] border border-[#C7D2FE] px-2 py-0.5 rounded-lg">{l.ip_address}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${st.bg}`}>
                          <StatusIcon className="w-3 h-3" />{l.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-[#F1F5F9] bg-gradient-to-r from-[#F8FAFC] to-[#EEF2FF] text-[11px] font-semibold text-[#64748B]">
            <span>Showing <strong className="text-[#0F172A]">{filtered.length}</strong> of <strong className="text-[#0F172A]">{logs.length}</strong> audit events</span>
            <span className="font-mono text-[10px] text-[#94A3B8]">Updated: {lastUpdated.toLocaleTimeString("en-IN")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
