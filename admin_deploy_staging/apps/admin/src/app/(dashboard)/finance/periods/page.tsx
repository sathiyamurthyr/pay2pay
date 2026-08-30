"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Calendar,
  Lock,
  RefreshCw,
  CheckCircle2
} from "lucide-react";

export default function AccountingPeriodsPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/finance/periods");
      setPeriods(res.data);
    } catch (err) {
      console.error("Failed to fetch periods", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleClosePeriod = async (id: string) => {
    try {
      await api.post(`/api/v1/finance/periods/${id}/close`);
      fetchPeriods();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Close failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-emerald-400" />
            Accounting Period Management & Books Close Console
          </h1>
          <p className="mt-1 text-slate-400">
            Manage financial accounting periods, lock posted transactions, & execute period closing routines
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Period Code</th>
                <th className="px-5 py-4">Period Name</th>
                <th className="px-5 py-4">Start Date</th>
                <th className="px-5 py-4">End Date</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 font-mono text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading Accounting Periods...</td></tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 text-emerald-400 font-bold">{p.period_code}</td>
                    <td className="px-5 py-4 font-sans text-xs font-semibold text-slate-200">{p.period_name}</td>
                    <td className="px-5 py-4 text-slate-400">{p.start_date}</td>
                    <td className="px-5 py-4 text-slate-400">{p.end_date}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.status === "CLOSED"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {p.status !== "CLOSED" && (
                        <button
                          onClick={() => handleClosePeriod(p.public_id)}
                          className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 ml-auto"
                        >
                          <Lock className="h-3.5 w-3.5" /> Close & Lock Books
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
