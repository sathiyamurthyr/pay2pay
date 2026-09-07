"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import {
  FileText,
  Calendar,
  Search,
  RefreshCw,
  Download,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  User,
  Eye,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lock,
  Mail,
  ShieldCheck,
  Check,
  AlertCircle
} from "lucide-react";

interface StatementSummary {
  total_generated: number;
  total_reconciled: number;
  total_failed: number;
  total_delivered: number;
  total_pending: number;
  total_volume: number;
}

interface StatementItem {
  public_id: string;
  statement_number: string;
  statement_type: "RETAILER" | "ADMIN";
  statement_date: string;
  statement_date_formatted: string;
  period_start: string;
  period_end: string;
  retailer_id?: string;
  retailer_code: string;
  owner_name: string;
  store_name: string;
  pan_number?: string;
  opening_balance: number;
  total_credit: number;
  total_debit: number;
  closing_balance: number;
  total_commission: number;
  total_gst: number;
  transaction_count: number;
  reconciliation_status: "RECONCILED" | "FAILED";
  reconciliation_difference: number;
  pdf_file_path?: string;
  email_recipient?: string;
  email_status: "SENT" | "PENDING" | "FAILED" | "SUPPRESSED_RECONCILIATION_FAILED";
  email_sent_at?: string;
  error_message?: string;
  created_at: string;
}

interface TransactionDetail {
  id?: string;
  txn_id: string;
  created_at?: string;
  date_formatted?: string;
  txn_time?: string;
  description: string;
  service?: string;
  service_name?: string;
  ref_id?: string;
  reference?: string;
  entry_type?: string;
  credit_amount?: number;
  credit?: number;
  debit_amount?: number;
  debit?: number;
  balance_after?: number;
  balance?: number;
  status?: string;
}

interface StatementDetailResponse {
  statement_number: string;
  statement_type: string;
  retailer_code?: string;
  owner_name?: string;
  retailer_name?: string;
  company_name?: string;
  pan_number?: string;
  email?: string;
  email_recipient?: string;
  email_status?: string;
  email_sent_at?: string;
  statement_date: string;
  period_formatted?: string;
  opening_balance: number;
  total_credit: number;
  total_debit: number;
  closing_balance: number;
  total_commission?: number;
  total_gst?: number;
  transaction_count?: number;
  reconciliation_status: string;
  reconciliation_difference: number;
  pdf_file_path?: string;
  error_message?: string;
  transactions?: TransactionDetail[];
}

