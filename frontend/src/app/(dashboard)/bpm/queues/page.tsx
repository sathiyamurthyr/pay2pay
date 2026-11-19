"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Layers
} from "lucide-react";

export default function OperationalQueuesPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/bpm/queues");
      setQueues(res.data);
    } catch (err) {
      console.error("Failed to fetch queues", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#292329] flex items-center gap-3">
            <Layers className="h-8 w-8 text-indigo-400" />
            Operational Queue Monitor & Capacity Manager
          </h1>
          <p className="mt-1 text-[#625B60]">
            Monitor real-time settlement, payout, compliance, & exception queues across all operations teams
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-800">
            <thead className="bg-slate-50 uppercase text-xs font-bold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 font-bold text-slate-700">Queue Code</th>
                <th className="px-5 py-4 font-bold text-slate-700">Queue Name</th>
                <th className="px-5 py-4 font-bold text-slate-700">Type</th>
                <th className="px-5 py-4 font-mono font-bold text-right text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500 font-medium">Loading Operational Queues...</td></tr>
              ) : (
                queues.map((q) => (
                  <tr key={q.public_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-blue-600 font-bold">{q.queue_code}</td>
                    <td className="px-5 py-4 font-sans text-xs font-bold text-slate-900">{q.queue_name}</td>
                    <td className="px-5 py-4 text-[#475569] font-medium">{q.queue_type}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                        {q.status}
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
