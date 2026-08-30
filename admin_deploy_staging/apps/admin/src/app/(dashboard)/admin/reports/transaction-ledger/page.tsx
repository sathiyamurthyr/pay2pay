"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  BookOpen, Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownLeft, Scale, Building, DollarSign
} from "lucide-react";

interface LedgerSummaryData {
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  total_entries: number;
}

interface LedgerReportRow {
  id: string;
  ledger_id: string;
  transaction_id: string;
  date: string;
  time: string;
  tenant_id: string;
  company_id: string;
  sd_name: string;
  distributor_name: string;
  retailer_name: string;
  service: string;
  ledger_type: string;
  debit: number;
  credit: number;
  balance: number;
  commission: number;
  charges: number;
  gst: number;
  reference: string;
  status: string;
  created_at: string;
}

export default function TransactionLedgerReportPage() {
  const [summary, setSummary] = useState<LedgerSummaryData | null>(null);
  const [rows, setRows] = useState<LedgerReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  const [search, setSearch] = useState<string>("");
  const [entryType, setEntryType] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const fetchLedgerData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "15");
      if (search) params.append("transaction_id", search);
      if (entryType) params.append("entry_type", entryType);
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const [sumRes, listRes] = await Promise.all([
        axios.get(`${getApiBaseUrl()}/admin/reports/transaction-ledger/summary?${params.toString()}`),
        axios.get(`${getApiBaseUrl()}/admin/reports/transaction-ledger?${params.toString()}`)
      ]);

      if (sumRes.data?.data) {
        setSummary(sumRes.data.data);
      }
      if (listRes.data?.data) {
        setRows(listRes.data.data.items || []);
        setTotalPages(listRes.data.data.pagination?.total_pages || 1);
        setTotalRecords(listRes.data.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to load transaction ledger report", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, entryType, fromDate, toDate]);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const response = await axios.get(
        `${getApiBaseUrl()}/admin/reports/transaction-ledger/export?${params.toString()}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Transaction_Ledger_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#0B0F19] text-white min-h-screen">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Transaction Ledger Report</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative financial double-entry ledger showing debit, credit, balance, and opening/closing balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLedgerData}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting CSV..." : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Opening Balance</span>
          <span className="text-xl font-extrabold text-white">
            ₹{summary ? summary.opening_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Start of Period</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Debit</span>
          <span className="text-xl font-extrabold text-rose-400 flex items-center gap-1">
            <ArrowUpRight className="w-5 h-5 shrink-0" />
            ₹{summary ? summary.total_debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-rose-500/80 block mt-1">Outflow</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Credit</span>
          <span className="text-xl font-extrabold text-emerald-400 flex items-center gap-1">
            <ArrowDownLeft className="w-5 h-5 shrink-0" />
            ₹{summary ? summary.total_credit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-emerald-500/80 block mt-1">Inflow</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-purple-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Closing Balance</span>
          <span className="text-xl font-extrabold text-purple-400">
            ₹{summary ? summary.closing_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">{summary?.total_entries || 0} Total Entries</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Transaction ID or Ledger No..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-9 pr-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <select
              value={entryType}
              onChange={(e) => { setEntryType(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-purple-500 outline-none"
            >
              <option value="">All Entries (Debit & Credit)</option>
              <option value="DEBIT">Debit Entries Only</option>
              <option value="CREDIT">Credit Entries Only</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-purple-500 outline-none"
            />
          </div>

        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Ledger ID / Txn ID</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Hierarchy (SD / DIST / Ret)</th>
                <th className="py-3.5 px-4">Service & Type</th>
                <th className="py-3.5 px-4 text-right text-rose-400">Debit (Out)</th>
                <th className="py-3.5 px-4 text-right text-emerald-400">Credit (In)</th>
                <th className="py-3.5 px-4 text-right">Running Balance</th>
                <th className="py-3.5 px-4">Reference</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      Loading authoritative financial ledger...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                    No ledger records found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono">{row.ledger_id}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{row.transaction_id}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{row.date}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{row.time}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-blue-400">{row.sd_name}</div>
                      <div className="text-[11px] text-slate-400">{row.distributor_name} • {row.retailer_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{row.service}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{row.ledger_type}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                      {row.debit > 0 ? `₹${row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {row.credit > 0 ? `₹${row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-400">
                      ₹{row.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{row.reference}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{rows.length}</strong> of <strong className="text-white">{totalRecords}</strong> ledger entries
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
