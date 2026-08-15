"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  Receipt, Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight,
  TrendingUp, CheckCircle2, Clock, AlertTriangle, Building, Eye, Landmark
} from "lucide-react";
import { PayoutTransactionDetailDrawer, PayoutTransactionDetail } from "@/components/reports/PayoutTransactionDetailDrawer";

interface SummaryData {
  total_transactions: number;
  total_payout_amount: number;
  total_charges: number;
  total_gst: number;
  total_commission: number;
  successful_count: number;
  successful_amount: number;
  pending_count: number;
  pending_amount: number;
  failed_count: number;
  failed_amount: number;
}

interface PayoutReportRow {
  id: string;
  transaction_id: string;
  payout_id: string;
  transaction_date: string;
  transaction_time: string;
  tenant_id: string;
  company_id: string;
  sd_name: string;
  distributor_name: string;
  retailer_name: string;
  customer_name: string;
  service: string;
  amount: number;
  charges: number;
  gst: number;
  commission: number;
  net_amount: number;
  payout_amount: number;
  bank_name: string;
  account_masked: string;
  ifsc: string;
  utr: string;
  payment_mode: string;
  status: string;
  settlement_status: string;
  created_at: string;
  completed_at: string;
}

export default function PayoutTransactionsReportPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [rows, setRows] = useState<PayoutReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [modeFilter, setModeFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<PayoutTransactionDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "15");
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (modeFilter) params.append("payment_mode", modeFilter);
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const [sumRes, listRes] = await Promise.all([
        axios.get(`${getApiBaseUrl()}/admin/reports/payout-transactions/summary?${params.toString()}`),
        axios.get(`${getApiBaseUrl()}/admin/reports/payout-transactions?${params.toString()}`)
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
      console.error("Failed to load payout transactions report", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, modeFilter, fromDate, toDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const response = await axios.get(
        `${getApiBaseUrl()}/admin/reports/payout-transactions/export?${params.toString()}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Payout_Transaction_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  };

  const openRowDetails = async (txId: string) => {
    setSelectedTxId(txId);
    setDrawerLoading(true);
    try {
      const res = await axios.get(`${getApiBaseUrl()}/admin/reports/payout-transactions/${txId}/details`);
      if (res.data?.data) {
        setDrawerData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch transaction details", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#0B0F19] text-white min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Payout Transaction Report</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Searchable, auditable real-time view of all payout and settlement transactions across SD, Distributor, and Retailer tiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportData}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting CSV..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Payout Volume</span>
          <span className="text-xl font-extrabold text-white">
            ₹{summary ? summary.total_payout_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">{summary?.total_transactions || 0} Transactions</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Successful</span>
          <span className="text-xl font-extrabold text-emerald-400">
            ₹{summary ? summary.successful_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-emerald-500/80 block mt-1">{summary?.successful_count || 0} Settled</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Pending / Processing</span>
          <span className="text-xl font-extrabold text-amber-400">
            ₹{summary ? summary.pending_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-amber-500/80 block mt-1">{summary?.pending_count || 0} Pending</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Failed / Rejected</span>
          <span className="text-xl font-extrabold text-rose-400">
            ₹{summary ? summary.failed_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-rose-500/80 block mt-1">{summary?.failed_count || 0} Failed</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Charges & GST</span>
          <span className="text-xl font-extrabold text-blue-400">
            ₹{summary ? (summary.total_charges + summary.total_gst).toFixed(2) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Comm: ₹{summary?.total_commission.toFixed(2) || "0.00"}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          
          <div className="relative col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Txn ID, UTR, Payout ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-9 pr-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-blue-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PENDING">PENDING</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          <div>
            <select
              value={modeFilter}
              onChange={(e) => { setModeFilter(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-blue-500 outline-none"
            >
              <option value="">All Modes</option>
              <option value="IMPS">IMPS</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="UPI">UPI</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-blue-500 outline-none"
            />
          </div>

        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Transaction / Payout ID</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">SD / Distributor</th>
                <th className="py-3.5 px-4">Retailer</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-right">Charges & GST</th>
                <th className="py-3.5 px-4 text-right">Net Debited</th>
                <th className="py-3.5 px-4">Beneficiary Bank</th>
                <th className="py-3.5 px-4">UTR</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Fetching real-time payout transactions...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-medium">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openRowDetails(row.transaction_id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono">{row.transaction_id}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{row.payout_id}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{row.transaction_date}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{row.transaction_time}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-blue-400">{row.sd_name}</div>
                      <div className="text-[11px] text-indigo-400">{row.distributor_name}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">{row.retailer_name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ₹{row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      ₹{(row.charges + row.gst).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">
                      ₹{row.net_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-300">{row.bank_name}</div>
                      <div className="text-[11px] font-mono text-amber-400/90">{row.account_masked}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-emerald-400">{row.utr}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : row.status === "FAILED"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{rows.length}</strong> of <strong className="text-white">{totalRecords}</strong> entries
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

      <PayoutTransactionDetailDrawer
        open={!!selectedTxId}
        onClose={() => { setSelectedTxId(null); setDrawerData(null); }}
        data={drawerData}
        loading={drawerLoading}
      />

    </div>
  );
}
