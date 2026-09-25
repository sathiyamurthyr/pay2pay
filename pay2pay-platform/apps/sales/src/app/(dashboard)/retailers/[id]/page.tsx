"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";
import {
  Store, Building2, Users, Layers, QrCode, Sliders, ArrowLeft,
  Phone, Mail, MapPin, Calendar, CheckCircle2, ShieldCheck,
  Receipt, TrendingUp, RefreshCw, AlertCircle, Sparkles, Plus
} from "lucide-react";

export default function RetailerDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const retailerId = params.id as string;

  const [isMdrModalOpen, setIsMdrModalOpen] = useState(false);
  const [mdrCardType, setMdrCardType] = useState("Visa Credit & Debit");
  const [mdrPaymentMode, setMdrPaymentMode] = useState("POS_INSTANT");
  const [mdrRate, setMdrRate] = useState("1.40");
  const [mdrFeedback, setMdrFeedback] = useState<string | null>(null);

  // Fetch Retailer Detail
  const { data: retailerData, isLoading, refetch } = useQuery({
    queryKey: ["sales-retailer-detail", retailerId],
    queryFn: async () => {
      const res = await apiClient.get(`/sales/hierarchy/retailers/${retailerId}`);
      return res.data;
    },
    enabled: !!retailerId,
  });

  // MDR Setup Mutation
  const mdrMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post(`/sales/pos/mdr-config`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      setMdrFeedback(data.message || "MDR configuration saved!");
      queryClient.invalidateQueries({ queryKey: ["sales-retailer-detail", retailerId] });
      setTimeout(() => {
        setIsMdrModalOpen(false);
        setMdrFeedback(null);
      }, 1200);
    },
    onError: (err: any) => {
      setMdrFeedback(err.response?.data?.detail || err.message || "Failed to save MDR");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          <span>Loading merchant profile & hierarchy lineage...</span>
        </div>
      </div>
    );
  }

  if (!retailerData || !retailerData.retailer) {
    return (
      <div className="p-12 text-center text-slate-400">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-3" />
        <div className="text-lg font-bold text-white">Merchant Not Found or Unauthorized</div>
        <p className="text-xs text-slate-500 mt-1">
          This retailer may belong to another tenant or outside your authorized mapping.
        </p>
        <Link href="/hierarchy/retailers" className="text-xs text-indigo-400 hover:underline mt-4 inline-block">
          Return to Retailers Directory
        </Link>
      </div>
    );
  }

  const { retailer, hierarchy, pos_machines = [], mdr_configurations = [], transactions = [] } = retailerData;

  const handleSaveMdr = (e: React.FormEvent) => {
    e.preventDefault();
    mdrMutation.mutate({
      target_type: "RETAILER",
      target_id: retailer.public_id,
      card_type: mdrCardType,
      payment_mode: mdrPaymentMode,
      mdr_rate_percentage: parseFloat(mdrRate),
      is_active: true,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/hierarchy/retailers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Retailers Directory
        </Link>
      </div>

      {/* Main Profile Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-900/30">
            {(retailer.store_name || "R").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{retailer.store_name}</h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {retailer.retailer_code}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {retailer.status || "ACTIVE"}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-4">
              <span>Legal Name: <strong className="text-slate-200">{retailer.legal_name || retailer.owner_name}</strong></span>
              <span>&bull;</span>
              <span>Category: <strong className="text-slate-200">{retailer.business_category || "Retail FinTech"}</strong></span>
              <span>&bull;</span>
              <span>Onboarded: <strong className="text-slate-200">{formatDateShort(retailer.created_date)}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsMdrModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
        >
          <Sliders className="w-4 h-4" />
          Configure POS MDR
        </button>
      </div>

      {/* Hierarchy Lineage Breadcrumb Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          Verified Hierarchy Lineage (Tenant-Isolated)
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-semibold text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            {hierarchy.tenant_name || "Tenant"}
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-semibold text-slate-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            SD: {hierarchy.super_distributor_name || "Direct Hub"}
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Dist: {hierarchy.distributor_name || "Direct Dist"}
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 font-bold text-emerald-400 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-emerald-400" />
            {retailer.store_name}
          </span>
        </div>
      </div>

      {/* Contact & Business Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            Contact & Business Details
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <span className="text-slate-400">Mobile Phone:</span>
              <span className="font-semibold text-white flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" />
                {retailer.mobile || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <span className="text-slate-400">Email Address:</span>
              <span className="font-semibold text-white flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-500" />
                {retailer.email || "N/A"}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="text-slate-400 mb-1">Registered Address:</div>
              <div className="font-semibold text-white flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{retailer.address || "No address on record"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* POS Terminals Summary */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-amber-400" />
              Assigned POS Machines ({pos_machines.length})
            </h2>
          </div>

          {pos_machines.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/60">
              No POS terminals mapped to this retailer.
            </div>
          ) : (
            <div className="space-y-2">
              {pos_machines.map((pos: any) => (
                <div
                  key={pos.pos_machine_id || pos.terminal_id}
                  className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>TID: {pos.terminal_id}</span>
                      <span className="text-[10px] font-mono text-amber-300">({pos.pos_machine_id})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Assigned: {formatDateShort(pos.assigned_date)} &bull; Status: {pos.status}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                    {pos.status || "ACTIVE"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* POS MDR Configuration Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Active POS MDR Configuration
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Card scheme rates applied during POS settlement and commission calculation
            </p>
          </div>

          <button
            onClick={() => setIsMdrModalOpen(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add / Update MDR
          </button>
        </div>

        {mdr_configurations.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/60">
            Using default tenant MDR rate slabs. Click &ldquo;Configure POS MDR&rdquo; to customize.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-4">Card Scheme / Type</th>
                  <th className="py-2.5 px-4">Settlement Mode</th>
                  <th className="py-2.5 px-4 text-center">MDR Rate (%)</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {mdr_configurations.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-950/40">
                    <td className="py-3 px-4 font-bold text-white">{m.card_type}</td>
                    <td className="py-3 px-4 text-slate-300">{m.payment_mode}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-300">
                      {m.mdr_rate_percentage}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {formatDate(m.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Transactions for Retailer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Receipt className="w-4 h-4 text-indigo-400" />
          Recent Transactions
        </h2>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No transactions recorded yet for this merchant.
          </div>
        ) : (
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden text-xs">
            {transactions.map((t: any) => (
              <div key={t.id || t.txn_id} className="p-3.5 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{t.txn_id}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {t.service}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(t.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">{formatCurrency(t.amount)}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">{t.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MDR Setup Modal */}
      {isMdrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Configure POS MDR for Merchant
              </h3>
              <button
                onClick={() => setIsMdrModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {mdrFeedback && (
              <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs">
                {mdrFeedback}
              </div>
            )}

            <form onSubmit={handleSaveMdr} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[10px]">
                  Card Scheme / Brand
                </label>
                <select
                  value={mdrCardType}
                  onChange={(e) => setMdrCardType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                >
                  <option value="Visa Credit & Debit">Visa Credit & Debit</option>
                  <option value="Mastercard Credit & Debit">Mastercard Credit & Debit</option>
                  <option value="RuPay Platinum & Commercial">RuPay Platinum & Commercial</option>
                  <option value="Amex / Diners Club">Amex / Diners Club</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[10px]">
                  Settlement Speed
                </label>
                <select
                  value={mdrPaymentMode}
                  onChange={(e) => setMdrPaymentMode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                >
                  <option value="POS_INSTANT">POS - Instant Settlement</option>
                  <option value="POS_T1">POS+T1 (Next Working Day)</option>
                  <option value="POS_T2">POS+T2 (2 Working Days)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[10px]">
                  MDR Rate Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="5.0"
                  value={mdrRate}
                  onChange={(e) => setMdrRate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMdrModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mdrMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {mdrMutation.isPending ? "Saving..." : "Save MDR Setup"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
