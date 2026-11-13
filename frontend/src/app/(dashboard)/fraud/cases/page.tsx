"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Lock,
  X
} from "lucide-react";

export default function FraudCasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  // Form states
  const [decisionAction, setDecisionAction] = useState("FREEZE_WALLET");
  const [findingsText, setFindingsText] = useState("");

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/fraud/cases");
      setCases(res.data);
    } catch (err) {
      console.error("Failed to fetch cases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      await api.post(`/api/v1/fraud/cases/${selectedCase}/decision`, {
        decision_action: decisionAction,
        findings_text: findingsText
      });
      setSelectedCase(null);
      setFindingsText("");
      fetchCases();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Decision application failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#292329] flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-rose-400" />
            Fraud Investigation Workspace & Decision Engine
          </h1>
          <p className="mt-1 text-[#625B60]">
            Review suspicious fraud alerts, attach digital evidence, & enforce enforcement decisions
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E8E2E5] bg-[#FAF8F9]/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#292329]">
            <thead className="bg-[#FFFFFF]/80 uppercase font-mono text-xs text-[#625B60] border-b border-[#E8E2E5]">
              <tr>
                <th className="px-5 py-4">Case #</th>
                <th className="px-5 py-4">Subject</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Investigator</th>
                <th className="px-5 py-4 font-mono text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2E5]/60 font-mono text-xs">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-[#625B60]">Loading Fraud Cases...</td></tr>
              ) : cases.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-[#625B60]">No open fraud investigation cases.</td></tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.public_id} className="hover:bg-[#F5F2F4]/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-rose-400 font-bold">{c.case_number}</td>
                    <td className="px-5 py-4 font-sans text-xs font-semibold text-[#292329]">{c.subject}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        c.status === "RESOLVED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#625B60]">{c.assigned_investigator || "Unassigned"}</td>
                    <td className="px-5 py-4 text-right">
                      {c.status !== "RESOLVED" && (
                        <button
                          onClick={() => setSelectedCase(c.public_id)}
                          className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 ml-auto"
                        >
                          <Lock className="h-3.5 w-3.5" /> Apply Decision
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

      {/* Decision Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFFFFF]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#E8E2E5] bg-[#FAF8F9] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#292329] flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-400" /> Apply Enforcement Decision
              </h3>
              <button onClick={() => setSelectedCase(null)} className="text-[#625B60] hover:text-[#292329]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleDecision} className="space-y-4 text-sm">
              <div>
                <label className="block text-[#625B60] text-xs mb-1">Decision Action</label>
                <select value={decisionAction} onChange={(e) => setDecisionAction(e.target.value)} className="w-full rounded-lg bg-[#FFFFFF] border border-[#E8E2E5] p-2.5 text-[#292329] focus:border-rose-500 focus:outline-none font-bold">
                  <option value="FREEZE_WALLET">FREEZE_WALLET — Lock Merchant Funds</option>
                  <option value="BLOCK_MACHINE">BLOCK_MACHINE — Suspend POS Terminal</option>
                  <option value="REJECT">REJECT — Cancel Transaction</option>
                  <option value="APPROVE">APPROVE — Clear & Dismiss Case</option>
                </select>
              </div>
              <div>
                <label className="block text-[#625B60] text-xs mb-1">Investigation Findings & Rationale</label>
                <textarea required rows={4} value={findingsText} onChange={(e) => setFindingsText(e.target.value)} placeholder="State findings, risk assessment, and enforcement rationale..." className="w-full rounded-lg bg-[#FFFFFF] border border-[#E8E2E5] p-2.5 text-[#292329] focus:border-rose-500 focus:outline-none" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedCase(null)} className="px-4 py-2 rounded-lg border border-[#E8E2E5] text-[#292329]">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-rose-600 font-semibold text-white hover:bg-rose-500">Confirm & Enforce</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
