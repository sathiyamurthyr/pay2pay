"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Receipt,
  Building2,
  Users,
  Store,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  CreditCard,
  Percent,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import {
  SuperDistributorAPI,
  SuperDistributorWalletSummary,
  SuperDistributorWalletLedgerItem
} from "@/services/super-distributor-api";

export default function SuperDistributorWalletPage() {
  const [wallet, setWallet] = useState<SuperDistributorWalletSummary | null>(null);
  const [ledgerItems, setLedgerItems] = useState<SuperDistributorWalletLedgerItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommissionTxn, setSelectedCommissionTxn] = useState<SuperDistributorWalletLedgerItem | null>(null);

  const fetchWalletData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [walletRes, ledgerRes] = await Promise.all([
        SuperDistributorAPI.getWalletSummary(),
        SuperDistributorAPI.getWalletLedger({
          page,
          page_size: pageSize,
          entry_type: entryTypeFilter || undefined,
          service_name: serviceFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      ]);

      setWallet(walletRes);
      setLedgerItems(ledgerRes.items || []);
      setTotalItems(ledgerRes.total || 0);
      setTotalPages(ledgerRes.pages || 1);
    } catch (err: any) {
      console.error("Error fetching wallet data:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load wallet ledger data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, entryTypeFilter, serviceFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleResetFilters = () => {
    setEntryTypeFilter("");
    setServiceFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Master Wallet & Commission Ledger
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-500/20">
              Live DB Balance
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Authoritative financial balance and auditable double-entry transaction ledger for Master Distributor partner.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchWalletData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Sync Balance"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchWalletData(true)}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-[11px] font-bold text-rose-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI WALLET CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Balance */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 backdrop-blur-xl shadow-xl shadow-amber-950/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-300/80 uppercase tracking-wider">
              Available Balance
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-32 bg-white/[0.06] animate-pulse rounded-lg mb-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              ₹{(wallet?.available_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Authoritative Account Balance</span>
          </div>
        </div>

        {/* Card 2: Total Credits */}
        <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Credits
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-28 bg-white/[0.06] animate-pulse rounded-lg mb-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
              ₹{(wallet?.total_credits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-400">
            Commissions & wallet credit additions
          </p>
        </div>

        {/* Card 3: Total Debits */}
        <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Debits
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-28 bg-white/[0.06] animate-pulse rounded-lg mb-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono tracking-tight">
              ₹{(wallet?.total_debits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-400">
            Deductions & settlements
          </p>
        </div>

        {/* Card 4: Account Status */}
        <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Account Status
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {wallet?.status || "ACTIVE"}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {wallet?.currency || "INR"}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400 truncate">
            {wallet?.business_name || "Super Distribution Hub"}
          </p>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ── */}
      <div className="p-4 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] backdrop-blur-xl space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-slate-300">Ledger Filters:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
            {/* Entry Type Filter */}
            <select
              value={entryTypeFilter}
              onChange={(e) => {
                setEntryTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[#090D16] border border-white/[0.08] text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400/50"
            >
              <option value="">All Entries (CR & DR)</option>
              <option value="CREDIT">Credits Only (+)</option>
              <option value="DEBIT">Debits Only (-)</option>
            </select>

            {/* Service Filter */}
            <select
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[#090D16] border border-white/[0.08] text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400/50"
            >
              <option value="">All Services</option>
              <option value="POS_COMMISSION">POS Commission</option>
              <option value="WALLET_TOPUP">Wallet Top-up</option>
              <option value="MANUAL_ADJUSTMENT">Adjustment</option>
            </select>

            {/* Date From */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[#090D16] border border-white/[0.08] text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400/50"
            />

            {/* Date To */}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[#090D16] border border-white/[0.08] text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400/50"
            />
          </div>

          {(entryTypeFilter || serviceFilter || dateFrom || dateTo) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-amber-400 hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── TRANSACTION LEDGER TABLE ── */}
      <div className="rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Wallet Transaction Ledger</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.06] text-slate-400">
              {totalItems} Entries
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Txn ID / Ref</th>
                <th className="py-3 px-4">Service & Narration</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-3 w-28 bg-white/[0.06] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3 w-32 bg-white/[0.06] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3 w-44 bg-white/[0.06] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3 w-16 bg-white/[0.06] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3 w-20 bg-white/[0.06] rounded ml-auto" /></td>
                    <td className="py-4 px-4"><div className="h-3 w-20 bg-white/[0.06] rounded ml-auto" /></td>
                    <td className="py-4 px-4"><div className="h-3 w-16 bg-white/[0.06] rounded mx-auto" /></td>
                    <td className="py-4 px-4"><div className="h-3 w-12 bg-white/[0.06] rounded mx-auto" /></td>
                  </tr>
                ))
              ) : ledgerItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">No Ledger Entries Found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Commissions from successful POS transactions completed by your downstream network will be recorded here automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                ledgerItems.map((item) => {
                  const isCredit = item.entry_type === "CREDIT" || item.entry_type === "CR";
                  return (
                    <tr key={item.id || item.txn_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {item.created_at ? new Date(item.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) : "—"}
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold">
                        <div className="text-slate-200">{item.txn_id}</div>
                        {item.ref_id && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            Ref: {item.ref_id}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                          {item.is_commission ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 text-[10px] font-bold border border-amber-500/20">
                              POS Commission
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-300 text-[10px] font-bold border border-blue-500/20">
                              {item.service_name || "WALLET"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-md line-clamp-1">
                          {item.narration || "Wallet ledger posting"}
                        </p>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCredit
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        }`}>
                          {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {item.entry_type}
                        </span>
                      </td>

                      <td className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        isCredit ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {isCredit ? "+" : "-"}₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                        ₹{item.balance_after.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          {item.status || "SUCCESS"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.is_commission ? (
                          <button
                            onClick={() => setSelectedCommissionTxn(item)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <span className="font-bold text-white">{page}</span> of{" "}
              <span className="font-bold text-white">{totalPages}</span> ({totalItems} total entries)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── COMMISSION DETAILS MODAL ── */}
      {selectedCommissionTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-[#0c1220] border border-amber-500/30 p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedCommissionTxn(null)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">POS Commission Breakdown</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Txn ID: {selectedCommissionTxn.txn_id}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                  Commission Credited
                </span>
                <div className="text-2xl font-extrabold text-white font-mono">
                  +₹{selectedCommissionTxn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {selectedCommissionTxn.status}
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-slate-400">Source POS Reference:</span>
                <span className="font-mono font-bold text-white">
                  {selectedCommissionTxn.pos_transaction_ref || selectedCommissionTxn.ref_id}
                </span>
              </div>

              {selectedCommissionTxn.retailer_name && (
                <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                  <span className="text-slate-400">Retailer Outlet:</span>
                  <span className="font-semibold text-white">
                    {selectedCommissionTxn.retailer_name} (Ref #{selectedCommissionTxn.retailer_ref_id})
                  </span>
                </div>
              )}

              {selectedCommissionTxn.distributor_name && (
                <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                  <span className="text-slate-400">Parent Distributor:</span>
                  <span className="font-semibold text-white">
                    {selectedCommissionTxn.distributor_name} (Ref #{selectedCommissionTxn.distributor_ref_id})
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-slate-400">Balance Before Credit:</span>
                <span className="font-mono text-slate-300">
                  ₹{selectedCommissionTxn.balance_before.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-slate-400">Balance After Credit:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₹{selectedCommissionTxn.balance_after.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Credit Timestamp:</span>
                <span className="text-slate-300">
                  {selectedCommissionTxn.created_at ? new Date(selectedCommissionTxn.created_at).toLocaleString("en-IN") : "—"}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08]">
              <p className="text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                <span className="font-bold text-amber-300">Narration:</span> {selectedCommissionTxn.narration}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
