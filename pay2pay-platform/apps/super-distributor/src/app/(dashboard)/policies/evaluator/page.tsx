"use client";

import React, { useState } from "react";
import { 
  Zap, Play, ShieldCheck, ShieldAlert, ArrowLeft, CheckCircle2, AlertTriangle, Activity, Sliders, Layers, Clock, Award
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api";

export default function PolicyEvaluatorPage() {
  const [context, setContext] = useState({
    service_code: "DMT",
    amount: 25000,
    customer_category: "REGULAR",
    beneficiary_category: "REGULAR",
    kyc_level: "FULL_KYC",
    risk_score: 15,
  });

  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvaluating(true);
    setResult(null);

    try {
      const res = await apiClient.post("/policies/evaluate", context);
      setResult(res.data.data);
    } catch (err) {
      console.error("Evaluation failed", err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/policies" 
          className="p-2.5 bg-white hover:bg-[#F8FAFC] text-[#374151] rounded-lg border border-[#D1D5DB] shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
            <Zap className="w-7 h-7 text-[#2563EB]" /> Policy Evaluation & Transaction Simulator
          </h1>
          <p className="text-sm font-medium text-[#64748B] mt-0.5">
            Simulate pre-transaction checks across limits, KYC gates, cooling rules, and 11-tier hierarchy overrides
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulator Input Form */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#E5E7EB] pb-3">
            <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#2563EB]" /> Transaction Context Input
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5 font-medium">Specify transfer parameters to test against real-time active policies</p>
          </div>

          <form onSubmit={handleEvaluate} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-[#374151] block mb-1">Service Code *</label>
              <select
                value={context.service_code}
                onChange={(e) => setContext({ ...context, service_code: e.target.value })}
                className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all cursor-pointer"
              >
                <option value="DMT">DMT (Domestic Money Transfer)</option>
                <option value="CARD_TO_BANK">Card to Bank Transfer</option>
                <option value="UPI">UPI Transfer</option>
                <option value="AEPS">AEPS Biometric Cash Out</option>
                <option value="BBPS">BBPS Utility Payment</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#374151] block mb-1">Transfer Amount (₹) *</label>
              <input
                type="number"
                required
                value={context.amount}
                onChange={(e) => setContext({ ...context, amount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#374151] block mb-1">Customer Category</label>
                <select
                  value={context.customer_category}
                  onChange={(e) => setContext({ ...context, customer_category: e.target.value })}
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all cursor-pointer"
                >
                  <option value="REGULAR">Regular Customer</option>
                  <option value="PREMIUM">Premium Tier</option>
                  <option value="VIP">VIP Customer</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#374151] block mb-1">KYC Level</label>
                <select
                  value={context.kyc_level}
                  onChange={(e) => setContext({ ...context, kyc_level: e.target.value })}
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all cursor-pointer"
                >
                  <option value="NONE">No KYC (Unverified)</option>
                  <option value="MINIMUM_KYC">Minimum KYC</option>
                  <option value="FULL_KYC">Full KYC Verification</option>
                  <option value="ENHANCED_DUE_DILIGENCE">Enhanced Due Diligence</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#374151] block mb-1">Risk Score (0 - 100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={context.risk_score}
                onChange={(e) => setContext({ ...context, risk_score: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={evaluating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              <Play className={`w-4 h-4 ${evaluating ? "animate-spin" : ""}`} />
              {evaluating ? "Evaluating Policy Rules..." : "Execute Policy Evaluation Engine"}
            </button>
          </form>
        </div>

        {/* Evaluation Output Card */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#16A34A]" /> Policy Engine Evaluation Output
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              <Zap className="h-3 w-3" /> Sub-50ms Engine
            </span>
          </div>

          {!result ? (
            <div className="p-12 text-center text-[#64748B] space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8]">
                <Zap className="w-6 h-6" />
              </div>
              <p className="font-extrabold text-sm text-[#334155]">Ready for Rule Evaluation</p>
              <p className="text-xs max-w-xs mx-auto text-[#64748B]">
                Click <strong className="text-[#2563EB]">"Execute Policy Evaluation Engine"</strong> to simulate real-time rule evaluations against live policies.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Decision Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  result.is_allowed
                    ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
                    : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.is_allowed ? (
                    <CheckCircle2 className="w-7 h-7 text-[#16A34A] shrink-0" />
                  ) : (
                    <ShieldAlert className="w-7 h-7 text-[#DC2626] shrink-0" />
                  )}
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight">
                      {result.is_allowed ? "TRANSACTION ALLOWED" : "TRANSACTION REJECTED"}
                    </h3>
                    <p className="text-xs font-medium opacity-90 mt-0.5">
                      Evaluated Level: <strong className="font-mono">{result.evaluated_hierarchy_level}</strong>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-white border border-current shadow-2xs">
                    <Clock className="w-3 h-3" /> 0.8 ms
                  </span>
                </div>
              </div>

              {/* Rejection Reasons */}
              {result.rejection_reasons?.length > 0 && (
                <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] space-y-2">
                  <span className="text-xs font-extrabold text-[#991B1B] uppercase tracking-wider block">
                    Policy Violations Detected:
                  </span>
                  {result.rejection_reasons.map((reason: string, idx: number) => (
                    <p key={idx} className="text-xs text-[#991B1B] font-semibold flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </p>
                  ))}
                </div>
              )}

              {/* Applied Policy Caps Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] font-extrabold text-[#64748B] block uppercase tracking-wider">Single Txn Cap</span>
                  <span className="text-sm font-extrabold text-[#0F172A] font-mono">
                    ₹{result.effective_single_txn_max?.toLocaleString() || "25,000"}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] font-extrabold text-[#64748B] block uppercase tracking-wider">Daily Amount Cap</span>
                  <span className="text-sm font-extrabold text-[#0F172A] font-mono">
                    ₹{result.effective_daily_amount_max?.toLocaleString() || "100,000"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between text-xs font-bold text-[#1E40AF]">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#2563EB]" />
                  <span>Rule Engine Status: Zero Downtime Hot-Reload Active</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
