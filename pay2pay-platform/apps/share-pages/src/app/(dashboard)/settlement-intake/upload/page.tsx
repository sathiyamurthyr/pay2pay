"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  UploadCloud,
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X
} from "lucide-react";

export default function UploadCentrePage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    bank_name: "HDFC",
    settlement_date: new Date().toISOString().split("T")[0],
    file_content_csv: "TxnReference,MID,TID,Amount\nTXN20269901,MID998877,TID887766,15000.00\nTXN20269902,MID998877,TID_UNKNOWN,3500.00",
    original_file_name: "hdfc_daily_batch.csv"
  });

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/settlement-intake/files");
      setFiles(res.data);
    } catch (err) {
      console.error("Failed to fetch settlement files", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/settlement-intake/upload", formData);
      setShowModal(false);
      fetchFiles();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Settlement file upload failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <UploadCloud className="h-8 w-8 text-emerald-400" />
            Bank Settlement File Upload Centre
          </h1>
          <p className="mt-1 text-slate-400">
            Secure bank batch file upload, SHA-256 duplicate verification, and validation intake
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Upload Bank Settlement File
        </button>
      </div>

      {/* Files Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">File Number</th>
                <th className="px-5 py-4">Acquiring Bank</th>
                <th className="px-5 py-4">Settlement Date</th>
                <th className="px-5 py-4">File Name</th>
                <th className="px-5 py-4">SHA-256 Hash</th>
                <th className="px-5 py-4">Size (Bytes)</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading Uploaded Settlement Files...</td></tr>
              ) : files.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No bank settlement files uploaded yet.</td></tr>
              ) : (
                files.map((f) => (
                  <tr key={f.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-emerald-400 font-semibold">{f.file_number}</td>
                    <td className="px-5 py-4 font-bold text-slate-100">{f.bank_name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">{f.settlement_date}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">{f.original_file_name}</td>
                    <td className="px-5 py-4 font-mono text-[10px] text-slate-400">{f.file_hash.slice(0, 16)}...</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">{f.file_size} B</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        f.status === "STAGED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {f.status}
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
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-emerald-400" /> Secure Settlement File Upload
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Acquiring Bank *</label>
                  <select
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="HDFC">HDFC Bank</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="SBI">State Bank of India</option>
                    <option value="AXIS">Axis Bank</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-slate-300">Settlement Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.settlement_date}
                    onChange={(e) => setFormData({ ...formData, settlement_date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-300">Original File Name *</label>
                <input
                  type="text"
                  required
                  value={formData.original_file_name}
                  onChange={(e) => setFormData({ ...formData, original_file_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-300">CSV Settlement File Content *</label>
                <textarea
                  rows={5}
                  required
                  value={formData.file_content_csv}
                  onChange={(e) => setFormData({ ...formData, file_content_csv: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg">
                  Execute Checksum & Validate File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
