"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import {
  ScrollText, Filter, Eye, ShieldCheck, User, LogIn, Plus, Edit2,
  Trash2, CheckCircle2, XCircle, Upload, Download, AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

// ─── Mock Audit Log Data ─────────────────────────────────────────
const MOCK_LOGS = [
  { public_id: "log_001", action: "LOGIN",    actor_email: "rajesh@pay2pay.in", resource_type: "USER_SESSION",    resource_id: "ses_001", ip_address: "203.99.44.12",  created_at: "2026-07-30T08:15:00Z", details: { session_id: "ses_001", user_agent: "Chrome/115" } },
  { public_id: "log_002", action: "CREATE",   actor_email: "rajesh@pay2pay.in", resource_type: "COMPANY",         resource_id: "comp_016", ip_address: "203.99.44.12", created_at: "2026-07-30T09:30:00Z", details: { company_name: "FinEdge Ltd", tenant_code: "FINEDGE" } },
  { public_id: "log_003", action: "APPROVE",  actor_email: "priya@pay2pay.in",  resource_type: "SETTLEMENT_BATCH",resource_id: "batch_055", ip_address: "10.0.0.45",   created_at: "2026-07-30T10:05:00Z", details: { amount: "₹14,50,000", bank: "HDFC Nodal" } },
  { public_id: "log_004", action: "UPDATE",   actor_email: "anand@pay2pay.in",  resource_type: "COMMISSION_RULE", resource_id: "rule_007", ip_address: "10.0.0.52",    created_at: "2026-07-30T11:20:00Z", details: { changed_field: "rate", old_value: "1.2%", new_value: "1.5%" } },
  { public_id: "log_005", action: "REJECT",   actor_email: "priya@pay2pay.in",  resource_type: "COMPANY",         resource_id: "comp_009", ip_address: "10.0.0.45",    created_at: "2026-07-30T12:00:00Z", details: { reason: "KYC documents incomplete" } },
  { public_id: "log_006", action: "EXPORT",   actor_email: "rajesh@pay2pay.in", resource_type: "AUDIT_LOG",       resource_id: "export_001", ip_address: "203.99.44.12", created_at: "2026-07-30T12:45:00Z", details: { format: "CSV", records: 500 } },
  { public_id: "log_007", action: "DELETE",   actor_email: "rajesh@pay2pay.in", resource_type: "USER",            resource_id: "usr_099", ip_address: "203.99.44.12",  created_at: "2026-07-30T13:15:00Z", details: { reason: "Terminated employee" } },
  { public_id: "log_008", action: "LOGIN",    actor_email: "kavitha@pay2pay.in", resource_type: "USER_SESSION",   resource_id: "ses_002", ip_address: "117.99.22.5",  created_at: "2026-07-30T14:00:00Z", details: { device: "Mobile — Safari" } },
];

const ACTION_CONFIG: Record<string, { icon: React.ElementType; badge: string; label: string }> = {
  LOGIN:   { icon: LogIn,        badge: "success",    label: "Login" },
  LOGOUT:  { icon: User,         badge: "inactive",   label: "Logout" },
  CREATE:  { icon: Plus,         badge: "success",    label: "Create" },
  UPDATE:  { icon: Edit2,        badge: "processing", label: "Update" },
  DELETE:  { icon: Trash2,       badge: "error",      label: "Delete" },
  APPROVE: { icon: CheckCircle2, badge: "success",    label: "Approve" },
  REJECT:  { icon: XCircle,      badge: "error",      label: "Reject" },
  EXPORT:  { icon: Download,     badge: "pending",    label: "Export" },
  IMPORT:  { icon: Upload,       badge: "pending",    label: "Import" },
};

