"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Activity,
  RefreshCw,
  RotateCcw,
  ShieldAlert
} from "lucide-react";

export default function QueuesPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [dlqs, setDlqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qRes, dRes] = await Promise.all([
        api.get("/api/v1/operations/queues"),
        api.get("/api/v1/operations/dlq")
      ]);
      setQueues(qRes.data);
      setDlqs(dRes.data);
    } catch (err) {
      console.error("Failed to fetch queues", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetryDlq = async (id: string) => {
    try {
      await api.post(`/api/v1/operations/dlq/${id}/retry`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "DLQ retry failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Activity className="h-8 w-8 text-emerald-400" />
            Background Queues & Dead Letter Queue (DLQ) Manager
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time monitoring of asynchronous processing queues, worker threads, and dead letter exceptions
          </p>
        </div>
      </div>

      {/* Active Queues Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl space-y-4 p-6">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-400" /> Background Asynchronous Job Queues
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Queue Name</th>
                <th className="px-5 py-4">Pending Jobs</th>
                <th className="px-5 py-4">Active Workers</th>
                <th className="px-5 py-4">Failed Jobs</th>
                <th className="px-5 py-4 font-mono text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {queues.map((q) => (
                <tr key={q.public_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 text-emerald-400 font-bold">{q.queue_name}</td>
                  <td className="px-5 py-4 text-slate-200">{q.pending_jobs}</td>
                  <td className="px-5 py-4 text-blue-400 font-bold">{q.active_workers} threads</td>
                  <td className="px-5 py-4 text-rose-400">{q.failed_jobs}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      HEALTHY
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dead Letter Queue Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl space-y-4 p-6">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-400" /> Dead Letter Queue (DLQ) Exceptions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">DLQ #</th>
                <th className="px-5 py-4">Error Message</th>
                <th className="px-5 py-4">Retry Count</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {dlqs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">No dead letter queue exceptions detected. Zero poison messages.</td></tr>
              ) : (
                dlqs.map((d) => (
                  <tr key={d.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 text-amber-400 font-bold">{d.dlq_number}</td>
                    <td className="px-5 py-4 text-slate-300">{d.error_message}</td>
                    <td className="px-5 py-4 text-slate-200">{d.retry_count}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleRetryDlq(d.public_id)} className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Re-queue Item">
                        <RotateCcw className="h-4 w-4" />
                      </button>
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
