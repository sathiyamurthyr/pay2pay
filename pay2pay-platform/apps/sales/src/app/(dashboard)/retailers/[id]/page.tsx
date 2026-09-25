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
  Receipt, TrendingUp, RefreshCw, AlertCircle, Sparkles, Plus, X
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
        <div className="flex items-center gap-3 text-[#6B7280]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#94003A]" />
          <span className="font-semibold text-sm">Loading merchant profile & hierarchy lineage...</span>
        </div>
      </div>
    );
  }

  if (!retailerData || !retailerData.retailer) {
    return (
      <div className="p-12 text-center text-[#6B7280]">
        <AlertCircle className="w-12 h-12 mx-auto text-[#DC2626] mb-3" />
        <div className="text-lg font-bold text-[#1F2937]">Merchant Not Found or Unauthorized</div>
        <p className="text-xs text-[#6B7280] mt-1">
          This retailer may belong to another tenant or outside your authorized mapping.
        </p>
        <Link href="/hierarchy/retailers" className="text-xs text-[#94003A] font-bold hover:underline mt-4 inline-block">
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
    <div className="space-y-6 w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto pb-12">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/hierarchy/retailers"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#4B5563] hover:text-[#94003A] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Retailers Directory
        </Link>
      </div>

      {/* Main Profile Header */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] border border-[#94003A]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E7B631] to-[#D3A51F] text-[#1F2937] flex items-center justify-center font-black text-2xl shadow-md">
            {(retailer.store_name || "R").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-white">{retailer.store_name}</h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                {retailer.retailer_code}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                {retailer.status || "ACTIVE"}
              </span>
            </div>
            <div className="text-xs text-[#F8E6EE]/80 mt-1 flex flex-wrap items-center gap-4 font-medium">
              <span>Legal Name: <strong className="text-white">{retailer.legal_name || retailer.owner_name}</strong></span>
              <span>&bull;</span>
              <span>Category: <strong className="text-white">{retailer.business_category || "Retail FinTech"}</strong></span>
              <span>&bull;</span>
              <span>Onboarded: <strong className="text-white">{formatDateShort(retailer.created_date)}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsMdrModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E7B631] hover:bg-[#D3A51F] text-[#1F2937] text-xs font-bold shadow-sm transition"
        >
          <Sliders className="w-4 h-4" />
          Configure POS MDR
        </button>
      </div>

      {/* Hierarchy Lineage Breadcrumb Banner */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#94003A]" />
          Verified Hierarchy Lineage (Tenant-Isolated)
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-[#FAFAFC] border border-[#E5E7EB] font-semibold text-[#4B5563] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#94003A]" />
            {hierarchy.tenant_name || "Tenant"}
          </span>
          <span className="text-[#9CA3AF]">&rarr;</span>
          <span className="px-3 py-1.5 rounded-xl bg-[#F8E6EE] border border-[#94003A]/20 font-bold text-[#94003A] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            SD: {hierarchy.super_distributor_name || "Direct Hub"}
          </span>
          <span className="text-[#9CA3AF]">&rarr;</span>
          <span className="px-3 py-1.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] font-bold text-[#92400E] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Dist: {hierarchy.distributor_name || "Direct Dist"}
          </span>
          <span className="text-[#9CA3AF]">&rarr;</span>
          <span className="px-3 py-1.5 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] font-bold text-[#166534] flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            {retailer.store_name}
          </span>
        </div>
      </div>

      {/* Contact & Business Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
            <Store className="w-4 h-4 text-[#94003A]" />
            Contact & Business Details
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Mobile Phone:</span>
              <span className="font-bold text-[#1F2937] flex items-center gap-1 font-mono">
                <Phone className="w-3 h-3 text-[#9CA3AF]" />
                {retailer.mobile || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Email Address:</span>
              <span className="font-semibold text-[#1F2937] flex items-center gap-1">
                <Mail className="w-3 h-3 text-[#9CA3AF]" />
                {retailer.email || "N/A"}
              </span>
            </div>
            <div className="p-3 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB]">
              <div className="text-[#6B7280] mb-1">Registered Address:</div>
              <div className="font-medium text-[#1F2937] flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0 mt-0.5" />
                <span>{retailer.address || "No address on record"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* POS Terminals Summary */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#D97706]" />
              Assigned POS Machines ({pos_machines.length})
            </h2>
          </div>

          {pos_machines.length === 0 ? (
            <div className="p-8 text-center text-[#9CA3AF] text-xs bg-[#FAFAFC] rounded-2xl border border-[#E5E7EB]">
              No POS terminals mapped to this retailer.
            </div>
          ) : (
            <div className="space-y-2">
              {pos_machines.map((pos: any) => (
                <div
                  key={pos.pos_machine_id || pos.terminal_id}
                  className="p-3 bg-[#FAFAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#1F2937] flex items-center gap-2">
                      <span>TID: {pos.terminal_id}</span>
                      <span className="text-[10px] font-mono text-[#D97706]">({pos.pos_machine_id})</span>
                    </div>
                    <div className="text-[10px] text-[#6B7280] mt-0.5">
                      Assigned: {formatDateShort(pos.assigned_date)} &bull; Status: {pos.status}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] text-[10px] font-bold border border-[#86EFAC]">
                    {pos.status || "ACTIVE"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* POS MDR Configuration Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#94003A]" />
              Active POS MDR Configuration
            </h2>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Card scheme rates applied during POS settlement and commission calculation
            </p>
          </div>

          <button
            onClick={() => setIsMdrModalOpen(true)}
            className="text-xs text-[#94003A] hover:underline font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add / Update MDR
          </button>
        </div>

        {mdr_configurations.length === 0 ? (
          <div className="p-6 text-center text-[#9CA3AF] text-xs bg-[#FAFAFC] rounded-2xl border border-[#E5E7EB]">
            Using default tenant MDR rate slabs. Click &ldquo;Configure POS MDR&rdquo; to customize.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFC] text-[#4B5563] uppercase font-bold">
                  <th className="py-2.5 px-4">Card Scheme / Type</th>
                  <th className="py-2.5 px-4">Settlement Mode</th>
                  <th className="py-2.5 px-4 text-center">MDR Rate (%)</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {mdr_configurations.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#FDF3F7]">
                    <td className="py-3 px-4 font-bold text-[#1F2937]">{m.card_type}</td>
                    <td className="py-3 px-4 text-[#4B5563]">{m.payment_mode}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-[#D97706]">
                      {m.mdr_rate_percentage}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-bold">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#6B7280] font-mono text-[11px]">
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
      <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#94003A]" />
          Recent Transactions
        </h2>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-[#9CA3AF] text-xs bg-[#FAFAFC] rounded-2xl border border-[#E5E7EB]">
            No transactions recorded yet for this merchant.
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-2xl overflow-hidden text-xs">
            {transactions.map((t: any) => (
              <div key={t.id || t.txn_id} className="p-3.5 bg-[#FAFAFC] flex items-center justify-between hover:bg-[#FDF3F7] transition">
                <div>
                  <div className="font-bold text-[#1F2937] flex items-center gap-2">
                    <span className="font-mono text-[#94003A]">{t.txn_id}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#4B5563] border border-[#E5E7EB]">
                      {t.service}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#6B7280] mt-0.5">{formatDate(t.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#1F2937] font-mono">{formatCurrency(t.amount)}</div>
                  <div className="text-[10px] text-[#16A34A] font-bold">{t.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MDR Setup Modal */}
      {isMdrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl text-[#1F2937]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold text-[#1F2937] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#94003A]" />
                Configure POS MDR for Merchant
              </h3>
              <button
                onClick={() => setIsMdrModalOpen(false)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1F2937] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mdrFeedback && (
              <div className="p-3 rounded-xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] text-xs font-semibold">
                {mdrFeedback}
              </div>
            )}

            <form onSubmit={handleSaveMdr} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#6B7280] mb-1 font-bold uppercase text-[10px]">
                  Card Scheme / Brand
                </label>
                <select
                  value={mdrCardType}
                  onChange={(e) => setMdrCardType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                >
                  <option value="Visa Credit & Debit">Visa Credit & Debit</option>
                  <option value="Mastercard Credit & Debit">Mastercard Credit & Debit</option>
                  <option value="RuPay Platinum & Commercial">RuPay Platinum & Commercial</option>
                  <option value="Amex / Diners Club">Amex / Diners Club</option>
                </select>
              </div>

              <div>
                <label className="block text-[#6B7280] mb-1 font-bold uppercase text-[10px]">
                  Settlement Speed
                </label>
                <select
                  value={mdrPaymentMode}
                  onChange={(e) => setMdrPaymentMode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                >
                  <option value="POS_INSTANT">POS - Instant Settlement</option>
                  <option value="POS_T1">POS+T1 (Next Working Day)</option>
                  <option value="POS_T2">POS+T2 (2 Working Days)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#6B7280] mb-1 font-bold uppercase text-[10px]">
                  MDR Rate Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="5.0"
                  value={mdrRate}
                  onChange={(e) => setMdrRate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20 font-mono font-bold text-sm text-[#D97706]"
                  required
                />
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMdrModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB] rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mdrMutation.isPending}
                  className="px-5 py-2 bg-[#94003A] hover:bg-[#78002F] text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
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
