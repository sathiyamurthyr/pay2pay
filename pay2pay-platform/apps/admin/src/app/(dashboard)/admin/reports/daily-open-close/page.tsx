"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FileText, Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight,
  ShieldCheck, AlertTriangle, Building, GitMerge, CheckCircle2
} from "lucide-react";

interface DailyOpenCloseSummaryData {
  business_date: string;
  opening_balance: number;
  total_credits: number;
  total_debits: number;
  total_payouts: number;
  total_charges: number;
  total_gst: number;
  closing_balance: number;
  reconciliation_summary: {
    matched_count: number;
    mismatch_count: number;
    pending_count: number;
    reconciliation_status: string;
  };
}

interface DailyOpenCloseRow {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  tenant_id: string;
  company_id: string;
  parent_entity: string;
  business_date: string;
  opening_balance: number;
  total_credits: number;
  total_debits: number;
  payouts: number;
  charges: number;
  gst: number;
  adjustments: number;
  closing_balance: number;
  transaction_count: number;
  successful_count: number;
  failed_count: number;
  pending_count: number;
  reversed_count: number;
  settlement_amount: number;
  settled_amount: number;
  pending_settlement: number;
  expected_closing_balance: number;
  actual_closing_balance: number;
  difference: number;
  reconciliation_status: string;
}

export default function DailyOpenCloseReportPage() {
  const [summary, setSummary] = useState<DailyOpenCloseSummaryData | null>(null);
  const [rows, setRows] = useState<DailyOpenCloseRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Filters
  const [businessDate, setBusinessDate] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const fetchReconciliationData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "15");
      if (businessDate) params.append("business_date", businessDate);
      if (entityType) params.append("entity_type", entityType);

      const [sumRes, listRes] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/api/v1/admin/reports/daily-open-close/summary?${params.toString()}`),
        axios.get(`http://127.0.0.1:8000/api/v1/admin/reports/daily-open-close?${params.toString()}`)
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
      console.error("Failed to load daily open close report", err);
    } finally {
      setLoading(false);
    }
  }, [page, businessDate, entityType]);

  useEffect(() => {
    fetchReconciliationData();
  }, [fetchReconciliationData]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (businessDate) params.append("business_date", businessDate);
      if (entityType) params.append("entity_type", entityType);

      const response = await axios.get(
        `http://127.0.0.1:8000/api/v1/admin/reports/daily-open-close/export?${params.toString()}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Daily_Open_Close_Reconciliation_${businessDate || "Today"}.csv`);
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
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Daily Open & Close Reconciliation</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Operational and financial opening/closing balance reconciliation across SD → Distributor → Retailer hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReconciliationData}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-600/25 transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting CSV..." : "Export Recon CSV"}
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Opening Balance</span>
          <span className="text-xl font-extrabold text-white">
            ₹{summary ? summary.opening_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-cyan-400 font-semibold block mt-1">{summary?.business_date}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Credits</span>
          <span className="text-xl font-extrabold text-emerald-400">
            +₹{summary ? summary.total_credits.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Inflow Activity</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Debits & Payouts</span>
          <span className="text-xl font-extrabold text-rose-400">
            -₹{summary ? (summary.total_debits + summary.total_payouts).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Outflow Activity</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-cyan-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Closing Balance</span>
          <span className="text-xl font-extrabold text-cyan-400">
            ₹{summary ? summary.closing_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">End of Business Day</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Reconciliation Status</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {summary?.reconciliation_summary?.reconciliation_status || "MATCHED"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            {summary?.reconciliation_summary?.matched_count || 0} Matched • 0 Mismatches
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-300 shrink-0">Filter Entity Hierarchy:</span>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="h-9 px-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-cyan-400 outline-none focus:border-cyan-500 w-full sm:w-48"
          >
            <option value="ALL">ALL (SD + DIST + RETAILER)</option>
            <option value="SD">Super Distributor (SD)</option>
            <option value="DIST">Distributor (DIST)</option>
            <option value="RETAILER">Retailer</option>
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-300 shrink-0">Business Date:</span>
          <input
            type="date"
            value={businessDate}
            onChange={(e) => { setBusinessDate(e.target.value); setPage(1); }}
            className="h-9 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Entity ID & Name</th>
                <th className="py-3.5 px-4">Entity Type</th>
                <th className="py-3.5 px-4">Parent Entity</th>
                <th className="py-3.5 px-4 text-right">Opening Balance</th>
                <th className="py-3.5 px-4 text-right text-emerald-400">+ Credits</th>
                <th className="py-3.5 px-4 text-right text-rose-400">- Debits & Payouts</th>
                <th className="py-3.5 px-4 text-right text-slate-400">- Fees & GST</th>
                <th className="py-3.5 px-4 text-right text-cyan-400">Closing Balance</th>
                <th className="py-3.5 px-4 text-right">Difference</th>
                <th className="py-3.5 px-4">Recon Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      Reconciling daily open & close balances across hierarchy...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                    No reconciliation records found for the selected entity type.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.entity_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{row.entity_name}</div>
                      <div className="text-[11px] font-mono text-cyan-400">{row.entity_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        row.entity_type === "SD"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : row.entity_type === "DIST"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      }`}>
                        {row.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-400">{row.parent_entity}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ₹{row.opening_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      +₹{row.total_credits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                      -₹{(row.total_debits + row.payouts).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      -₹{(row.charges + row.gst).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-cyan-400">
                      ₹{row.closing_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      ₹{row.difference.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {row.reconciliation_status}
                      </span>
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
            Showing <strong className="text-white">{rows.length}</strong> reconciled entities
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
