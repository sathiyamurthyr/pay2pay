"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  GitMerge,
  Plus,
  X
} from "lucide-react";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [workflowName, setWorkflowName] = useState("");
  const [entityType, setEntityType] = useState("SETTLEMENT");

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/bpm/workflows");
      setWorkflows(res.data);
    } catch (err) {
      console.error("Failed to fetch workflows", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/bpm/workflows", {
        workflow_name: workflowName,
        entity_type: entityType
      });
      setShowModal(false);
      setWorkflowName("");
      fetchWorkflows();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Workflow creation failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <GitMerge className="h-8 w-8 text-blue-400" />
            Workflow Designer & Business Process Engine
          </h1>
          <p className="mt-1 text-slate-400">
            Configure multi-step sequential, parallel, & rule-based approval workflows
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="h-4 w-4" /> Create Workflow Definition
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#0F172A]">
            <thead className="bg-[#F8FAFC] uppercase text-xs font-bold text-[#111827] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Workflow #</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Workflow Name</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Target Entity</th>
                <th className="px-5 py-4 font-mono font-extrabold text-right text-[#111827]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono text-xs">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-[#64748B] font-medium">Loading Workflows...</td></tr>
              ) : (
                workflows.map((w) => (
                  <tr key={w.public_id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-4 text-[#2563EB] font-extrabold">{w.workflow_code}</td>
                    <td className="px-5 py-4 font-sans text-xs font-bold text-[#0F172A]">{w.workflow_name}</td>
                    <td className="px-5 py-4 text-[#475569] font-medium">{w.entity_type}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                        {w.status}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xl space-y-6 text-[#111827]">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-[#111827] flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-[#2563EB]" /> Create Workflow Definition
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkflow} className="space-y-4 text-sm">
              <div>
                <label className="block text-[#6B7280] text-xs font-bold mb-1">Workflow Name</label>
                <input type="text" required value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} placeholder="e.g. High-Value Payout Maker-Checker Approval" className="w-full rounded-lg bg-white border border-[#D1D5DB] p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[#6B7280] text-xs font-bold mb-1">Target Entity Type</label>
                <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-full rounded-lg bg-white border border-[#D1D5DB] p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold">
                  <option value="SETTLEMENT">Settlement Batch</option>
                  <option value="PAYOUT">Outbound Bank Payout</option>
                  <option value="RETAILER">Merchant Retailer</option>
                  <option value="JOURNAL">Manual GL Journal</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-[#D1D5DB] text-[#374151] font-bold hover:bg-[#FAFBFC]">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-[#2563EB] font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs">Save Workflow</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