export default function AuditLogsPage() {
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data: fetchedLogs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", selectedAction],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAction) params.append("action", selectedAction);
      const res = await apiClient.get(`/audit-logs?${params.toString()}`);
      return res.data;
    },
  });

  const auditLogs = Array.isArray(fetchedLogs) && fetchedLogs.length > 0 ? fetchedLogs : MOCK_LOGS;
  const filtered = selectedAction ? auditLogs.filter((l: any) => l.action === selectedAction) : auditLogs;

  // KPI summary
  const creates  = auditLogs.filter((l: any) => l.action === "CREATE").length;
  const approves = auditLogs.filter((l: any) => l.action === "APPROVE").length;
  const rejects  = auditLogs.filter((l: any) => l.action === "REJECT").length;
  const logins   = auditLogs.filter((l: any) => l.action === "LOGIN").length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="ent-page-title">Enterprise Audit Trail</h1>
          <p className="ent-caption mt-1">
            Immutable log of every platform action & security event
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Filter className="w-4 h-4 text-[#64748B]" />
          <select
            className="ent-input text-[12px] w-auto pr-8 font-semibold"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            <option value="">All Actions</option>
            {Object.entries(ACTION_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: auditLogs.length, color: "#6C63FF", bg: "#EDE9FE", icon: ScrollText },
          { label: "Creates",      value: creates,          color: "#10B981", bg: "#D1FAE5", icon: Plus },
          { label: "Approvals",    value: approves,         color: "#3B82F6", bg: "#DBEAFE", icon: CheckCircle2 },
          { label: "Rejections",   value: rejects,          color: "#EF4444", bg: "#FEE2E2", icon: XCircle },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="ent-card p-4" style={{ borderLeft: `3px solid ${color}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-4.5 h-4.5" style={{ color, width: "18px", height: "18px" }} />
              </div>
            </div>
            <div className="font-mono text-[24px] font-extrabold text-[#0F172A] tabular-nums">{value}</div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Audit Table ── */}
      <div className="ent-card overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFBFF]">
          <h3 className="ent-card-title flex items-center gap-2">
            <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center bg-[#EDE9FE]">
              <ScrollText className="w-3.5 h-3.5 text-[#6C63FF]" />
            </span>
            Audit Event Trail
          </h3>
          <span className="text-[11px] font-mono text-[#94A3B8]">
            Showing {filtered.length} of {auditLogs.length} events
          </span>
        </div>

        {/* Table */}
        <div className="ent-table-container border-0 rounded-none">
          <table className="ent-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource Type</th>
                <th>IP Address</th>
                <th className="text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="h-4 bg-[#F1F5F9] rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                        <ScrollText className="w-5 h-5 text-[#94A3B8]" />
                      </div>
                      <p className="text-sm font-semibold text-[#334155]">No audit events recorded</p>
                      <p className="text-xs text-[#94A3B8]">Try adjusting your filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((log: any) => {
                  const ac = ACTION_CONFIG[log.action] || { icon: AlertTriangle, badge: "inactive", label: log.action };
                  const AIcon = ac.icon;
                  return (
                    <tr key={log.public_id}>
                      <td className="font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[11px] shrink-0"
                            style={{ background: "linear-gradient(135deg, #6C63FF, #4F46E5)" }}
                          >
                            {log.actor_email?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                          <span className="text-[12px] font-semibold text-[#0F172A]">
                            {log.actor_email || "System"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`ent-badge ent-badge-${ac.badge}`}>
                          <AIcon className="w-3 h-3" />
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-[12px] font-semibold text-[#6C63FF]">
                          {log.resource_type}
                        </span>
                      </td>
                      <td className="font-mono text-[11px] text-[#64748B]">
                        {log.ip_address || "—"}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="ent-btn ent-btn-secondary text-[11px] py-1 px-2.5"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" /> View
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

      {/* ── Log Details Modal ── */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event — ${selectedLog?.action}`}
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              {[
                { label: "Event ID",     value: selectedLog.public_id },
                { label: "Resource ID",  value: selectedLog.resource_id || "N/A" },
                { label: "Actor",        value: selectedLog.actor_email || "System" },
                { label: "Timestamp",    value: formatDate(selectedLog.created_at) },
                { label: "IP Address",   value: selectedLog.ip_address || "N/A" },
                { label: "Resource",     value: selectedLog.resource_type },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{label}</span>
                  <p className="text-[12px] font-semibold text-[#0F172A] font-mono mt-0.5 truncate">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <span className="ent-label">Payload Details</span>
              <pre className="mt-1.5 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#065F46] font-mono overflow-x-auto leading-relaxed">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
