"use client";

import React, { useState, useEffect } from "react";
import {
  ReceiptText,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Wallet,
  Calendar,
  Building2,
  Users
} from "lucide-react";
import {
  SuperDistributorAPI,
  SuperDistributorTransactionItem,
  MappedDistributorItem
} from "@/services/super-distributor-api";

export default function SuperDistributorTransactionsPage() {
  const [items, setItems] = useState<SuperDistributorTransactionItem[]>([]);
  const [distributors, setDistributors] = useState<MappedDistributorItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [summary, setSummary] = useState<any>(null);

  // Filters
  const [distFilter, setDistFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [txnSearch, setTxnSearch] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDistributors = async () => {
    try {
      const res = await SuperDistributorAPI.listDistributors({ page_size: 100 });
      setDistributors(res.items || []);
    } catch (err) {
      console.error("Error loading distributors list:", err);
    }
  };

  const fetchTransactions = async (targetPage = page) => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await SuperDistributorAPI.getTransactions({
        page: targetPage,
        page_size: pageSize,
        distributor_ref_id: distFilter !== "ALL" ? Number(distFilter) : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        txn_id: txnSearch.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });

      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.total_pages || 1);
      setSummary(res.summary || null);
    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDistributors();
  }, []);

  useEffect(() => {
    fetchTransactions(1);
  }, [distFilter, statusFilter, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Network Transactions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-500/20">
              {total} Transactions
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time auditable ledger of all POS transactions processed across your mapped distributors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchTransactions(page)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── SUMMARY BANNER ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-emerald-500/10 border border-amber-500/20 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Filtered Volume</span>
            <span className="text-sm font-black text-amber-400">
              ₹{(Number(summary.total_volume) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Commission Earned</span>
            <span className="text-sm font-black text-emerald-400">
              ₹{(Number(summary.total_commission) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Success Count</span>
            <span className="text-sm font-bold text-slate-200">{summary.success_count || 0}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Failed Count</span>
            <span className="text-sm font-bold text-rose-400">{summary.failed_count || 0}</span>
          </div>
        </div>
      )}

      {/* ── FILTER & SEARCH CONTROLS ── */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Txn ID / Ref..."
              value={txnSearch}
              onChange={(e) => setTxnSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
            />
          </form>

          <div>
            <select
              value={distFilter}
              onChange={(e) => setDistFilter(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400/50"
            >
              <option value="ALL">All Mapped Distributors</option>
              {distributors.map((d) => (
                <option key={d.distributor_ref_id} value={d.distributor_ref_id}>
                  {d.business_name} ({d.distributor_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-400/50"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-400/50"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchTransactions(1)} className="font-bold underline text-rose-200">
            Retry
          </button>
        </div>
      )}

      {/* ── TRANSACTIONS TABLE ── */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-white/[0.02] border border-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ReceiptText className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No Transactions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No transactions matching your filter criteria were recorded for your mapped network.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Txn ID / Ref</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Hierarchy Attribution</th>
                  <th className="p-4">Service / Mode</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-right">SD Commission</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.map((tx) => (
                  <tr key={tx.id || tx.txn_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-mono">
                      <p className="font-bold text-slate-200">{tx.txn_id}</p>
                      {tx.ref_id && <p className="text-[10px] text-slate-500">{tx.ref_id}</p>}
                    </td>

                    <td className="p-4 text-slate-300">
                      {tx.created_at ? new Date(tx.created_at).toLocaleString("en-IN") : "—"}
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-amber-300">{tx.distributor_name || `Dist #${tx.distributor_ref_id || "—"}`}</p>
                        <p className="text-[10px] text-slate-400">{tx.retailer_name || `Retailer #${tx.retailer_ref_id || "—"}`}</p>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] font-bold text-slate-300 text-[11px]">
                        {tx.payment_mode || tx.card_type || tx.service_name || "POS"}
                      </span>
                    </td>

                    <td className="p-4 text-right font-black text-slate-100 text-sm">
                      ₹{(Number(tx.transaction_amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-right font-extrabold text-emerald-400">
                      ₹{(Number(tx.commission_earned) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-center">
                      {tx.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Success
                        </span>
                      ) : tx.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertCircle className="w-3 h-3" /> {tx.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION BAR ── */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/[0.08] bg-white/[0.01] flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages} ({total} total records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchTransactions(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchTransactions(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
