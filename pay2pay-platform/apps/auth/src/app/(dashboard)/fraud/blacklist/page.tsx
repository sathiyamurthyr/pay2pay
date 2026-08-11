"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Lock,
  Plus,
  RefreshCw,
  X,
  ShieldCheck
} from "lucide-react";

export default function BlacklistPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [itemType, setItemType] = useState("PAN");
  const [itemValue, setItemValue] = useState("");
  const [reason, setReason] = useState("");

  const fetchBlacklist = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/fraud/blacklist");
      setEntries(res.data);
    } catch (err) {
      console.error("Failed to fetch blacklist", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/fraud/blacklist", {
        item_type: itemType,
        item_value: itemValue,
        reason
      });
      setShowModal(false);
      setItemValue("");
      setReason("");
      fetchBlacklist();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Lock className="h-8 w-8 text-rose-400" />
            Global Blacklist & Watchlist Registry
          </h1>
          <p className="mt-1 text-slate-400">
            Blacklist malicious PANs, Bank Accounts, IPs, UPI IDs, and Mobile Numbers from platform access
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/20"
        >
          <Plus className="h-4 w-4" /> Add Blacklist Entry
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Entry #</th>
                <th className="px-5 py-4">Item Type</th>
                <th className="px-5 py-4">Item Value</th>
                <th className="px-5 py-4">Reason</th>
                <th className="px-5 py-4 font-mono text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Loading Blacklist Registry...</td></tr>
              ) : (
                entries.map((b) => (
                  <tr key={b.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-rose-400 font-bold">{b.entry_code}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">{b.item_type}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-100 font-bold">{b.item_value}</td>
                    <td className="px-5 py-4 text-slate-400 font-sans text-xs">{b.reason}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {b.status}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Lock className="h-5 w-5 text-rose-400" /> Add Blacklist Entry
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEntry} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Item Type</label>
                <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:border-rose-500 focus:outline-none">
                  <option value="PAN">PAN Number</option>
                  <option value="BANK_ACCOUNT">Bank Account #</option>
                  <option value="IP">IP Address</option>
                  <option value="UPI">UPI ID</option>
                  <option value="MOBILE">Mobile Phone</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Item Value</label>
                <input type="text" required value={itemValue} onChange={(e) => setItemValue(e.target.value)} placeholder="e.g. ABCDE1234F or 192.168.1.1" className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:border-rose-500 focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Reason for Blacklisting</label>
                <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Regulatory AML flag / Confirmed identity fraud..." className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:border-rose-500 focus:outline-none" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-rose-600 font-semibold text-white hover:bg-rose-500">Add to Blacklist</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
