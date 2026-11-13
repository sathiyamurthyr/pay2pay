"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Building2,
  Plus,
  X
} from "lucide-react";

export default function PartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [partnerName, setPartnerName] = useState("");
  const [category, setCategory] = useState("BANK");

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/eip/partners");
      setPartners(res.data);
    } catch (err) {
      console.error("Failed to fetch partners", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/eip/partners", {
        partner_name: partnerName,
        category
      });
      setShowModal(false);
      setPartnerName("");
      fetchPartners();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Partner registration failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#292329] flex items-center gap-3">
            <Building2 className="h-8 w-8 text-amber-400" />
            Partner Integration Management & Credential Portal
          </h1>
          <p className="mt-1 text-[#625B60]">
            Register external banks, payment gateways, ERPs, & enterprise integration partners
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="h-4 w-4" /> Register Integration Partner
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E8E2E5] bg-[#FAF8F9]/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#292329]">
            <thead className="bg-[#FFFFFF]/80 uppercase font-mono text-xs text-[#625B60] border-b border-[#E8E2E5]">
              <tr>
                <th className="px-5 py-4">Partner Code</th>
                <th className="px-5 py-4">Partner Name</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4 font-mono text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2E5]/60 font-mono text-xs">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-[#625B60]">Loading Integration Partners...</td></tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.public_id} className="hover:bg-[#F5F2F4]/40 transition-colors">
                    <td className="px-5 py-4 text-amber-400 font-bold">{p.partner_code}</td>
                    <td className="px-5 py-4 font-sans text-xs font-semibold text-[#292329]">{p.partner_name}</td>
                    <td className="px-5 py-4 text-[#625B60]">{p.category}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {p.status}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFFFFF]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E8E2E5] bg-[#FAF8F9] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#292329] flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-400" /> Register Integration Partner
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#625B60] hover:text-[#292329]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePartner} className="space-y-4 text-sm">
              <div>
                <label className="block text-[#625B60] text-xs mb-1">Partner Name</label>
                <input type="text" required value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="e.g. Axis Bank Host-to-Host Integration Node" className="w-full rounded-lg bg-[#FFFFFF] border border-[#E8E2E5] p-2.5 text-[#292329] focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[#625B60] text-xs mb-1">Partner Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg bg-[#FFFFFF] border border-[#E8E2E5] p-2.5 text-[#292329] focus:border-amber-500 focus:outline-none">
                  <option value="BANK">Acquiring / Payout Bank</option>
                  <option value="GATEWAY">Payment Gateway</option>
                  <option value="ERP">Enterprise ERP (SAP / Oracle / Tally)</option>
                  <option value="CRM">Customer Service CRM</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-[#E8E2E5] text-[#292329]">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400">Save Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
