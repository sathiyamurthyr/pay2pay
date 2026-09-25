"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Sliders, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw,
  Store, Layers, Users, CreditCard, Sparkles, ArrowRight
} from "lucide-react";

export default function PosMdrSetupStudioPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [targetType, setTargetType] = useState<"RETAILER" | "DISTRIBUTOR" | "SUPER_DISTRIBUTOR">("RETAILER");
  const [targetId, setTargetId] = useState(searchParams.get("ret_id") || searchParams.get("dist_id") || "");
  const [cardType, setCardType] = useState("Visa Credit & Debit");
  const [paymentMode, setPaymentMode] = useState("POS_INSTANT");
  const [mdrRate, setMdrRate] = useState("1.40");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch MDR Options (Card types and payment modes supported by backend)
  const { data: mdrOptions } = useQuery({
    queryKey: ["sales-mdr-options"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/pos/mdr-options");
      return res.data;
    },
  });

  // Fetch Target Hierarchy Options based on selected type
  const { data: targetList = [], isLoading: isLoadingTargets } = useQuery({
    queryKey: ["sales-mdr-targets", targetType],
    queryFn: async () => {
      if (targetType === "RETAILER") {
        const res = await apiClient.get("/sales/hierarchy/retailers?limit=200");
        return Array.isArray(res.data) ? res.data : [];
      } else if (targetType === "DISTRIBUTOR") {
        const res = await apiClient.get("/sales/hierarchy/distributors");
        return Array.isArray(res.data) ? res.data : [];
      } else {
        const res = await apiClient.get("/sales/hierarchy/super-distributors");
        return Array.isArray(res.data) ? res.data : [];
      }
    },
  });

  // Save MDR Mutation
  const saveMdrMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post("/sales/pos/mdr-config", payload);
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ type: "success", message: data.message || "MDR configuration applied successfully!" });
      queryClient.invalidateQueries({ queryKey: ["sales-mdr-configs"] });
      queryClient.invalidateQueries({ queryKey: ["sales-retailers"] });
    },
    onError: (err: any) => {
      setFeedback({ type: "error", message: err.response?.data?.detail || err.message || "Failed to configure MDR" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!targetId) {
      setFeedback({ type: "error", message: "Please select a target merchant or distribution node." });
      return;
    }
    saveMdrMutation.mutate({
      target_type: targetType,
      target_id: targetId,
      card_type: cardType,
      payment_mode: paymentMode,
      mdr_rate_percentage: parseFloat(mdrRate),
      is_active: true,
    });
  };

  const cardTypes = mdrOptions?.card_types || [
    "Visa Credit & Debit",
    "Mastercard Credit & Debit",
    "RuPay Platinum & Commercial",
    "Amex / Diners Club",
  ];

  const paymentModes = mdrOptions?.payment_modes || [
    { code: "POS_INSTANT", name: "POS - Instant Settlement" },
    { code: "POS_T1", name: "POS+T1 (Next Working Day)" },
    { code: "POS_T2", name: "POS+T2 (2 Working Days)" },
  ];

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] border border-[#94003A]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E7B631] mb-2">
            <Sliders className="w-4 h-4" />
            MDR Slabs & Commercial Rate Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">POS MDR Setup Studio</h1>
          <p className="text-[#F8E6EE]/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Configure dynamic Merchant Discount Rates (MDR) across card schemes and settlement speeds strictly within your authorized tenant hierarchy.
          </p>
        </div>

        <Link
          href="/pos-mdr/requests"
          className="px-4 py-2.5 bg-[#E7B631] hover:bg-[#D9A320] text-[#1F2937] rounded-xl text-xs font-black shadow-sm transition flex items-center gap-2 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-[#94003A]" />
          <span>MDR Change Request Hub →</span>
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3 border ${
            feedback.type === "success"
              ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
              : "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#16A34A]" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-[#DC2626]" />
          )}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-[#1F2937]">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Level */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              1. Select Hierarchy Scope Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: "RETAILER", label: "Specific Retailer", icon: Store },
                { type: "DISTRIBUTOR", label: "Distributor Network", icon: Layers },
                { type: "SUPER_DISTRIBUTOR", label: "Super Dist Hub", icon: Users },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = targetType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setTargetType(opt.type as any);
                      setTargetId("");
                    }}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col items-start gap-2 ${
                      isSelected
                        ? "bg-[#F8E6EE] border-[#94003A] text-[#94003A] shadow-xs"
                        : "bg-[#FAFAFC] border-[#E5E7EB] text-[#4B5563] hover:bg-white hover:border-[#D1D5DB]"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? "text-[#94003A]" : "text-[#6B7280]"}`} />
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Entity */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              2. Target {targetType.replace("_", " ")}
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-4 py-3 bg-[#FAFAFC] border border-[#D1D5DB] rounded-2xl text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
              required
            >
              <option value="">-- Select {targetType.replace("_", " ")} --</option>
              {targetList.map((item: any) => (
                <option key={item.id || item.public_id} value={item.id || item.public_id}>
                  {item.store_name || item.name} ({item.retailer_code || item.code || "ID"})
                </option>
              ))}
            </select>
          </div>

          {/* Card Scheme & Settlement Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                3. Card Scheme / Brand
              </label>
              <select
                value={cardType}
                onChange={(e) => setCardType(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAFAFC] border border-[#D1D5DB] rounded-2xl text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
              >
                {cardTypes.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                4. Settlement Speed
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAFAFC] border border-[#D1D5DB] rounded-2xl text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
              >
                {paymentModes.map((m: any) => (
                  <option key={m.code || m} value={m.code || m}>
                    {m.name || m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rate Percentage */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              5. MDR Rate Percentage (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.05"
                max="5.0"
                value={mdrRate}
                onChange={(e) => setMdrRate(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAFAFC] border border-[#D1D5DB] rounded-2xl text-lg font-mono font-bold text-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] font-mono text-sm font-bold">
                %
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280]">
              This rate will be used by the backend transaction calculation engine during live POS swipes.
            </p>
          </div>

          {/* Security Banner */}
          <div className="p-4 bg-[#F8E6EE]/50 rounded-2xl border border-[#94003A]/20 flex items-center gap-3 text-xs text-[#94003A]">
            <ShieldCheck className="w-5 h-5 text-[#94003A] shrink-0" />
            <span className="font-semibold">
              Tenant Isolation Enforced: MDR updates are strictly restricted to entities in your authorized mapping.
            </span>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saveMdrMutation.isPending}
              className="px-6 py-3 bg-[#94003A] hover:bg-[#78002F] text-white rounded-2xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
            >
              {saveMdrMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sliders className="w-4 h-4" />
              )}
              <span>Apply & Save MDR Rate</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
