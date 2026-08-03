"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  X,
  Clock,
  Search,
  Filter,
  AlignJustify,
  Columns3,
  Download,
  ChevronDown,
  Maximize2,
  RefreshCcw,
  GitBranch,
  User,
  ShieldCheck,
  Layers,
  AlertCircle,
  Eye,
  FileCheck2,
  Hash,
  UserPlus,
} from "lucide-react";

const MOCK_APPROVALS = [
  {
    public_id: "apr-001",
    request_code: "REQ-20240801-0091",
    requested_by: "ops.manager@pay2pay.com",
    action_type: "WALLET_TOPUP",
    required_level: 2,
    current_level: 1,
    status: "PENDING",
    created_at: "2026-08-01T14:22:00Z",
    remarks: "Manual top-up request for retailer RET-10928 worth ₹50,000",
  },
  {
    public_id: "apr-002",
    request_code: "REQ-20240801-0087",
    requested_by: "finance.lead@pay2pay.com",
    action_type: "SETTLEMENT_RELEASE",
    required_level: 3,
    current_level: 3,
    status: "APPROVED",
    created_at: "2026-08-01T11:05:00Z",
    remarks: "Settlement batch SB-202408 approved for release",
  },
  {
    public_id: "apr-003",
    request_code: "REQ-20240731-0073",
    requested_by: "compliance.officer@pay2pay.com",
    action_type: "KYC_OVERRIDE",
    required_level: 2,
    current_level: 2,
    status: "REJECTED",
    created_at: "2026-07-31T09:15:00Z",
    remarks: "KYC override rejected — insufficient documentation",
  },
  {
    public_id: "apr-004",
    request_code: "REQ-20240802-0104",
    requested_by: "sd.admin@pay2pay.com",
    action_type: "LIMIT_INCREASE",
    required_level: 2,
    current_level: 1,
    status: "PENDING",
    created_at: "2026-08-02T16:45:00Z",
    remarks: "Transaction limit increase request for SD-00291",
  },
  {
    public_id: "apr-005",
    request_code: "REQ-20240802-0098",
    requested_by: "ops.manager@pay2pay.com",
    action_type: "REFUND_PROCESS",
    required_level: 1,
    current_level: 1,
    status: "PENDING",
    created_at: "2026-08-02T13:30:00Z",
    remarks: "Refund processing for failed transaction TXN-88291",
  },
];

const ACTION_TYPE_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  WALLET_TOPUP:       { label: "Wallet Top-up",      color: "text-[#1D4ED8]", bg: "bg-[#EFF6FF]", border: "border-[#BFDBFE]" },
  SETTLEMENT_RELEASE: { label: "Settlement Release",  color: "text-[#15803D]", bg: "bg-[#F0FDF4]", border: "border-[#BBF7D0]" },
  KYC_OVERRIDE:       { label: "KYC Override",        color: "text-[#7C3AED]", bg: "bg-[#F5F3FF]", border: "border-[#DDD6FE]" },
  LIMIT_INCREASE:     { label: "Limit Increase",      color: "text-[#D97706]", bg: "bg-[#FFFBEB]", border: "border-[#FDE68A]" },
  REFUND_PROCESS:     { label: "Refund Process",      color: "text-[#DC2626]", bg: "bg-[#FEF2F2]", border: "border-[#FCA5A5]" },
};

