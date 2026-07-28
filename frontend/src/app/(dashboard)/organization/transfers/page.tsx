"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  ArrowLeftRight,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  X
} from "lucide-react";

interface TransferItem {
  public_id: string;
  entity_type: string;
  entity_id: string;
  old_parent_type: string;
  old_parent_id: string;
  new_parent_type: string;
  new_parent_id: string;
  effective_date: string;
  reason: string;
  status: string;
  approved_by?: string;
  created_date: string;
}

export default function OrganizationTransfersPage() {
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rms, setRms] = useState<any[]>([]);
  const [sds, setSds] = useState<any[]>([]);
  const [dists, setDists] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    entity_type: "SUPER_DISTRIBUTOR",
    entity_id: "",
    new_parent_type: "REGIONAL_MANAGER",
    new_parent_id: "",
    reason: ""
  });

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/organization/transfers");
      setTransfers(res.data.items);
    } catch (err) {
      console.error("Failed to fetch transfers", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHierarchyEntities = async () => {
    try {
      const rmRes = await api.get("/api/v1/organization/rms");
      setRms(rmRes.data.items);

      const sdRes = await api.get("/api/v1/organization/super-distributors");
      setSds(sdRes.data.items);

      const distRes = await api.get("/api/v1/organization/distributors");
      setDists(distRes.data.items);

      if (sdRes.data.items.length > 0) {
        setFormData(prev => ({ ...prev, entity_id: sdRes.data.items[0].public_id }));
      }
      if (rmRes.data.items.length > 0) {
        setFormData(prev => ({ ...prev, new_parent_id: rmRes.data.items[0].public_id }));
      }
    } catch (err) {
      console.error("Failed to load hierarchy entities", err);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchHierarchyEntities();
  }, []);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/organization/transfers", formData);
      setShowModal(false);
      fetchTransfers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Transfer request failed");
    }
  };

  const handleApprove = async (transferId: string) => {
    try {
      await api.post(`/api/v1/organization/transfers/${transferId}/approve`, { comments: "Approved by Admin" });
      fetchTransfers();
    } catch (err) {
      console.error("Approve failed", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/organization"
            className="flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
              <ArrowLeftRight className="h-7 w-7 text-emerald-400" />
              Organization Transfers & Workflow
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Audit trail of entity transfers between parent managers without settlement history mutation
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-all shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Request Entity Transfer
        </button>
      </div>

      {/* Transfer History Data Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Entity Type</th>
                <th className="px-5 py-4">Entity ID</th>
                <th className="px-5 py-4">New Parent Type</th>
                <th className="px-5 py-4">Reason</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    Loading Transfer Requests...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No hierarchy transfers requested yet.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-100">{t.entity_type}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{t.entity_id}</td>
                    <td className="px-5 py-4 font-mono text-xs text-emerald-400">{t.new_parent_type}</td>
                    <td className="px-5 py-4 text-xs text-slate-300">{t.reason}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          t.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {t.status === "PENDING_APPROVAL" && (
                        <button
                          onClick={() => handleApprove(t.public_id)}
                          className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500"
                        >
                          Approve Transfer
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

      {/* Transfer Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-emerald-400" />
                Request Hierarchy Entity Transfer
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Entity Type to Transfer *</label>
                <select
                  value={formData.entity_type}
                  onChange={(e) => {
                    const et = e.target.value;
                    setFormData({
                      ...formData,
                      entity_type: et,
                      new_parent_type: et === "SUPER_DISTRIBUTOR" ? "REGIONAL_MANAGER" : "SUPER_DISTRIBUTOR",
                      entity_id: et === "SUPER_DISTRIBUTOR" ? (sds[0]?.public_id || "") : (dists[0]?.public_id || ""),
                      new_parent_id: et === "SUPER_DISTRIBUTOR" ? (rms[0]?.public_id || "") : (sds[0]?.public_id || "")
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="SUPER_DISTRIBUTOR">Super Distributor</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Select Entity *</label>
                <select
                  value={formData.entity_id}
                  onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {(formData.entity_type === "SUPER_DISTRIBUTOR" ? sds : dists).map((item) => (
                    <option key={item.public_id} value={item.public_id}>
                      {item.business_name} ({item.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">New Parent Entity *</label>
                <select
                  value={formData.new_parent_id}
                  onChange={(e) => setFormData({ ...formData, new_parent_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {(formData.new_parent_type === "REGIONAL_MANAGER" ? rms : sds).map((item) => (
                    <option key={item.public_id} value={item.public_id}>
                      {item.full_name || item.business_name} ({item.employee_code || item.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Reason for Transfer *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Operational regional realigning"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Submit Transfer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
