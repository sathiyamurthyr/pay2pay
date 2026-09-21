"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Percent,
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  CreditCard,
  Layers,
  X
} from "lucide-react";
import {
  SuperDistributorAPI,
  SuperDistributorMdrItem,
  MappedDistributorItem
} from "@/services/super-distributor-api";

export default function SuperDistributorMdrPage() {
  const searchParams = useSearchParams();
  const initialDistRef = searchParams.get("distributor_ref_id");

  const [items, setItems] = useState<SuperDistributorMdrItem[]>([]);
  const [distributors, setDistributors] = useState<MappedDistributorItem[]>([]);
  const [selectedDistRef, setSelectedDistRef] = useState<string>(initialDistRef || "ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDistRef, setModalDistRef] = useState<number | "">("");
  const [modalMode, setModalMode] = useState<string>("POS - Instant");
  const [modalRate, setModalRate] = useState<string>("1.65");
  const [modalGst, setModalGst] = useState<string>("18.0");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchDistributors = async () => {
    try {
      const res = await SuperDistributorAPI.listDistributors({ page_size: 100 });
      setDistributors(res.items || []);
    } catch (err) {
      console.error("Error loading distributors list:", err);
    }
  };

  const fetchMdrConfigs = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const distIdNum = selectedDistRef !== "ALL" ? Number(selectedDistRef) : undefined;
      const res = await SuperDistributorAPI.getMdrConfigs({
        distributor_ref_id: distIdNum,
        page_size: 100,
      });
      setItems(res.items || []);
    } catch (err: any) {
      console.error("Error fetching MDR configs:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load MDR configurations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDistributors();
  }, []);

  useEffect(() => {
    fetchMdrConfigs();
  }, [selectedDistRef]);

  const handleOpenModal = (existing?: SuperDistributorMdrItem) => {
    setSaveError(null);
    setSaveSuccess(null);
    if (existing) {
      setModalDistRef(existing.distributor_ref_id);
      setModalMode(existing.payment_mode);
      setModalRate(String(existing.mdr));
      setModalGst(String(existing.gst_rate || 18.0));
    } else {
      setModalDistRef(distributors.length > 0 ? distributors[0].distributor_ref_id : "");
      setModalMode("POS - Instant");
      setModalRate("1.65");
      setModalGst("18.0");
    }
    setModalOpen(true);
  };

  const handleSaveMdr = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!modalDistRef) {
      return setSaveError("Please select a mapped distributor.");
    }
    const rateNum = parseFloat(modalRate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 10) {
      return setSaveError("MDR rate must be between 0.00% and 10.00%.");
    }

    try {
      setSaving(true);
      await SuperDistributorAPI.setMdrConfig({
        distributor_ref_id: Number(modalDistRef),
        payment_mode: modalMode,
        mdr: rateNum,
        gst_rate: parseFloat(modalGst) || 18.0,
        service_name: "POS_TOPUP",
      });

      setSaveSuccess("MDR configuration saved successfully!");
      setTimeout(() => {
        setModalOpen(false);
        fetchMdrConfigs();
      }, 1000);
    } catch (err: any) {
      console.error("Error saving MDR:", err);
      setSaveError(err?.response?.data?.detail || err?.message || "Failed to save MDR configuration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              MDR Configuration
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-500/20">
              Downstream Hierarchy
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Set and manage custom POS settlement MDR rates for your mapped distributors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMdrConfigs}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Configure MDR</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchMdrConfigs} className="font-bold underline text-rose-200">
            Retry
          </button>
        </div>
      )}

      {/* ── FILTER BY DISTRIBUTOR ── */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-300">Filter Distributor:</span>
        </div>

        <select
          value={selectedDistRef}
          onChange={(e) => setSelectedDistRef(e.target.value)}
          className="px-3.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400/50"
        >
          <option value="ALL">All Mapped Distributors</option>
          {distributors.map((d) => (
            <option key={d.distributor_ref_id} value={d.distributor_ref_id}>
              {d.business_name} ({d.distributor_code})
            </option>
          ))}
        </select>
      </div>

      {/* ── MDR CONFIG TABLE ── */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-white/[0.02] border border-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Percent className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No Custom MDR Configured</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Mapped distributors are currently using default system rates. Click below to set a custom override.
            </p>
            <div className="pt-2">
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Configure MDR Rate</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Distributor</th>
                  <th className="p-4">Payment Mode</th>
                  <th className="p-4">MDR Type</th>
                  <th className="p-4 text-right">MDR Rate</th>
                  <th className="p-4 text-right">GST Rate</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.map((cfg) => (
                  <tr key={cfg.super_distributor_mdr_ref_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-200">{cfg.distributor_name || `Distributor #${cfg.distributor_ref_id}`}</p>
                        <p className="font-mono text-[10px] text-amber-400">{cfg.distributor_code || `REF-${cfg.distributor_ref_id}`}</p>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] font-bold text-slate-200">
                        {cfg.payment_mode}
                      </span>
                    </td>

                    <td className="p-4 text-slate-300 font-medium">
                      {cfg.mdr_type || "PERCENTAGE"}
                    </td>

                    <td className="p-4 text-right font-black text-amber-400 text-sm">
                      {Number(cfg.mdr).toFixed(2)}%
                    </td>

                    <td className="p-4 text-right text-slate-300 font-semibold">
                      {Number(cfg.gst_rate || 18.0).toFixed(2)}%
                    </td>

                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenModal(cfg)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-amber-400/20 hover:text-amber-300 text-[11px] font-semibold text-slate-300 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: SET / EDIT MDR ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0c1220] border border-white/[0.1] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">Set Distributor MDR</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveMdr} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Mapped Distributor *</label>
                <select
                  value={modalDistRef}
                  onChange={(e) => setModalDistRef(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:border-amber-400/50"
                >
                  <option value="">-- Select Distributor --</option>
                  {distributors.map((d) => (
                    <option key={d.distributor_ref_id} value={d.distributor_ref_id}>
                      {d.business_name} ({d.distributor_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Mode *</label>
                <select
                  value={modalMode}
                  onChange={(e) => setModalMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:border-amber-400/50"
                >
                  <option value="POS - Instant">POS - Instant</option>
                  <option value="POS+T1">POS+T1</option>
                  <option value="POS+T2">POS+T2</option>
                  <option value="VISA">VISA</option>
                  <option value="MASTER">MASTER</option>
                  <option value="RUPAY">RUPAY</option>
                  <option value="AMEX / DINERS">AMEX / DINERS</option>
                  <option value="Business/corporate">Business/corporate</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">MDR Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={modalRate}
                    onChange={(e) => setModalRate(e.target.value)}
                    placeholder="1.65"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={modalGst}
                    onChange={(e) => setModalGst(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 font-semibold hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold hover:brightness-110 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save MDR</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
