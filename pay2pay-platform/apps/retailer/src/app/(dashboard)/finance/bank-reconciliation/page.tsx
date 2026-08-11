"use client";

import React, { useState } from "react";
import api from "@/lib/api";
import {
  Landmark,
  CheckCircle2,
  RefreshCw,
  Scale
} from "lucide-react";

export default function BankReconciliationPage() {
  const [matching, setMatching] = useState(false);
  const [matchStatus, setMatchStatus] = useState<string | null>(null);

  const mockLines = [
    { utr: "UTR202607301001", date: "2026-07-30", type: "CREDIT", amount: 150000.0, status: "MATCHED" },
    { utr: "UTR202607301002", date: "2026-07-30", type: "DEBIT", amount: 45000.0, status: "MATCHED" },
    { utr: "UTR202607301003", date: "2026-07-30", type: "CREDIT", amount: 89000.0, status: "UNMATCHED" },
  ];

  const handleAutoMatch = async () => {
    try {
      setMatching(true);
      const res = await api.post("/api/v1/finance/bank-reconciliation/match", {
        statement_line_id: "00000000-0000-0000-0000-000000000001"
      });
      setMatchStatus(res.data.message);
    } catch (err) {
      console.error("Match failed", err);
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Landmark className="h-8 w-8 text-blue-400" />
            Automated Bank Statement Reconciliation Engine
          </h1>
          <p className="mt-1 text-slate-400">
            Auto-match incoming/outgoing bank statement feeds against General Ledger bank clearing entries
          </p>
        </div>
        <button
          onClick={handleAutoMatch}
          disabled={matching}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
        >
          <RefreshCw className={`h-4 w-4 ${matching ? "animate-spin" : ""}`} /> Execute Auto-Matching Engine
        </button>
      </div>

      {matchStatus && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" /> {matchStatus}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Reference UTR</th>
                <th className="px-5 py-4">Transaction Date</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Amount (₹)</th>
                <th className="px-5 py-4 font-mono text-right">Reconciliation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {mockLines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 text-blue-400 font-bold">{line.utr}</td>
                  <td className="px-5 py-4 text-slate-400">{line.date}</td>
                  <td className="px-5 py-4 font-bold text-slate-200">{line.type}</td>
                  <td className="px-5 py-4 text-slate-100 font-bold">₹{line.amount.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-4 text-right">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      line.status === "MATCHED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {line.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