export default function DailyAccountStatementsPage() {
  // Filters & State
  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [summary, setSummary] = useState<StatementSummary>({
    total_generated: 0,
    total_reconciled: 0,
    total_failed: 0,
    total_delivered: 0,
    total_pending: 0,
    total_volume: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Modals State
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<StatementDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Generate Batch Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genDate, setGenDate] = useState<string>("");
  const [genForce, setGenForce] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<any>(null);

  // Fetch statements from API (invokes Stored Procedure sp_get_daily_statements_admin)
  const fetchStatements = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: 20,
      };
      if (dateFilter) params.statement_date = dateFilter;
      if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get("/statements", { params });
      const data = res.data;
      if (data && data.items) {
        setStatements(data.items);
        setSummary(data.summary || {
          total_generated: 0,
          total_reconciled: 0,
          total_failed: 0,
          total_delivered: 0,
          total_pending: 0,
          total_volume: 0,
        });
        setTotalPages(data.total_pages || 1);
        setTotalRecords(data.total_records || 0);
      }
    } catch (err) {
      console.error("Failed to load statements:", err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  // Open statement detail modal
  const handleOpenDetail = async (statementId: string) => {
    setSelectedStatementId(statementId);
    setLoadingDetail(true);
    setResendSuccess(null);
    try {
      const res = await api.get(`/statements/${statementId}`);
      const d = res.data?.statement || res.data;
      setDetailData(d);
    } catch (err) {
      console.error("Failed to load statement details:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Download Statement PDF
  const handleDownloadPdf = async (statementId: string, stmtNum: string) => {
    try {
      const res = await api.get(`/statements/${statementId}/download`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${stmtNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download PDF statement.");
    }
  };

  // Resend Statement Email
  const handleResendEmail = async (statementId: string) => {
    setResendingEmail(true);
    setResendSuccess(null);
    try {
      const res = await api.post(`/statements/${statementId}/resend`);
      if (res.data?.success) {
        setResendSuccess("Statement email dispatched successfully!");
        fetchStatements();
        // Update local detail state
        if (detailData) {
          setDetailData({ ...detailData, email_status: "SENT" });
        }
      } else {
        alert(res.data?.detail || "Failed to resend email.");
      }
    } catch (err: any) {
      console.error("Failed to resend statement email:", err);
      alert(err.response?.data?.detail || "Failed to resend statement email.");
    } finally {
      setResendingEmail(false);
    }
  };

  // Trigger manual generation batch
  const handleGenerateBatch = async () => {
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await api.post("/statements/generate", {
        statement_date: genDate || undefined,
        force_regenerate: genForce,
      });
      setGenerateResult(res.data);
      fetchStatements();
    } catch (err: any) {
      console.error("Batch generation failed:", err);
      alert(err.response?.data?.detail || "Failed to generate statements batch.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 p-4 md:p-8 space-y-6 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Daily Automatic Account Statements
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  3:00 AM IST Auto-Dispatch
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Bank-style reconciled account statements • Retailer & Admin ledgers • PAN Password Protected PDF
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setGenDate("");
              setGenForce(false);
              setGenerateResult(null);
              setShowGenerateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-900/20 transition-all border border-sky-400/20 active:scale-95"
          >
            <Layers className="w-4 h-4" />
            Generate Statements
          </button>

          <button
            onClick={() => fetchStatements()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Summary / KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Generated */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Generated</div>
          <div className="text-2xl font-extrabold text-white mt-1.5">{summary.total_generated}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-sky-400" /> Statements
          </div>
        </div>

        {/* Reconciled */}
        <div className="bg-slate-900/80 border border-emerald-950/60 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Reconciled</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1.5">{summary.total_reconciled}</div>
          <div className="text-[11px] text-emerald-500/80 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ledger 100% Match
          </div>
        </div>

        {/* Failed / Alert */}
        <div className="bg-slate-900/80 border border-rose-950/60 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Mismatches</div>
          <div className="text-2xl font-extrabold text-rose-400 mt-1.5">{summary.total_failed}</div>
          <div className="text-[11px] text-rose-500/80 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Email Suppressed
          </div>
        </div>

        {/* Delivered via Email */}
        <div className="bg-slate-900/80 border border-blue-950/60 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Delivered</div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1.5">{summary.total_delivered}</div>
          <div className="text-[11px] text-blue-500/80 mt-1 flex items-center gap-1">
            <Mail className="w-3 h-3" /> Email Sent (3 AM)
          </div>
        </div>

        {/* Pending */}
        <div className="bg-slate-900/80 border border-amber-950/60 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pending / Queued</div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1.5">{summary.total_pending}</div>
          <div className="text-[11px] text-amber-500/80 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting Delivery
          </div>
        </div>

        {/* Total Volume */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reconciled Volume</div>
          <div className="text-xl font-extrabold text-sky-400 mt-1.5 truncate">
            ₹{summary.total_volume ? summary.total_volume.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified DR + CR
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, retailer, ref..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
            />
          </div>

          {/* Date Picker */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-all [color-scheme:dark]"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-all"
          >
            <option value="ALL">All Statuses</option>
            <option value="RECONCILED">Reconciled</option>
            <option value="FAILED">Reconciliation Failed</option>
            <option value="SENT">Email Sent</option>
            <option value="PENDING">Email Pending</option>
          </select>

          {/* Reset Filters */}
          {(dateFilter || statusFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setDateFilter("");
                setStatusFilter("ALL");
                setSearchQuery("");
                setPage(1);
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium px-2 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 self-end md:self-center">
          Showing {statements.length} of {totalRecords} statement records
        </div>
      </div>

      {/* ── Statements Table ── */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Statement Reference</th>
                <th className="py-3.5 px-4">Account / Retailer</th>
                <th className="py-3.5 px-4">Period</th>
                <th className="py-3.5 px-4 text-right">Opening (₹)</th>
                <th className="py-3.5 px-4 text-right">Credit (₹)</th>
                <th className="py-3.5 px-4 text-right">Debit (₹)</th>
                <th className="py-3.5 px-4 text-right">Closing (₹)</th>
                <th className="py-3.5 px-4 text-center">Reconciliation</th>
                <th className="py-3.5 px-4 text-center">Email Delivery</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                    Loading daily account statements...
                  </td>
                </tr>
              ) : statements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No statements found for the selected filter criteria.
                  </td>
                </tr>
              ) : (
                statements.map((s) => {
                  const isReconciled = s.reconciliation_status === "RECONCILED";
                  const isSent = s.email_status === "SENT";
                  const isFailed = s.email_status === "FAILED" || s.email_status === "SUPPRESSED_RECONCILIATION_FAILED";

                  return (
                    <tr
                      key={s.public_id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Statement Reference */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white group-hover:text-sky-400 transition-colors">
                          {s.statement_number}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 font-sans text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-medium ${
                              s.statement_type === "ADMIN"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            }`}
                          >
                            {s.statement_type}
                          </span>
                          <span className="text-slate-500 font-mono">{s.transaction_count} Txns</span>
                        </div>
                      </td>

                      {/* Account / Retailer */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-medium text-slate-200 truncate max-w-[170px]">
                          {s.owner_name || s.store_name || "Enterprise Client"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {s.retailer_code || "COMPANY"}
                        </div>
                      </td>

                      {/* Period */}
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        <div>{s.statement_date_formatted || s.statement_date}</div>
                        <div className="text-[10px] text-slate-500">00:00 – 23:59</div>
                      </td>

                      {/* Opening Balance */}
                      <td className="py-3.5 px-4 text-right text-slate-300">
                        ₹{Number(s.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Credit */}
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">
                        + ₹{Number(s.total_credit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Debit */}
                      <td className="py-3.5 px-4 text-right text-rose-400 font-semibold">
                        - ₹{Number(s.total_debit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Closing Balance */}
                      <td className="py-3.5 px-4 text-right font-bold text-sky-400 text-[13px]">
                        ₹{Number(s.closing_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Reconciliation Status */}
                      <td className="py-3.5 px-4 text-center font-sans">
                        {isReconciled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                            <Check className="w-3 h-3" /> Reconciled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Mismatch (₹{s.reconciliation_difference})
                          </span>
                        )}
                      </td>

                      {/* Email Status */}
                      <td className="py-3.5 px-4 text-center font-sans">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-medium">
                            <Mail className="w-3 h-3" /> Sent
                          </span>
                        ) : isFailed ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-medium"
                            title={s.error_message || "Delivery failed or suppressed"}
                          >
                            <AlertCircle className="w-3 h-3" /> Suppressed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(s.public_id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                            title="View Statement Breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownloadPdf(s.public_id, s.statement_number)}
                            className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/20 transition-all"
                            title="Download Protected PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {isReconciled && (
                            <button
                              onClick={() => handleResendEmail(s.public_id)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 transition-all"
                              title="Resend Statement Email"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-sans">
            <div>
              Page {page} of {totalPages} ({totalRecords} records)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL 1: Bank-Style Statement Details ── */}
      {selectedStatementId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bank Account Statement View</h2>
                  <p className="text-xs text-slate-400">
                    {detailData?.statement_number || "Loading statement..."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedStatementId(null);
                  setDetailData(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetail || !detailData ? (
                <div className="py-20 text-center text-slate-400 font-sans">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-sky-400" />
                  Fetching complete ledger and statement transactions...
                </div>
              ) : (
                <>
                  {resendSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {resendSuccess}
                    </div>
                  )}

                  {/* Bank Header Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
                      <div>
                        <div className="text-xl font-black tracking-tight text-white">PAY2PAY</div>
                        <div className="text-xs font-semibold text-slate-400">SUPER REX PRODUCTS PRIVATE LIMITED</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">ACCOUNT STATEMENT</div>
                        <div className="text-xs font-mono text-slate-400">{detailData.statement_number}</div>
                      </div>
                    </div>

                    {/* Account & Period Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs font-sans">
                      <div>
                        <span className="text-slate-500 block">Account Holder</span>
                        <span className="font-semibold text-slate-200">
                          {detailData.retailer_name || detailData.owner_name || detailData.company_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">ID Reference</span>
                        <span className="font-semibold text-slate-200 font-mono">
                          {detailData.retailer_code || "COMPANY-ADMIN"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Statement Date</span>
                        <span className="font-semibold text-slate-200 font-mono">
                          {detailData.statement_date}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Reconciliation</span>
                        <span
                          className={`font-semibold ${
                            detailData.reconciliation_status === "RECONCILED" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          ● {detailData.reconciliation_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Balance Summary (Prominent Closing Balance) ── */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Opening Balance
                      </div>
                      <div className="text-lg font-extrabold text-white mt-1 font-mono">
                        ₹{Number(detailData.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-emerald-950 p-4 rounded-2xl text-center">
                      <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                        Total Credit
                      </div>
                      <div className="text-lg font-extrabold text-emerald-400 mt-1 font-mono">
                        + ₹{Number(detailData.total_credit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-rose-950 p-4 rounded-2xl text-center">
                      <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                        Total Debit
                      </div>
                      <div className="text-lg font-extrabold text-rose-400 mt-1 font-mono">
                        - ₹{Number(detailData.total_debit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Highly Prominent Closing Balance */}
                    <div className="bg-gradient-to-br from-sky-600 to-blue-700 border-2 border-sky-400 p-4 rounded-2xl text-center shadow-lg shadow-sky-900/30">
                      <div className="text-[11px] font-extrabold text-sky-100 uppercase tracking-wider">
                        Closing Balance
                      </div>
                      <div className="text-xl font-black text-white mt-1 font-mono">
                        ₹{Number(detailData.closing_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details Table */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Transaction Ledger ({detailData.transactions?.length || 0} Line Items)</span>
                      <span className="text-slate-500 font-normal">Strict continuous balance verification</span>
                    </div>

                    <div className="border border-slate-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="bg-slate-800/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                            <th className="py-2.5 px-3">Date & Time</th>
                            <th className="py-2.5 px-3">Txn ID</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3">Reference</th>
                            <th className="py-2.5 px-3 text-right">Credit</th>
                            <th className="py-2.5 px-3 text-right">Debit</th>
                            <th className="py-2.5 px-3 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {detailData.transactions && detailData.transactions.length > 0 ? (
                            detailData.transactions.map((tx, idx) => {
                              const cr = Number(tx.credit || tx.credit_amount || 0);
                              const dr = Number(tx.debit || tx.debit_amount || 0);
                              const bal = Number(tx.balance_after || tx.balance || 0);
                              return (
                                <tr key={tx.txn_id || idx} className="hover:bg-slate-800/30">
                                  <td className="py-2 px-3 text-slate-400">{tx.txn_time || tx.date_formatted}</td>
                                  <td className="py-2 px-3 text-white font-semibold">{tx.txn_id}</td>
                                  <td className="py-2 px-3 text-slate-300 font-sans truncate max-w-[180px]">
                                    {tx.description || tx.service || "Transaction"}
                                  </td>
                                  <td className="py-2 px-3 text-slate-400">{tx.reference || tx.ref_id || "—"}</td>
                                  <td className="py-2 px-3 text-right text-emerald-400 font-semibold">
                                    {cr > 0 ? `₹${cr.toFixed(2)}` : "—"}
                                  </td>
                                  <td className="py-2 px-3 text-right text-rose-400 font-semibold">
                                    {dr > 0 ? `₹${dr.toFixed(2)}` : "—"}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-200">
                                    ₹{bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                                No transactions recorded for this date. Closing balance equals opening balance.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Delivery & Security Audit Box */}
                  <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-xs space-y-2 font-sans">
                    <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-sky-400" />
                      PDF Security & Automatic Delivery Status
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-400">
                      <div>
                        <span className="text-slate-500 block">Registered Email</span>
                        <span className="text-slate-300 font-mono">
                          {detailData.email_recipient || detailData.email || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">PDF Protection</span>
                        <span className="text-slate-300 font-semibold text-emerald-400">
                          Encrypted with PAN (No PAN exposed in email)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Email Delivery Status</span>
                        <span
                          className={`font-semibold ${
                            detailData.email_status === "SENT" ? "text-blue-400" : "text-amber-400"
                          }`}
                        >
                          {detailData.email_status || "PENDING"}
                        </span>
                      </div>
                    </div>
                    {detailData.error_message && (
                      <div className="text-rose-400 text-[11px] bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                        Notice: {detailData.error_message}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedStatementId(null);
                  setDetailData(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all"
              >
                Close
              </button>

              <div className="flex items-center gap-2.5">
                {detailData && (
                  <>
                    <button
                      onClick={() => handleDownloadPdf(selectedStatementId!, detailData.statement_number)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-semibold rounded-xl transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>

                    {detailData.reconciliation_status === "RECONCILED" && (
                      <button
                        onClick={() => handleResendEmail(selectedStatementId!)}
                        disabled={resendingEmail}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
                      >
                        <Send className={`w-3.5 h-3.5 ${resendingEmail ? "animate-spin" : ""}`} />
                        {resendingEmail ? "Dispatching..." : "Resend Email"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Trigger Statement Generation Batch ── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5 text-white font-bold">
                <Layers className="w-5 h-5 text-sky-400" />
                <h3>Generate Daily Account Statements</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Target Statement Date (Defaults to Yesterday):
                </label>
                <input
                  type="date"
                  value={genDate}
                  onChange={(e) => setGenDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 [color-scheme:dark]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Statement period: 00:00:00 to 23:59:59 on chosen date.
                </span>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <input
                  type="checkbox"
                  id="forceGen"
                  checked={genForce}
                  onChange={(e) => setGenForce(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                />
                <label htmlFor="forceGen" className="text-slate-300 cursor-pointer">
                  Force Regenerate (Overwrite existing statements & re-deliver email)
                </label>
              </div>

              {generateResult && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-slate-300">
                  <div className="text-emerald-400 font-semibold">
                    ✔ {generateResult.message}
                  </div>
                  {generateResult.stats && (
                    <div className="text-[11px] text-slate-400 font-mono space-y-0.5">
                      <div>Retailers Processed: {generateResult.stats.retailers_processed}</div>
                      <div>Delivered: {generateResult.stats.retailers_delivered}</div>
                      <div>Reconciled: {generateResult.stats.retailers_reconciled}</div>
                      <div>Admin Statement: {generateResult.stats.admin_statement_status}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
              >
                Close
              </button>
              <button
                onClick={handleGenerateBatch}
                disabled={generating}
                className="px-5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-sky-900/20"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...
                  </>
                ) : (
                  "Start Statement Generation"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
