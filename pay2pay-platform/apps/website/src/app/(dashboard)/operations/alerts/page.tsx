"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2
} from "lucide-react";

export default function SystemAlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/operations/alerts");
      setAlerts(res.data);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolveAlert = async (id: string) => {
    try {
      await api.post(`/api/v1/operations/alerts/${id}/resolve`);
      fetchAlerts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Resolution failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            System Alert & Incident Management Center
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time infrastructure warnings, critical alert notifications, and incident resolution tracking
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Alert Code</th>
                <th className="px-5 py-4">Severity</th>
                <th className="px-5 py-4">Component</th>
                <th className="px-5 py-4">Message</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading System Alerts...</td></tr>
              ) : alerts.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No active system alerts detected. All components online.</td></tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-amber-400 font-bold">{a.alert_code}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-200">{a.severity}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">{a.component}</td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-300">{a.message}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        a.status === "RESOLVED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {a.status !== "RESOLVED" && (
                        <button onClick={() => handleResolveAlert(a.public_id)} className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Resolve Alert">
                          <CheckCircle2 className="h-4 w-4" />
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
