"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  FileText,
  Play,
  RefreshCw,
  FileSpreadsheet,
  Download,
  X
} from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showExecModal, setShowExecModal] = useState(false);
  const [format, setFormat] = useState("EXCEL");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rRes, eRes] = await Promise.all([
        api.get("/api/v1/reporting/definitions"),
        api.get("/api/v1/reporting/executions")
      ]);
      setReports(rRes.data);
      setExecutions(eRes.data);
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExecuteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    try {
      await api.post("/api/v1/reporting/execute", {
        report_id: selectedReport.public_id,
        export_format: format
      });
      setShowExecModal(false);
      alert(`Report Execution Started! Generating ${format} file...`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Report execution failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="h-8 w-8 text-emerald-400" />
            Enterprise Report Directory & Generator
          </h1>
          <p className="mt-1 text-slate-400">
            Catalog of financial, operational, compliance, and audit reports with on-demand Excel/CSV/PDF exports
          </p>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-slate-400">Loading Report Catalog...</div>
        ) : (
          reports.map((r) => (
            <div key={r.public_id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-400 font-bold">{r.report_code}</span>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">{r.category}</span>
              </div>
              <h3 className="font-semibold text-slate-100 text-base">{r.report_name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => { setSelectedReport(r); setShowExecModal(true); }}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
                >
                  <Play className="h-3.5 w-3.5" />
                  Execute & Export
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Past Executions Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl space-y-4 p-6">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-400" /> Recent Executed Report Downloads
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Execution #</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Records</th>
                <th className="px-5 py-4">Latency</th>
                <th className="px-5 py-4">Executed By</th>
                <th className="px-5 py-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {executions.map((ex) => (
                <tr key={ex.public_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 text-emerald-400 font-bold">{ex.execution_number}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {ex.execution_status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-200">{ex.record_count} rows</td>
                  <td className="px-5 py-4 text-amber-400">{ex.execution_time_ms} ms</td>
                  <td className="px-5 py-4 text-slate-400">{ex.executed_by}</td>
                  <td className="px-5 py-4 text-right">
                    <a
                      href={ex.file_path || "#"}
                      download
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" /> Download File
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showExecModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Play className="h-5 w-5 text-emerald-400" /> Execute Report ({selectedReport.report_code})
              </h2>
              <button onClick={() => setShowExecModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-300">Export Format *</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="EXCEL">Microsoft Excel (.xlsx)</option>
                  <option value="CSV">Comma-Separated Values (.csv)</option>
                  <option value="PDF">Portable Document Format (.pdf)</option>
                  <option value="JSON">Structured Data (.json)</option>
                </select>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg">
                  Run Query & Generate File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
