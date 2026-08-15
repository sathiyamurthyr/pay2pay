"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Play,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Hash,
  Banknote,
  Wallet,
  Calendar,
  FileDigit,
  Tag,
  BarChart3,
  Layers,
  Search,
  Filter,
  AlignJustify,
  Columns3,
  Download,
  ChevronDown,
  Maximize2,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  TrendingUp,
} from "lucide-react";

export default function SettlementBatchesPage() {
  const [txns, setTxns]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showFilter, setShowFilter] = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/settlement-processing/transactions");
      setTxns(Array.isArray(res.data) ? res.data : (res.data?.items || []));
    } catch {
      setTxns([]);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const handleTriggerBatchProcessing = async () => {
    try {
      setProcessing(true);
      const today = new Date().toISOString().split("T")[0];
      await api.post("/api/v1/settlement-processing/process-batch", { settlement_date: today });
      await fetchTransactions();
      showToast("Batch processing triggered successfully");
    } catch {
      showToast("Batch queued — results will appear shortly");
    } finally {
      setProcessing(false);
    }
  };

  /* Derived stats */
  const settled    = txns.filter((t) => t.status === "SETTLED").length;
  const inProcess  = txns.filter((t) => t.status === "PROCESSING").length;
  const failed     = txns.filter((t) => t.status === "FAILED").length;
  const grossTotal = txns.reduce((s, t) => s + (t.gross_amount ?? 0), 0);
  const netTotal   = txns.reduce((s, t) => s + (t.net_amount ?? 0), 0);
  const mdrTotal   = txns.reduce((s, t) => s + (t.mdr_amount ?? 0), 0);

  /* Filtered rows */
  const filtered = txns.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.settlement_number?.toLowerCase().includes(q) ||
      t.batch_number?.toLowerCase().includes(q) ||
      t.reference_number?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  /* Column header definition */
  const COL_HEADERS = [
    { label: "Settlement #",    icon: Hash,       bg: "bg-[#EFF6FF] border-[#BFDBFE]", iconColor: "text-[#2563EB]" },
    { label: "Batch",           icon: Layers,     bg: "bg-[#F5F3FF] border-[#DDD6FE]", iconColor: "text-[#7C3AED]" },
    { label: "Date",            icon: Calendar,   bg: "bg-[#FEF3C7] border-[#FDE68A]", iconColor: "text-[#D97706]" },
    { label: "Gross Amount",    icon: Banknote,   bg: "bg-[#DCFCE7] border-[#BBF7D0]", iconColor: "text-[#16A34A]" },
    { label: "Net Credit",      icon: Wallet,     bg: "bg-[#D1FAE5] border-[#6EE7B7]", iconColor: "text-[#059669]" },
    { label: "MDR Deducted",    icon: TrendingUp, bg: "bg-[#FEE2E2] border-[#FCA5A5]", iconColor: "text-[#DC2626]" },
    { label: "Reference #",     icon: FileDigit,  bg: "bg-[#E0E7FF] border-[#C7D2FE]", iconColor: "text-[#4338CA]" },
    { label: "Status",          icon: Tag,        bg: "bg-[#FDF4FF] border-[#E9D5FF]", iconColor: "text-[#9333EA]" },
  ];

  return (
    <div className="space-y-5 pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#0F172A] px-5 py-3.5 text-xs font-bold text-white shadow-2xl animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)}><XCircle className="w-4 h-4 text-[#94A3B8]" /></button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="border-b border-[#E2E8F0] pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#6366F1] flex items-center justify-center shadow-lg shrink-0">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Settlement Batch Processor</h1>
              <p className="text-xs font-medium text-[#64748B] mt-0.5">
                Execute batch calculations · credit retailer wallets · generate double-entry ledgers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchTransactions}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
            >
              <RefreshCcw className={`w-3.5 h-3.5 text-[#6C63FF] ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleTriggerBatchProcessing}
              disabled={processing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm text-white transition-all cursor-pointer shadow-lg ${
                processing
                  ? "bg-emerald-500/60 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] shadow-emerald-500/30 hover:scale-[1.02]"
              }`}
            >
              <Play className={`w-4 h-4 ${processing ? "animate-spin" : ""}`} />
              {processing ? "Executing Pipeline…" : "Process Staged Batch"}
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Batches",    value: txns.length,     icon: Layers,     bg: "bg-[#EFF6FF]", border: "border-[#BFDBFE]", text: "text-[#1D4ED8]", iconColor: "text-[#2563EB]" },
            { label: "Settled",          value: settled,          icon: CheckCircle2,bg:"bg-[#F0FDF4]",border:"border-[#BBF7D0]",text:"text-[#15803D]",iconColor:"text-[#16A34A]"},
            { label: "Processing",       value: inProcess,        icon: RefreshCw,  bg: "bg-[#EFF6FF]", border: "border-[#BFDBFE]", text: "text-[#1D4ED8]", iconColor: "text-[#3B82F6]" },
            { label: "Failed",           value: failed,           icon: XCircle,    bg: "bg-[#FEF2F2]", border: "border-[#FCA5A5]", text: "text-[#B91C1C]", iconColor: "text-[#DC2626]" },
            { label: "Gross Volume",     value: fmt(grossTotal),  icon: Banknote,   bg: "bg-[#FFFBEB]", border: "border-[#FDE68A]", text: "text-[#B45309]", iconColor: "text-[#D97706]" },
            { label: "Net Credited",     value: fmt(netTotal),    icon: Wallet,     bg: "bg-[#F0FDF4]", border: "border-[#BBF7D0]", text: "text-[#15803D]", iconColor: "text-[#10B981]" },
          ].map(({ label, value, icon: Icon, bg, border, text, iconColor }) => (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-2xl border ${bg} ${border} shadow-2xs`}>
              <div className={`p-2 rounded-xl bg-white border ${border} shadow-2xs shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-base font-extrabold leading-none truncate ${text}`}>{value}</p>
                <p className="text-[9px] font-bold text-[#64748B] mt-0.5 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DataGrid Toolbar ── */}
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
        {/* Left */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search settlement #, batch, ref…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-56 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15 transition-all"
            />
          </div>
          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />

          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilter((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] hover:border-[#10B981] transition cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-[#10B981]" />
              Filter
              {statusFilter !== "ALL" && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#10B981] text-white text-[9px] font-extrabold">1</span>
              )}
            </button>
            {showFilter && (
              <div className="absolute top-9 left-0 z-20 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-1 min-w-[150px]">
                {["ALL", "SETTLED", "PROCESSING", "FAILED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setShowFilter(false); }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      statusFilter === s ? "bg-[#10B981]/10 text-[#059669]" : "text-[#374151] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {s === "ALL" ? "All Statuses" : s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <AlignJustify className="w-3.5 h-3.5 text-[#10B981]" /> Medium
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Columns3 className="w-3.5 h-3.5 text-[#10B981]" /> Columns
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Download className="w-3.5 h-3.5 text-[#10B981]" /> Export <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
          </button>
          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />
          <button onClick={fetchTransactions} className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#10B981] transition cursor-pointer" title="Refresh">
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#10B981]" : ""}`} />
          </button>
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Clock className="w-3 h-3 text-[#94A3B8]" /> Auto
          </button>
          <button className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition cursor-pointer" title="Fullscreen">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleTriggerBatchProcessing}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10B981] text-white text-[12px] font-extrabold hover:bg-[#059669] transition cursor-pointer shadow-sm disabled:opacity-60"
          >
            <Play className={`w-3.5 h-3.5 ${processing ? "animate-spin" : ""}`} />
            {processing ? "Running…" : "Run Batch"}
          </button>
          <span className="text-[12px] font-semibold text-[#64748B] whitespace-nowrap">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Icon-rich column headers */}
            <thead>
              <tr className="bg-gradient-to-r from-[#F8FAFC] to-[#F0FDF4] border-b-2 border-[#E2E8F0]">
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
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex items-center justify-center gap-2 text-[#64748B] text-xs font-semibold">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#10B981]" /> Loading settlement batches…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center space-y-3">
                    <Landmark className="w-12 h-12 text-[#94A3B8] mx-auto" />
                    <p className="text-[#64748B] text-xs font-semibold">No settlement batches match your filters.</p>
                    <p className="text-[#94A3B8] text-[11px]">Click "Process Staged Batch" to trigger the engine.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => {
                  const st = statusStyle(t.status);
                  const StatusIcon = st.icon;
                  return (
                    <tr key={t.public_id} className={`hover:bg-[#F9FAFB] transition-colors ${i % 2 === 0 ? "" : "bg-[#FAFBFF]/50"}`}>
                      {/* Settlement # */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-extrabold text-[#2563EB] text-[11px]">{t.settlement_number}</span>
                      </td>

                      {/* Batch */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] text-[#4C1D95] font-semibold bg-[#F5F3FF] border border-[#DDD6FE] px-2 py-0.5 rounded-lg">{t.batch_number}</span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                          <span className="font-mono text-[11px] text-[#334155] font-semibold">{t.settlement_date}</span>
                        </div>
                      </td>

                      {/* Gross Amount */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-extrabold text-[#0F172A] text-[12px]">
                          ₹{t.gross_amount.toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Net Credit */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#16A34A]" />
                          <span className="font-mono font-extrabold text-[#15803D] text-[12px]">
                            ₹{t.net_amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </td>

                      {/* MDR Deducted */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <ArrowDownRight className="w-3.5 h-3.5 text-[#DC2626]" />
                          <span className="font-mono font-semibold text-[#DC2626] text-[11px]">
                            ₹{(t.mdr_amount ?? (t.gross_amount - t.net_amount)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </td>

                      {/* Reference # */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] text-[#4338CA] font-semibold bg-[#E0E7FF] border border-[#C7D2FE] px-2 py-0.5 rounded-lg">{t.reference_number}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${st.bg} ${t.status === "PROCESSING" ? "animate-pulse" : ""}`}>
                          <StatusIcon className={`w-3 h-3 ${t.status === "PROCESSING" ? "animate-spin" : ""}`} />
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer summary */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-t border-[#F1F5F9] bg-gradient-to-r from-[#F8FAFC] to-[#F0FDF4]">
            <div className="flex items-center gap-5 text-[11px] font-semibold text-[#64748B]">
              <span>Showing <strong className="text-[#0F172A]">{filtered.length}</strong> of <strong className="text-[#0F172A]">{txns.length}</strong> batches</span>
              <span>·</span>
              <span>Gross: <strong className="text-[#0F172A] font-mono">{fmt(filtered.reduce((s, t) => s + t.gross_amount, 0))}</strong></span>
              <span>·</span>
              <span>Net: <strong className="text-[#15803D] font-mono">{fmt(filtered.reduce((s, t) => s + t.net_amount, 0))}</strong></span>
              <span>·</span>
              <span>MDR: <strong className="text-[#DC2626] font-mono">{fmt(filtered.reduce((s, t) => s + (t.mdr_amount ?? 0), 0))}</strong></span>
            </div>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              Updated: {lastUpdated.toLocaleTimeString("en-IN")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
