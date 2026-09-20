"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Percent,
  Users,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  CreditCard,
  Building2,
  HelpCircle,
  SlidersHorizontal
} from "lucide-react";
import { DistributorAPI, MappedRetailerItem, DistributorMdrItem } from "@/services/distributor-api";

const SERVICES_CONFIG = [
  {
    code: "POS",
    name: "Point of Sale (Card Swipe)",
    modes: ["VISA", "MASTER", "RUPAY", "AMEX / DINERS"]
  },
  {
    code: "DMT",
    name: "Domestic Money Transfer (DMT)",
    modes: ["IMPS", "NEFT"]
  },
  {
    code: "RECHARGE",
    name: "Mobile & DTH Recharge",
    modes: ["PREPAID", "POSTPAID", "DTH"]
  },
  {
    code: "BILL_PAYMENT",
    name: "BBPS Bill Payments",
    modes: ["ELECTRICITY", "WATER", "GAS", "BROADBAND"]
  }
];

export default function DistributorMdrPage() {
  const searchParams = useSearchParams();
  const preselectedRetailer = searchParams.get("retailer");

  const [retailers, setRetailers] = useState<MappedRetailerItem[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState<number | null>(
    preselectedRetailer ? Number(preselectedRetailer) : null
  );
  const [selectedService, setSelectedService] = useState<string>("POS");
  const [existingMdrList, setExistingMdrList] = useState<DistributorMdrItem[]>([]);
  const [loadingRetailers, setLoadingRetailers] = useState<boolean>(true);
  const [loadingMdr, setLoadingMdr] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form inputs for editing MDR
  const [selectedMode, setSelectedMode] = useState<string>("VISA");
  const [mdrRate, setMdrRate] = useState<string>("1.75");
  const [mdrType, setMdrType] = useState<string>("PERCENTAGE");
  const [gstRate, setGstRate] = useState<string>("18.00");

  // Fetch mapped retailers
  useEffect(() => {
    async function loadRetailers() {
      try {
        setLoadingRetailers(true);
        const res = await DistributorAPI.getRetailers({ page_size: 100 });
        const list = res?.data || [];
        setRetailers(list);
        if (!selectedRetailerId && list.length > 0) {
          setSelectedRetailerId(list[0].retailer_ref_id);
        }
      } catch (err: any) {
        console.error("Retailer list load error:", err);
      } finally {
        setLoadingRetailers(false);
      }
    }
    loadRetailers();
  }, []);

  // Fetch configured MDR when selected retailer changes
  useEffect(() => {
    async function loadMdr() {
      if (!selectedRetailerId) {
        setExistingMdrList([]);
        return;
      }
      try {
        setLoadingMdr(true);
        const res = await DistributorAPI.getMdrConfigurations({ retailer_ref_id: selectedRetailerId });
        setExistingMdrList(res?.data || []);
      } catch (err: any) {
        console.error("MDR load error:", err);
      } finally {
        setLoadingMdr(false);
      }
    }
    loadMdr();
  }, [selectedRetailerId]);

  // Update current mode options when service changes
  useEffect(() => {
    const svc = SERVICES_CONFIG.find((s) => s.code === selectedService);
    if (svc && svc.modes.length > 0) {
      setSelectedMode(svc.modes[0]);
    }
  }, [selectedService]);

  // Pre-fill rate if already configured
  useEffect(() => {
    const existing = existingMdrList.find(
      (m) => m.service_name === selectedService && m.payment_mode === selectedMode
    );
    if (existing) {
      setMdrRate(String(existing.mdr));
      setMdrType(existing.mdr_type || "PERCENTAGE");
      setGstRate(String(existing.gst_rate || 18.0));
    } else {
      // Default rate suggestion
      if (selectedService === "POS") setMdrRate("1.75");
      else if (selectedService === "DMT") setMdrRate("0.45");
      else if (selectedService === "RECHARGE") setMdrRate("1.20");
      else setMdrRate("0.50");
      setMdrType("PERCENTAGE");
      setGstRate("18.00");
    }
  }, [selectedService, selectedMode, existingMdrList]);

  const handleSaveMdr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetailerId) {
      setFeedback({ type: "error", message: "Please select a mapped retailer to configure." });
      return;
    }
    const rateVal = parseFloat(mdrRate);
    if (isNaN(rateVal) || rateVal < 0) {
      setFeedback({ type: "error", message: "Please enter a valid non-negative MDR rate." });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      await DistributorAPI.saveMdrConfiguration({
        retailer_ref_id: selectedRetailerId,
        service_name: selectedService,
        payment_mode: selectedMode,
        mdr: rateVal,
        mdr_type: mdrType,
        gst_rate: parseFloat(gstRate) || 18.0
      });
      setFeedback({
        type: "success",
        message: `MDR for ${selectedService} (${selectedMode}) saved successfully!`
      });
      // Refresh list
      const res = await DistributorAPI.getMdrConfigurations({ retailer_ref_id: selectedRetailerId });
      setExistingMdrList(res?.data || []);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.response?.data?.detail || "Failed to save MDR configuration."
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedRetailerObj = retailers.find((r) => r.retailer_ref_id === selectedRetailerId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
            Distributor MDR Setup
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure retailer-specific MDR rates exclusively for retailers mapped to your distributor network.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/retailers"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Mapped Retailers
          </Link>
        </div>
      </div>

      {/* Security Rule Alert */}
      <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/25 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="text-amber-300 font-semibold block mb-0.5">
            Strict Retailer-Specific Security Rule
          </strong>
          <span className="text-slate-300">
            Distributor MDR is strictly non-global and applies ONLY to your directly mapped retailers.
            Configuring MDR for another distributor's retailers is cryptographically rejected by the backend server.
          </span>
        </div>
      </div>

      {loadingRetailers ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
          Loading mapped retailers...
        </div>
      ) : retailers.length === 0 ? (
        /* Empty state when no retailers are mapped */
        <div className="p-12 rounded-2xl bg-[#111827]/80 border border-white/[0.08] text-center shadow-xl">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No retailers mapped yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            You must have at least one mapped retailer in your network before you can configure custom MDR rates.
          </p>
          <Link
            href="/retailers"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Invite your first retailer
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Configuration Form (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/[0.06]">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              Configure Retailer Rate
            </h3>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveMdr} className="space-y-4 text-xs">
              {/* Select Mapped Retailer */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Select Mapped Retailer *
                </label>
                <select
                  value={selectedRetailerId || ""}
                  onChange={(e) => setSelectedRetailerId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-amber-500/60"
                >
                  {retailers.map((r) => (
                    <option key={r.retailer_ref_id} value={r.retailer_ref_id} className="bg-[#111827]">
                      {r.owner_name || r.store_name} ({r.retailer_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Service */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Service Channel *
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-amber-500/60"
                >
                  {SERVICES_CONFIG.map((s) => (
                    <option key={s.code} value={s.code} className="bg-[#111827]">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Mode / Card Type */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Card Type / Payment Mode *
                </label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-amber-500/60"
                >
                  {SERVICES_CONFIG.find((s) => s.code === selectedService)?.modes.map((m) => (
                    <option key={m} value={m} className="bg-[#111827]">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* MDR Rate & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    MDR Rate *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={mdrRate}
                    onChange={(e) => setMdrRate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono focus:outline-none focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Calculation Type
                  </label>
                  <select
                    value={mdrType}
                    onChange={(e) => setMdrType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-amber-500/60"
                  >
                    <option value="PERCENTAGE" className="bg-[#111827]">Percentage (%)</option>
                    <option value="FLAT" className="bg-[#111827]">Flat Fee (INR)</option>
                  </select>
                </div>
              </div>

              {/* GST Rate */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Applicable GST Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save MDR Configuration
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Configured Rates Table (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-400" />
                  Active Custom MDR Rates
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Retailer:{" "}
                  <strong className="text-amber-300">
                    {selectedRetailerObj ? `${selectedRetailerObj.owner_name} (${selectedRetailerObj.retailer_code})` : "None Selected"}
                  </strong>
                </p>
              </div>
            </div>

            {loadingMdr ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400 mx-auto mb-2" />
                Loading configured rates...
              </div>
            ) : existingMdrList.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <Percent className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-300">No custom MDR configured for this retailer</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Use the configuration form on the left to set custom MDR rates for POS card types, DMT transfers, or recharge services.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06] bg-white/[0.02]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Service</th>
                      <th className="py-2.5 px-3 font-semibold">Mode / Card</th>
                      <th className="py-2.5 px-3 font-semibold text-right">MDR Rate</th>
                      <th className="py-2.5 px-3 font-semibold text-right">GST Rate</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-slate-200">
                    {existingMdrList.map((m) => (
                      <tr key={m.distributor_mdr_ref_id} className="hover:bg-white/[0.03]">
                        <td className="py-2.5 px-3 font-bold text-white">{m.service_name}</td>
                        <td className="py-2.5 px-3 text-slate-300">{m.payment_mode}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                          {m.mdr}{m.mdr_type === "PERCENTAGE" ? "%" : " ₹"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {m.gst_rate}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {m.status || "ACTIVE"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
