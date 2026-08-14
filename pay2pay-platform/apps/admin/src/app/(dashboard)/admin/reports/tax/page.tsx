"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Scale, Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight,
  FileText, Calendar, Building, Landmark
} from "lucide-react";

interface TaxSummaryData {
  financial_year: string;
  total_transactions: number;
  total_taxable_amount: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_gst: number;
  total_charges: number;
}

interface TaxReportRow {
  id: string;
  transaction_id: string;
  transaction_date: string;
  tenant_id: string;
  company_id: string;
  entity_type: string;
  entity_name: string;
  gst_number: string;
  service: string;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_gst: number;
  total_charges: number;
  invoice_reference: string;
  status: string;
}

export default function TaxReportPage() {
  const [summary, setSummary] = useState<TaxSummaryData | null>(null);
  const [rows, setRows] = useState<TaxReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Financial Year Filter
  const [financialYear, setFinancialYear] = useState<string>("FY 2025-26");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const fetchTaxData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "15");
      if (financialYear) params.append("financial_year", financialYear);

      const [sumRes, listRes] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/api/v1/admin/reports/tax/summary?${params.toString()}`),
        axios.get(`http://127.0.0.1:8000/api/v1/admin/reports/tax?${params.toString()}`)
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
      console.error("Failed to load tax report", err);
    } finally {
      setLoading(false);
    }
  }, [page, financialYear]);

  useEffect(() => {
    fetchTaxData();
  }, [fetchTaxData]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (financialYear) params.append("financial_year", financialYear);

      const response = await axios.get(
        `http://127.0.0.1:8000/api/v1/admin/reports/tax/export?${params.toString()}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Tax_GST_Report_${financialYear.replace(" ", "_")}.csv`);
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
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Enterprise Tax & GST Report</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Indian Financial Year (April 1 → March 31) GST tax breakdown, CGST, SGST, IGST, and service fee taxes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTaxData}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs font-bold text-white shadow-lg shadow-amber-600/25 transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting CSV..." : "Export GST CSV"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Taxable Amount</span>
          <span className="text-xl font-extrabold text-white">
            ₹{summary ? summary.total_taxable_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[11px] text-amber-400 font-semibold block mt-1">{summary?.financial_year || "FY 2025-26"}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">CGST (9%)</span>
          <span className="text-xl font-extrabold text-blue-400">
            ₹{summary ? summary.total_cgst.toFixed(2) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Central GST</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-indigo-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">SGST (9%)</span>
          <span className="text-xl font-extrabold text-indigo-400">
            ₹{summary ? summary.total_sgst.toFixed(2) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">State GST</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total GST (18%)</span>
          <span className="text-xl font-extrabold text-amber-400">
            ₹{summary ? summary.total_gst.toFixed(2) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">{summary?.total_transactions || 0} Transactions</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Charges Collected</span>
          <span className="text-xl font-extrabold text-slate-200">
            ₹{summary ? summary.total_charges.toFixed(2) : "0.00"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Gross Service Fee</span>
        </div>
      </div>

      {/* Financial Year Selector */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-300">Select Financial Calendar:</span>
          <select
            value={financialYear}
            onChange={(e) => { setFinancialYear(e.target.value); setPage(1); }}
            className="h-9 px-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 outline-none focus:border-amber-500"
          >
            <option value="FY 2026-27">FY 2026-27 (Apr 1, 2026 - Mar 31, 2027)</option>
            <option value="FY 2025-26">FY 2025-26 (Apr 1, 2025 - Mar 31, 2026)</option>
            <option value="FY 2024-25">FY 2024-25 (Apr 1, 2024 - Mar 31, 2025)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Calculated strictly per Indian GST Audit Standard Section 35(5).
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Entity & Type</th>
                <th className="py-3.5 px-4">GSTIN Number</th>
                <th className="py-3.5 px-4 text-right">Taxable Amount</th>
                <th className="py-3.5 px-4 text-right">CGST</th>
                <th className="py-3.5 px-4 text-right">SGST</th>
                <th className="py-3.5 px-4 text-right text-amber-400">Total GST</th>
                <th className="py-3.5 px-4 text-right">Charges</th>
                <th className="py-3.5 px-4">Invoice Ref</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      Computing GST and tax compliance ledger...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-medium">
                    No tax records found for the selected financial year.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white font-mono">{row.transaction_id}</td>
                    <td className="py-3 px-4 text-slate-300">{row.transaction_date}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200">{row.entity_name}</div>
                      <div className="text-[11px] text-slate-500">{row.entity_type}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{row.gst_number}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ₹{row.taxable_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-400">₹{row.cgst.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-400">₹{row.sgst.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">₹{row.total_gst.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">₹{row.total_charges.toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{row.invoice_reference}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {row.status}
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
            Showing <strong className="text-white">{rows.length}</strong> of <strong className="text-white">{totalRecords}</strong> tax rows
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
