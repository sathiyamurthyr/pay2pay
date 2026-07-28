"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  ScrollText,
  Search,
  RefreshCw,
  Download,
  Filter,
  ShieldCheck,
  UserCheck
} from "lucide-react";

export default function AuditExplorerPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/audit/logs", {
        params: { search }
      });
      setLogs(res.data.items);
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <ScrollText className="h-8 w-8 text-emerald-400" />
            Security Audit Trail Explorer
          </h1>
          <p className="mt-1 text-slate-400">
            Immutable user activity logs, IP tracking, action signatures, and resource mutation diffs
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search Actor Email, Action Code, Resource..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Grid Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Timestamp</th>
                <th className="px-5 py-4">Actor</th>
                <th className="px-5 py-4">Action Code</th>
                <th className="px-5 py-4">Resource</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Loading Audit Logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">No audit logs found matching query.</td></tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.public_id || l.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{new Date(l.created_date || l.timestamp).toLocaleString()}</td>
                    <td className="px-5 py-4 font-semibold text-slate-100">{l.actor_email || "System"}</td>
                    <td className="px-5 py-4 font-mono text-xs text-emerald-400 font-semibold">{l.action}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">{l.resource_type} ({l.resource_id?.slice(0, 8)})</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        SUCCESS
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
