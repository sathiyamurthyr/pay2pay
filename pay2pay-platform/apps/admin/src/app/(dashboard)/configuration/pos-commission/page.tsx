"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Percent,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ShieldCheck,
  ChevronLeft,
  Sliders,
  HelpCircle,
  Save
} from "lucide-react";
import { apiClient } from "@/lib/api";

export default function PosCommissionConfigPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [paymentMode, setPaymentMode] = useState<string>("ALL");
  const [distCommission, setDistCommission] = useState<string>("0.00");
  const [sdCommission, setSdCommission] = useState<string>("0.00");
  const [defaultDistMdr, setDefaultDistMdr] = useState<string>("0.00");
  const [defaultSdMdr, setDefaultSdMdr] = useState<string>("0.00");
  const [companyId, setCompanyId] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await apiClient.get("/pos/admin/company-commission-config", {
        params: { payment_mode: paymentMode },
      });
      const data = res.data?.data || {};
      setDistCommission(String(data.distributor_commission_pct ?? 0.0));
      setSdCommission(String(data.sd_commission_pct ?? 0.0));
      setDefaultDistMdr(String(data.default_distributor_mdr ?? 0.0));
      setDefaultSdMdr(String(data.default_sd_mdr ?? 0.0));
      if (data.company_id) setCompanyId(data.company_id);
    } catch (err: any) {
      console.error("Error loading company commission config:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load commission configuration.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [paymentMode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const dCommNum = parseFloat(distCommission);
    const sdCommNum = parseFloat(sdCommission);
    const dMdrNum = parseFloat(defaultDistMdr);
    const sdMdrNum = parseFloat(defaultSdMdr);

    if (isNaN(dCommNum) || dCommNum < 0 || dCommNum > 100) {
      return setError("Distributor Commission must be a valid percentage between 0% and 100%.");
    }
    if (isNaN(sdCommNum) || sdCommNum < 0 || sdCommNum > 100) {
      return setError("Super Distributor Commission must be a valid percentage between 0% and 100%.");
    }

    try {
      setSaving(true);
      await apiClient.post("/pos/admin/company-commission-config", {
        distributor_commission_pct: dCommNum,
        sd_commission_pct: sdCommNum,
        default_distributor_mdr: isNaN(dMdrNum) ? 0.0 : dMdrNum,
        default_sd_mdr: isNaN(sdMdrNum) ? 0.0 : sdMdrNum,
        payment_mode: paymentMode,
        company_id: companyId || undefined,
      });

      setSuccessMsg("Company commission and default MDR configuration saved successfully!");
      fetchConfig();
    } catch (err: any) {
      console.error("Error saving commission config:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ── BREADCRUMB ── */}
      <Link
        href="/configuration"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-amber-300 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Configuration</span>
      </Link>

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              POS Hierarchy Commission & MDR
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-500/20">
              Company Defaults
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Configure default commission rates for Distributors & Super Distributors. Existing Retailer MDR remains independent.
          </p>
        </div>

        <button
          onClick={fetchConfig}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── INFO CALLOUT ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-amber-300">
          <HelpCircle className="w-4 h-4" />
          <span>Authoritative Rules Summary</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1">
          <li><strong>Existing Retailer MDR:</strong> Never modified by hierarchy defaults. Retailer uses existing configured MDR unless an authorized override exists.</li>
          <li><strong>Distributor & SD Commission:</strong> Earned separately on successful POS transactions and credited to their respective wallets.</li>
          <li><strong>Dynamic Defaults:</strong> 0.00% means zero commission is posted (no zero-rupee ledger clutter).</li>
          <li><strong>Audit Isolation:</strong> Changes apply only to future transactions. Historical financial records are strictly immutable.</li>
        </ul>
      </div>

      {/* ── FORM ── */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] space-y-5 shadow-sm">
          {/* Payment Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
              Select Payment Mode Scope
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full sm:w-80 px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400/50"
            >
              <option value="ALL">All Modes (Global Company Default)</option>
              <option value="POS - Instant">POS - Instant</option>
              <option value="POS+T1">POS+T1</option>
              <option value="POS+T2">POS+T2</option>
              <option value="VISA">VISA</option>
              <option value="MASTER">MASTER</option>
              <option value="RUPAY">RUPAY</option>
              <option value="AMEX / DINERS">AMEX / DINERS</option>
            </select>
          </div>

          <hr className="border-white/[0.06]" />

          {/* Section: Hierarchy Commissions */}
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" /> Hierarchy Commissions (% of POS Txn Volume)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Distributor Commission Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="100"
                    required
                    value={distCommission}
                    onChange={(e) => setDistCommission(e.target.value)}
                    placeholder="0.00"
                    className="w-full pr-8 pl-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-400/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Default: 0.00% (Earned by mapped distributor on retailer POS swipe)</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Super Distributor Commission Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="100"
                    required
                    value={sdCommission}
                    onChange={(e) => setSdCommission(e.target.value)}
                    placeholder="0.00"
                    className="w-full pr-8 pl-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-purple-400/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Default: 0.00% (Earned by mapped Super Distributor)</p>
              </div>
            </div>
          </div>

          <hr className="border-white/[0.06]" />

          {/* Section: Company Default MDRs */}
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-400" /> Company Default Partner MDR (% Charged if applicable)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Default Distributor MDR (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="100"
                    value={defaultDistMdr}
                    onChange={(e) => setDefaultDistMdr(e.target.value)}
                    placeholder="0.00"
                    className="w-full pr-8 pl-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-400/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Default: 0.00%</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Default Super Distributor MDR (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="100"
                    value={defaultSdMdr}
                    onChange={(e) => setDefaultSdMdr(e.target.value)}
                    placeholder="0.00"
                    className="w-full pr-8 pl-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-400/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Default: 0.00%</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── SAVE BUTTON ── */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Configuration...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Company Configuration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