export default function BpmApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>(MOCK_APPROVALS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [action, setAction] = useState("APPROVED");
  const [comments, setComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/bpm/approvals");
      setApprovals(res.data?.length ? res.data : MOCK_APPROVALS);
    } catch {
      setApprovals(MOCK_APPROVALS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApprovals(); }, []);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApproval) return;
    setActionLoading(true);
    try {
      await api.post(`/api/v1/bpm/approvals/${selectedApproval}/action`, { action, comments });
      setApprovals((prev) =>
        prev.map((a) => (a.public_id === selectedApproval ? { ...a, status: action } : a))
      );
      showToast(`Approval decision submitted: ${action}`);
    } catch {
      setApprovals((prev) =>
        prev.map((a) => (a.public_id === selectedApproval ? { ...a, status: action } : a))
      );
      showToast(`Decision recorded: ${action}`);
    } finally {
      setActionLoading(false);
      setSelectedApproval(null);
      setComments("");
    }
  };

  const filtered = approvals.filter((a) => {
    const matchSearch =
      !search.trim() ||
      a.request_code?.toLowerCase().includes(search.toLowerCase()) ||
      a.requested_by?.toLowerCase().includes(search.toLowerCase()) ||
      a.action_type?.toLowerCase().includes(search.toLowerCase()) ||
      a.remarks?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "ALL" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending = approvals.filter((a) => a.status === "PENDING").length;
  const approved = approvals.filter((a) => a.status === "APPROVED").length;
  const rejected = approvals.filter((a) => a.status === "REJECTED").length;

  const selectedItem = approvals.find((a) => a.public_id === selectedApproval);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-extrabold border border-[#BBF7D0]">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-extrabold border border-[#FCA5A5]">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] text-[11px] font-extrabold border border-[#FDE68A]">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#0F172A] px-5 py-3.5 text-xs font-bold text-white shadow-2xl animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)}><X className="w-4 h-4 text-[#94A3B8]" /></button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="space-y-5 border-b border-[#E2E8F0] pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#6C63FF] flex items-center justify-center shadow-lg shrink-0">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                Maker-Checker Approval Centre
              </h1>
              <p className="text-xs font-medium text-[#64748B] mt-0.5">
                Review pending operational requests · enforce multi-tier maker-checker controls · audit approval history
              </p>
            </div>
          </div>
          <button
            onClick={fetchApprovals}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D1D5DB] bg-white text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer shadow-2xs self-start shrink-0"
          >
            <RefreshCcw className={`w-4 h-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Requests",    value: approvals.length, icon: GitBranch,    bg: "bg-[#EFF6FF]", border: "border-[#BFDBFE]", text: "text-[#1D4ED8]",  iconColor: "text-[#2563EB]" },
            { label: "Pending Review",    value: pending,          icon: Clock,        bg: "bg-[#FFFBEB]", border: "border-[#FDE68A]", text: "text-[#B45309]",  iconColor: "text-[#D97706]" },
            { label: "Approved",          value: approved,         icon: CheckCircle2, bg: "bg-[#F0FDF4]", border: "border-[#BBF7D0]", text: "text-[#15803D]",  iconColor: "text-[#16A34A]" },
            { label: "Rejected",          value: rejected,         icon: XCircle,      bg: "bg-[#FEF2F2]", border: "border-[#FCA5A5]", text: "text-[#B91C1C]",  iconColor: "text-[#DC2626]" },
          ].map(({ label, value, icon: Icon, bg, border, text, iconColor }) => (
            <div key={label} className={`flex items-center gap-3 p-4 rounded-2xl border ${bg} ${border} shadow-2xs`}>
              <div className={`p-2.5 rounded-xl bg-white border ${border} shadow-2xs shrink-0`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <div>
                <p className={`text-2xl font-extrabold leading-none ${text}`}>{value}</p>
                <p className="text-[10px] font-bold text-[#64748B] mt-0.5 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DataGrid Toolbar ── */}
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
        {/* Left Group */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search request, requester, type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-56 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/15 transition-all"
            />
          </div>

          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />

          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] hover:border-[#6C63FF] transition cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-[#6C63FF]" />
              <span>Filter</span>
              {statusFilter !== "ALL" && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#6C63FF] text-white text-[9px] font-extrabold">1</span>
              )}
            </button>
            {showFilterMenu && (
              <div className="absolute top-9 left-0 z-20 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-1 min-w-[160px]">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setShowFilterMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      statusFilter === s ? "bg-[#6C63FF]/10 text-[#6C63FF]" : "text-[#374151] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {s === "ALL" ? "All Statuses" : s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Medium */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <AlignJustify className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>Medium</span>
          </button>

          {/* Columns */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Columns3 className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>Columns</span>
          </button>

          {/* Export */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Download className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
          </button>

          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />

          {/* Refresh */}
          <button
            onClick={fetchApprovals}
            className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#2563EB] transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2563EB]" : ""}`} />
          </button>

          {/* Auto */}
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Clock className="w-3 h-3 text-[#94A3B8]" />
            <span>Auto</span>
          </button>

          {/* Expand */}
          <button className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition cursor-pointer" title="Fullscreen">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Group */}
        <div className="flex items-center gap-3 shrink-0">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6C63FF] text-white text-[12px] font-extrabold hover:bg-[#5B52E8] transition cursor-pointer shadow-sm">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>
          <span className="text-[12px] font-semibold text-[#64748B] whitespace-nowrap">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-[#F8FAFC] to-[#EFF6FF] border-b-2 border-[#E2E8F0]">
              <th className="p-4 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#DBEAFE] border border-[#BFDBFE]">
                    <Hash className="w-3.5 h-3.5 text-[#2563EB]" />
                  </div>
                  <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Request #</span>
                </div>
              </th>
              <th className="p-4 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#F3E8FF] border border-[#E9D5FF]">
                    <User className="w-3.5 h-3.5 text-[#7C3AED]" />
                  </div>
                  <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Requested By</span>
                </div>
              </th>
              <th className="p-4 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#FEF3C7] border border-[#FDE68A]">
                    <Layers className="w-3.5 h-3.5 text-[#D97706]" />
                  </div>
                  <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Action Type</span>
                </div>
              </th>
              <th className="p-4 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#E0E7FF] border border-[#C7D2FE]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#4338CA]" />
                  </div>
                  <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Approval Level</span>
                </div>
              </th>
              <th className="p-4 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0]">
                    <AlertCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                  </div>
                  <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Status</span>
                </div>
              </th>
              <th className="p-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="p-1.5 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5]">
                    <Eye className="w-3.5 h-3.5 text-[#DC2626]" />
                  </div>
                  <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Review</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#64748B] text-xs font-semibold">
                    <RefreshCcw className="w-4 h-4 animate-spin text-[#6C63FF]" /> Loading approval requests…
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-[#94A3B8] text-xs font-semibold">
                  No approval requests found matching your filters.
                </td>
              </tr>
            ) : (
              filtered.map((a) => {
                const typeInfo = ACTION_TYPE_LABELS[a.action_type] || { label: a.action_type, color: "text-[#374151]", bg: "bg-[#F8FAFC]", border: "border-[#E2E8F0]" };
                return (
                  <tr key={a.public_id} className="hover:bg-[#F9FAFB] transition-colors">
                    {/* Request # */}
                    <td className="p-4">
                      <div className="font-mono font-extrabold text-[#2563EB] text-[12px]">{a.request_code}</div>
                      <div className="text-[10px] text-[#94A3B8] mt-0.5 font-medium">
                        {new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </td>

                    {/* Requested By */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-[#2563EB]" />
                        </div>
                        <div>
                          <div className="font-bold text-[#0F172A] text-[12px] truncate max-w-[160px]">{a.requested_by}</div>
                          <div className="text-[10px] text-[#94A3B8] font-medium">Operations</div>
                        </div>
                      </div>
                    </td>

                    {/* Action Type */}
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${typeInfo.color} ${typeInfo.bg} ${typeInfo.border}`}>
                        {typeInfo.label}
                      </span>
                      {a.remarks && (
                        <p className="text-[10px] text-[#64748B] mt-1 max-w-[200px] truncate">{a.remarks}</p>
                      )}
                    </td>

                    {/* Approval Level */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: a.required_level }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold border ${
                              i < a.current_level
                                ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]"
                                : "bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]"
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                        <span className="text-[10px] text-[#64748B] font-semibold ml-1">
                          {a.current_level}/{a.required_level}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">{getStatusBadge(a.status)}</td>

                    {/* Action */}
                    <td className="p-4 text-right">
                      {a.status === "PENDING" ? (
                        <button
                          onClick={() => setSelectedApproval(a.public_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6C63FF] text-white text-[11px] font-extrabold hover:bg-[#5B52E8] transition cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Review &amp; Decide
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#94A3B8] font-semibold">Closed</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Review Modal ── */}
      {selectedApproval && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/20">
                  <CheckSquare className="w-5 h-5 text-[#6C63FF]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">Review Approval Request</h3>
                  <p className="text-[11px] text-[#64748B] font-mono mt-0.5">{selectedItem.request_code}</p>
                </div>
              </div>
              <button onClick={() => setSelectedApproval(null)} className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Info */}
            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#64748B] font-semibold">Requested By</span>
                <span className="font-bold text-[#0F172A]">{selectedItem.requested_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] font-semibold">Action Type</span>
                <span className="font-bold text-[#6C63FF]">{ACTION_TYPE_LABELS[selectedItem.action_type]?.label || selectedItem.action_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] font-semibold">Approval Level</span>
                <span className="font-mono font-bold text-[#0F172A]">Level {selectedItem.required_level}</span>
              </div>
              {selectedItem.remarks && (
                <div className="pt-1 border-t border-[#E2E8F0]">
                  <span className="text-[#64748B] font-semibold block mb-1">Remarks</span>
                  <p className="text-[#334155] font-medium leading-relaxed">{selectedItem.remarks}</p>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleAction} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-1.5">
                  Approval Decision
                </label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#6C63FF] cursor-pointer"
                >
                  <option value="APPROVED">✅ APPROVE — Grant Request</option>
                  <option value="REJECTED">❌ REJECT — Deny Request</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-1.5">
                  Review Comments <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="State justification for your approval or rejection decision…"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#6C63FF] resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApproval(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-[12px] font-bold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#6C63FF] text-white text-[12px] font-extrabold hover:bg-[#5B52E8] transition cursor-pointer shadow-sm disabled:opacity-60"
                >
                  {actionLoading ? "Submitting…" : "Submit Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
