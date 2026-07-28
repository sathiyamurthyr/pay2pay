"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  FileText,
  Plus,
  RefreshCw,
  Download,
  CheckCircle2,
  Receipt,
  X
} from "lucide-react";

export default function ComplianceReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    report_type: "GSTR_1_SUMMARY",
    tax_period: "2026-07"
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/compliance/reports");
      setReports(res.data);
    } catch (err) {
      console.error("Failed to fetch compliance reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/compliance/reports/generate", formData);
      setShowModal(false);
      fetchReports();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Report generation failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="h-8 w-8 text-emerald-400" />
            Regulatory & Tax Compliance Reports
          </h1>
          <p className="mt-1 text-slate-400">
            Automated GSTR-1, GSTR-3B, Form 26Q TDS deductions, and monthly audit statements
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Generate Compliance Report
        </button>
      </div>

      {/* Reports Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Report Number</th>
                <th className="px-5 py-4">Report Type</th>
                <th className="px-5 py-4">Tax Period</th>
                <th className="px-5 py-4">Taxable Value</th>
                <th className="px-5 py-4">GST Amount</th>
                <th className="px-5 py-4">TDS Amount</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading Compliance Reports...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No compliance reports generated yet.</td></tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-emerald-400 font-semibold">{r.report_number}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-200">{r.report_type}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">{r.tax_period}</td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-100">₹{r.total_taxable_value.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 font-mono text-emerald-400">₹{r.total_gst_amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 font-mono text-cyan-400">₹{r.total_tds_amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {r.status}
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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" /> Generate Compliance Report
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-300">Report Category *</label>
                <select
                  value={formData.report_type}
                  onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="GSTR_1_SUMMARY">GSTR-1 Summary Statement</option>
                  <option value="GSTR_3B_SUMMARY">GSTR-3B Tax Return</option>
                  <option value="TDS_194O_STATEMENT">Form 26Q TDS Sec 194O</option>
                  <option value="SETTLEMENT_AUDIT">Monthly Settlement Audit</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-300">Tax Period (YYYY-MM) *</label>
                <input
                  type="text"
                  required
                  placeholder="2026-07"
                  value={formData.tax_period}
                  onChange={(e) => setFormData({ ...formData, tax_period: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg">
                  Run Report Generator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
