"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
  Landmark,
  Scale
} from "lucide-react";

export default function FinancialStatementsPage() {
  const [activeTab, setActiveTab] = useState<"BALANCE_SHEET" | "PROFIT_LOSS">("BALANCE_SHEET");
  const [statementData, setStatementData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/finance/statements/${activeTab}`);
      setStatementData(res.data);
    } catch (err) {
      console.error("Failed to fetch statement", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [activeTab]);

  const parsedData = statementData ? JSON.parse(statementData.summary_data) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-emerald-400" />
            Statutory Financial Statements Console
          </h1>
          <p className="mt-1 text-slate-400">
            Generate GAAP & Ind AS compliant Balance Sheet & Profit & Loss statements from General Ledger
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("BALANCE_SHEET")}
          className={`pb-3 transition-colors ${
            activeTab === "BALANCE_SHEET"
              ? "border-b-2 border-emerald-400 text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Balance Sheet Statement
        </button>
        <button
          onClick={() => setActiveTab("PROFIT_LOSS")}
          className={`pb-3 transition-colors ${
            activeTab === "PROFIT_LOSS"
              ? "border-b-2 border-emerald-400 text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Profit & Loss Statement (P&L)
        </button>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl space-y-6 font-mono text-sm">
        {loading || !parsedData ? (
          <div className="py-12 text-center text-slate-400">Loading Statutory Statement Data...</div>
        ) : activeTab === "BALANCE_SHEET" ? (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center text-emerald-400 font-bold">
              <span>BALANCE SHEET STATEMENT — {statementData.period_name}</span>
              <span className="text-xs text-slate-400 font-normal">Currency: INR (₹)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ASSETS */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 border-b border-slate-700 pb-2 flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-blue-400" /> ASSETS (Current & Non-Current)
                </h4>
                <div className="flex justify-between py-1 text-slate-300 text-xs">
                  <span>HDFC Clearing Bank Account</span>
                  <span className="text-white font-bold">₹{parsedData.assets.bank_clearing.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-800 font-bold text-emerald-400 text-xs">
                  <span>TOTAL ASSETS</span>
                  <span>₹{parsedData.assets.total_assets.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* LIABILITIES & EQUITY */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 border-b border-slate-700 pb-2 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-purple-400" /> LIABILITIES & EQUITY
                </h4>
                <div className="flex justify-between py-1 text-slate-300 text-xs">
                  <span>Merchant Retailer Wallets Liability</span>
                  <span className="text-white font-bold">₹{parsedData.liabilities.wallet_liability.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-300 text-xs">
                  <span>CGST / SGST Tax Payable Output</span>
                  <span className="text-white font-bold">₹{parsedData.liabilities.gst_payable.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-300 text-xs">
                  <span>Section 194O TDS Tax Payable</span>
                  <span className="text-white font-bold">₹{parsedData.liabilities.tds_payable.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-800 text-slate-300 text-xs">
                  <span>Retained Earnings (Equity)</span>
                  <span className="text-white font-bold">₹{parsedData.equity.retained_earnings.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-800 font-bold text-purple-400 text-xs">
                  <span>TOTAL LIABILITIES & EQUITY</span>
                  <span>₹{(parsedData.liabilities.total_liabilities + parsedData.equity.retained_earnings).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center text-emerald-400 font-bold">
              <span>STATEMENT OF PROFIT & LOSS — {statementData.period_name}</span>
              <span className="text-xs text-slate-400 font-normal">Currency: INR (₹)</span>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-200 mb-2 text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" /> GROSS REVENUE FROM OPERATIONS
                </h4>
                <div className="flex justify-between py-1 text-slate-300 pl-4 border-l border-slate-800">
                  <span>Gross MDR Service Charge Income</span>
                  <span className="text-white font-bold">₹{parsedData.revenue.gross_mdr_income.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 mb-2 text-sm">OPERATING & SERVICE EXPENSES</h4>
                <div className="flex justify-between py-1 text-slate-300 pl-4 border-l border-slate-800">
                  <span>Acquiring Bank Interchange Charges</span>
                  <span className="text-white font-bold">₹{parsedData.expenses.bank_interchange_charges.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-300 pl-4 border-l border-slate-800">
                  <span>Platform Operations & Maintenance Costs</span>
                  <span className="text-white font-bold">₹{parsedData.expenses.platform_op_costs.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex justify-between items-center text-sm font-bold text-emerald-400">
                <span>NET OPERATING PROFIT BEFORE TAX (EBITDA)</span>
                <span>₹{parsedData.net_profit.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
