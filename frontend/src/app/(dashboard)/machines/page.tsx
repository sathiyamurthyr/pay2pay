"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  CreditCard,
  Search,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  Wifi,
  Battery,
  ShieldCheck,
  X
} from "lucide-react";

export default function MachinesPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    serial_number: "",
    tid: "",
    mid: "",
    pos_model: "Pax A920",
    machine_type: "ANDROID_POS",
    os_version: "Android 11",
    firmware_version: "v2.4.1",
    sim_iccid: "",
    telecom_provider: "Airtel M2M",
    mapped_retailer_id: "",
    company_id: ""
  });

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/machines", {
        params: { search, status: statusFilter }
      });
      setMachines(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Failed to fetch machines", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSetupData = async () => {
    try {
      const compRes = await api.get("/api/v1/companies");
      setCompanies(compRes.data.items);

      const retRes = await api.get("/api/v1/retailers");
      setRetailers(retRes.data.items);

      if (compRes.data.items.length > 0) {
        setFormData(prev => ({ ...prev, company_id: compRes.data.items[0].public_id }));
      }
      if (retRes.data.items.length > 0) {
        setFormData(prev => ({ ...prev, mapped_retailer_id: retRes.data.items[0].public_id }));
      }
    } catch (err) {
      console.error("Failed to load setup data", err);
    }
  };

  useEffect(() => {
    fetchMachines();
    fetchSetupData();
  }, [search, statusFilter]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/machines", formData);
      setShowModal(false);
      fetchMachines();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Terminal registration failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-emerald-400" />
            POS Terminal Directory
          </h1>
          <p className="mt-1 text-slate-400">
            Multi-tenant POS swipe machines, TID/MID allocations, and live terminal health
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Deploy POS Terminal
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Serial, TID, MID, Model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INVENTORY">INVENTORY</option>
          <option value="FAULTY">FAULTY</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>

      {/* Grid Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Serial Number</th>
                <th className="px-5 py-4">TID / MID</th>
                <th className="px-5 py-4">Model & OS</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Loading Terminal Directory...
                  </td>
                </tr>
              ) : machines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No swipe machines found matching query.
                  </td>
                </tr>
              ) : (
                machines.map((m) => (
                  <tr key={m.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-emerald-400 font-semibold">{m.serial_number}</td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-slate-100 font-semibold">{m.tid}</div>
                      <div className="font-mono text-[10px] text-slate-400">{m.mid}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-200">{m.pos_model} ({m.machine_type})</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          m.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/machines/${m.public_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
                      >
                        Terminal Specs <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-400" />
                Deploy POS Swipe Machine
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-300">Target Retailer Outlet *</label>
                <select
                  value={formData.mapped_retailer_id}
                  onChange={(e) => setFormData({ ...formData, mapped_retailer_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {retailers.map((r) => (
                    <option key={r.public_id} value={r.public_id}>{r.store_name} ({r.retailer_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="SN-PAX-987654"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">POS Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="Pax A920"
                    value={formData.pos_model}
                    onChange={(e) => setFormData({ ...formData, pos_model: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Terminal ID (TID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="TID1000101"
                    value={formData.tid}
                    onChange={(e) => setFormData({ ...formData, tid: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Merchant ID (MID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="MID99887766"
                    value={formData.mid}
                    onChange={(e) => setFormData({ ...formData, mid: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">SIM ICCID (Optional)</label>
                  <input
                    type="text"
                    placeholder="899100123456789"
                    value={formData.sim_iccid}
                    onChange={(e) => setFormData({ ...formData, sim_iccid: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Telecom Provider</label>
                  <input
                    type="text"
                    placeholder="Airtel M2M"
                    value={formData.telecom_provider}
                    onChange={(e) => setFormData({ ...formData, telecom_provider: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg"
                >
                  Deploy Terminal & Inject DUKPT Keys
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
