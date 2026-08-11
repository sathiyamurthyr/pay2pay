"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Calendar,
  Plus,
  RefreshCw,
  Mail,
  CheckCircle2,
  X
} from "lucide-react";

export default function ReportSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [createData, setCreateData] = useState({
    report_id: "",
    frequency: "DAILY",
    recipient_email: "finance@pay2pay.com",
    format: "EXCEL"
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, rRes] = await Promise.all([
        api.get("/api/v1/reporting/schedules"),
        api.get("/api/v1/reporting/definitions")
      ]);
      setSchedules(sRes.data);
      setReports(rRes.data);
      if (rRes.data.length > 0) {
        setCreateData((prev) => ({ ...prev, report_id: rRes.data[0].public_id }));
      }
    } catch (err) {
      console.error("Failed to fetch schedules", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/reporting/schedules", createData);
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Schedule creation failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-emerald-400" />
            Automated Report Scheduling & Distribution Engine
          </h1>
          <p className="mt-1 text-slate-400">
            Configure daily, weekly, or monthly automated email and SFTP report delivery
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Create Automated Schedule
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Schedule #</th>
                <th className="px-5 py-4">Frequency</th>
                <th className="px-5 py-4">Recipient Email</th>
                <th className="px-5 py-4">Format</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Loading Schedules...</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">No automated report schedules configured yet.</td></tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 text-emerald-400 font-bold">{s.schedule_code}</td>
                    <td className="px-5 py-4 text-slate-200">{s.frequency}</td>
                    <td className="px-5 py-4 text-slate-300">{s.recipient_email}</td>
                    <td className="px-5 py-4 text-amber-400 font-semibold">{s.format}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-400" /> Create Automated Schedule
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-300">Select Report Definition *</label>
                <select
                  value={createData.report_id}
                  onChange={(e) => setCreateData({ ...createData, report_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {reports.map((r) => (
                    <option key={r.public_id} value={r.public_id}>{r.report_name} ({r.report_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-300">Frequency *</label>
                <select
                  value={createData.frequency}
                  onChange={(e) => setCreateData({ ...createData, frequency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="DAILY">DAILY (Every Morning 08:00 AM)</option>
                  <option value="WEEKLY">WEEKLY (Every Monday 09:00 AM)</option>
                  <option value="MONTHLY">MONTHLY (1st of every month)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-300">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={createData.recipient_email}
                  onChange={(e) => setCreateData({ ...createData, recipient_email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-300">Export Format *</label>
                <select
                  value={createData.format}
                  onChange={(e) => setCreateData({ ...createData, format: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="EXCEL">Microsoft Excel (.xlsx)</option>
                  <option value="CSV">Comma-Separated Values (.csv)</option>
                  <option value="PDF">Portable Document Format (.pdf)</option>
                </select>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg">
                  Save Automated Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
