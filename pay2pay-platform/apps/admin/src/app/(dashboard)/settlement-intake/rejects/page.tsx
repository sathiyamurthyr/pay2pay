"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  AlertTriangle,
  RefreshCw,
  FileText,
  CheckCircle2,
  X
} from "lucide-react";

export default function RejectionQueuePage() {
  const [rejects, setRejects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRejects = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/settlement-intake/rejects");
      setRejects(res.data);
    } catch (err) {
      console.error("Failed to fetch rejected settlement records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRejects();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
            Settlement Rejection Queue & Discrepancies
          </h1>
          <p className="mt-1 text-slate-400">
            Isolated invalid records (Unmapped TIDs, Missing MIDs, Amount Mismatches) awaiting manual review
          </p>
        </div>
      </div>

      {/* Grid Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Batch Number</th>
                <th className="px-5 py-4">Line #</th>
                <th className="px-5 py-4">Reject Code</th>
                <th className="px-5 py-4">Reject Description</th>
                <th className="px-5 py-4">Original Data</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading Rejection Queue...</td></tr>
              ) : rejects.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No rejected settlement records. All batch files valid!</td></tr>
              ) : (
                rejects.map((r) => (
                  <tr key={r.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-rose-400 font-semibold">{r.batch_number}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">{r.line_number}</td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-amber-400">{r.reject_code}</td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-200">{r.reject_message}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{r.original_data}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {r.corrected_flag ? "RESOLVED" : "ISOLATED"}
                      </span>
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
