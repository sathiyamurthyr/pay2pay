"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Download,
} from "lucide-react";
import {
  fetchAdminRechargeReport,
  AdminRechargeTransaction,
  AdminRechargeReportResponse,
} from "@/services/recharge-admin-api";

export default function AdminRechargeReportPage() {
  const [data, setData] = useState<AdminRechargeReportResponse>({
    transactions: [],
    pagination: { page: 1, page_size: 20, total_count: 0, total_pages: 1 },
    summary: { total_volume: 0, total_commission: 0, total_tax: 0, total_success: 0, total_failed: 0 },
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [status, setStatus] = useState("ALL");
  const [operator, setOperator] = useState("ALL");
  const [retailerSearch, setRetailerSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await fetchAdminRechargeReport({
        status: status === "ALL" ? undefined : status,
        operator_code: operator === "ALL" ? undefined : operator,
        retailer_code: retailerSearch.trim() || undefined,
        page,
        page_size: 20,
      });
      setData(res);
    } catch (err) {
      console.error("Failed to load admin recharge report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [status, operator, page]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Smartphone className="w-7 h-7 text-indigo-600" />
            <span>Mobile Recharge Enterprise Ledger</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time audit records backed by PostgreSQL Stored Procedure accounting
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadReport}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Recharge Volume
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            ₹{Number(data.summary.total_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {data.pagination.total_count} transactions
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Retailer Commission</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            ₹{Number(data.summary.total_commission || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Credited to retailers
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Applicable Tax / GST
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
            ₹{Number(data.summary.total_tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Identifiable GST liability
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Successful Orders
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-1 font-mono">
            {data.summary.total_success || 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Fulfilled by operators
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Failed / Reversed
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1 font-mono">
            {data.summary.total_failed || 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Auto-refunded safely
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Retailer */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={retailerSearch}
              onChange={(e) => setRetailerSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadReport()}
              placeholder="Search retailer code / name..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Operator Selector */}
          <select
            value={operator}
            onChange={(e) => {
              setOperator(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Operators</option>
            <option value="JIO">Reliance Jio</option>
            <option value="AIRTEL">Bharti Airtel</option>
            <option value="VI">Vodafone Idea (Vi)</option>
            <option value="BSNL">BSNL GSM</option>
            <option value="MTNL">MTNL</option>
          </select>

          {/* Status Selector */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="REVERSED">REVERSED</option>
            <option value="PROCESSING">PROCESSING</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Showing {data.transactions.length} of {data.pagination.total_count} entries
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Transaction / Reference</th>
                <th className="py-3.5 px-4">Retailer</th>
                <th className="py-3.5 px-4">Mobile & Operator</th>
                <th className="py-3.5 px-4 text-right">Recharge Amt</th>
                <th className="py-3.5 px-4 text-right">Commission (CR)</th>
                <th className="py-3.5 px-4 text-right">Tax (DR)</th>
                <th className="py-3.5 px-4 text-right">Net Debit</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Operator Ref</th>
                <th className="py-3.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Loading recharge ledger records...
                  </td>
                </tr>
              ) : data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No recharge transactions found.
                  </td>
                </tr>
              ) : (
                data.transactions.map((t) => {
                  const isSuccess = t.status === "SUCCESS";
                  const isReversed = t.status === "REVERSED";

                  return (
                    <tr key={t.transaction_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{t.transaction_id}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.reference_id}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{t.retailer_code}</div>
                        <div className="text-[11px] text-slate-500">{t.retailer_name}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">+91 {t.mobile_number}</div>
                        <div className="text-[11px] text-indigo-600 font-semibold">{t.operator_name}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(t.recharge_amount).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        +₹{Number(t.commission_amount).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        ₹{Number(t.tax_amount).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(t.net_wallet_debit).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                            isSuccess
                              ? "bg-emerald-100 text-emerald-700"
                              : isReversed
                              ? "bg-purple-100 text-purple-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {t.operator_ref || "—"}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(t.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {data.pagination.total_pages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 text-slate-700 hover:bg-slate-50"
            >
              Previous
            </button>

            <span className="font-semibold text-slate-600">
              Page {page} of {data.pagination.total_pages}
            </span>

            <button
              disabled={page >= data.pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 text-slate-700 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
