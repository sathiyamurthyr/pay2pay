"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ScrollText, Filter, Eye, ShieldCheck, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AuditLogsPage() {
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", selectedAction],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAction) params.append("action", selectedAction);
      const res = await apiClient.get(`/audit-logs?${params.toString()}`);
      return res.data;
    },
  });

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "LOGIN":
      case "CREATE": return "success";
      case "UPDATE":
      case "APPROVE": return "info";
      case "DELETE":
      case "REJECT": return "danger";
      default: return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-1">Immutable Log of Every Platform Action & Security Event</p>
        </div>

        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="EXPORT">EXPORT</option>
            <option value="IMPORT">IMPORT</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
          </select>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Audit Event Trail</CardTitle>
            <span className="text-xs font-mono text-slate-400">Total Events: {auditLogs.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">Actor Email</th>
                  <th className="py-3.5 px-4 font-semibold">Action</th>
                  <th className="py-3.5 px-4 font-semibold">Resource Type</th>
                  <th className="py-3.5 px-4 font-semibold">IP Address</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">Loading immutable audit logs...</td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">No audit events recorded.</td>
                  </tr>
                ) : (
                  auditLogs.map((log: any) => (
                    <tr key={log.public_id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400">{formatDate(log.created_at)}</td>
                      <td className="py-3 px-4 font-sans text-white font-medium">{log.actor_email || "System"}</td>
                      <td className="py-3 px-4">
                        <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
                      </td>
                      <td className="py-3 px-4 text-blue-400">{log.resource_type}</td>
                      <td className="py-3 px-4 text-slate-400">{log.ip_address || "127.0.0.1"}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="View Log Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event Details — ${selectedLog?.action}`}
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-slate-500">Event ID:</span>
                <p className="text-blue-400">{selectedLog.public_id}</p>
              </div>
              <div>
                <span className="text-slate-500">Resource ID:</span>
                <p className="text-slate-200">{selectedLog.resource_id || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500">Actor Email:</span>
                <p className="text-white font-semibold font-sans">{selectedLog.actor_email || "System"}</p>
              </div>
              <div>
                <span className="text-slate-500">Timestamp:</span>
                <p className="text-slate-200">{formatDate(selectedLog.created_at)}</p>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Payload JSON Details:</span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 overflow-x-auto">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
