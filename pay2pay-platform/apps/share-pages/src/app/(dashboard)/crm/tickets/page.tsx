"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Ticket,
  Plus,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  X
} from "lucide-react";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [showResolveModal, setShowResolveModal] = useState<string | null>(null);

  // Form states
  const [selectedRetailer, setSelectedRetailer] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("SETTLEMENT_ISSUE");
  const [priority, setPriority] = useState("MEDIUM");
  const [agentEmail, setAgentEmail] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, rRes] = await Promise.all([
        api.get("/api/v1/crm/tickets"),
        api.get("/api/v1/retailers/")
      ]);
      setTickets(tRes.data);
      setRetailers(rRes.data);
      if (rRes.data.length > 0) setSelectedRetailer(rRes.data[0].public_id);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/crm/tickets", {
        retailer_id: selectedRetailer,
        subject,
        category,
        priority
      });
      setShowCreateModal(false);
      setSubject("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Creation failed");
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignModal) return;
    try {
      await api.post(`/api/v1/crm/tickets/${showAssignModal}/assign`, {
        agent_email: agentEmail
      });
      setShowAssignModal(null);
      setAgentEmail("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Assignment failed");
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResolveModal) return;
    try {
      await api.post(`/api/v1/crm/tickets/${showResolveModal}/resolve`, {
        resolution_notes: resolutionNotes
      });
      setShowResolveModal(null);
      setResolutionNotes("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Resolution failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Ticket className="h-8 w-8 text-emerald-400" />
            Support Ticket Directory & Case Management
          </h1>
          <p className="mt-1 text-slate-400">
            Create, assign, escalate, and resolve merchant support requests with automated SLA tracking
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#1D4ED8] transition-all shadow-2xs"
        >
          <Plus className="h-4 w-4" /> Create Ticket
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#0F172A]">
            <thead className="bg-[#F8FAFC] uppercase font-mono text-xs font-extrabold text-[#111827] border-b border-[#E5E7EB]">
              <tr>
                <th className="px-5 py-4">Ticket #</th>
                <th className="px-5 py-4">Subject</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Assigned Agent</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-mono text-xs">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[#6B7280]">Loading Support Tickets...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[#6B7280]">No support tickets found.</td></tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.public_id} className="hover:bg-[#EFF6FF] transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-[#2563EB] font-extrabold">{t.ticket_number}</td>
                    <td className="px-5 py-4 font-sans text-xs font-bold text-[#111827]">{t.subject}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#6B7280]">{t.category}</td>
                    <td className="px-5 py-4 font-mono text-xs font-extrabold text-[#D97706]">{t.priority}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        t.status === "RESOLVED"
                          ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                          : t.status === "IN_PROGRESS"
                          ? "bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE]"
                          : "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#374151] font-semibold">{t.assigned_agent || "Unassigned"}</td>
                    <td className="px-5 py-4 text-right space-x-2">
                      {t.status !== "RESOLVED" && (
                        <>
                          <button onClick={() => setShowAssignModal(t.public_id)} className="p-1.5 rounded-lg border border-[#BFDBFE] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE]" title="Assign Agent">
                            <UserCheck className="h-4 w-4" />
                          </button>
                          <button onClick={() => setShowResolveModal(t.public_id)} className="p-1.5 rounded-lg border border-[#BBF7D0] bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]" title="Resolve Ticket">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-emerald-400" /> Create Support Ticket
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Select Merchant</label>
                <select value={selectedRetailer} onChange={(e) => setSelectedRetailer(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none">
                  {retailers.map((r) => (
                    <option key={r.public_id} value={r.public_id}>{r.merchant_name} ({r.business_name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Subject</label>
                <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Delayed Settlement Credit Inquiry" className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none">
                    <option value="SETTLEMENT_ISSUE">Settlement Issue</option>
                    <option value="PAYOUT_ISSUE">Payout Issue</option>
                    <option value="MACHINE_ISSUE">Machine POS Issue</option>
                    <option value="KYC_ISSUE">KYC Verification</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none">
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400">Create Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Agent Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Assign Support Agent</h3>
            <form onSubmit={handleAssign} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Support Agent Email</label>
                <input type="email" required value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} placeholder="agent@pay2pay.com" className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowAssignModal(null)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-500 font-semibold text-white hover:bg-blue-400">Assign Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Resolve Ticket</h3>
            <form onSubmit={handleResolve} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Resolution Notes</label>
                <textarea required rows={3} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Provide detailed resolution explanation..." className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowResolveModal(null)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400">Resolve Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
