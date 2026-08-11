"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sliders,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Zap,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  Send,
  Building2,
  Calendar,
  AlertTriangle,
  Play
} from "lucide-react";
import apiClient from "@/lib/api";

export default function GlobalMonthlyLimitsPage() {
  const [config, setConfig] = useState<any>({
    monthly_limit_amount: 50000.0,
    affected_services: ["DMT", "PAYOUT"],
    auto_reset_schedule: "EVERY_MONTH_1ST_MIDNIGHT",
    is_enabled: true,
    last_reset_timestamp: "",
    next_reset_timestamp: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Test Simulator State
  const [testAmount, setTestAmount] = useState<number>(55000);
  const [testService, setTestService] = useState<string>("DMT");
  const [testResult, setTestResult] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/policies/global-monthly-limit");
      setConfig(res.data.data);
    } catch (err) {
      console.error("Failed to fetch global limit config", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const res = await apiClient.post("/policies/global-monthly-limit", config);
      setConfig(res.data.data);
      setSuccessMsg("Overall Customer Monthly Limit & Service rules saved successfully!");
    } catch (err: any) {
      setErrorMsg("Failed to save limit configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleManualReset = async () => {
    if (!confirm("Are you sure you want to execute an instant reset of customer monthly transfer counters back to ₹0.00?")) {
      return;
    }

    setResetting(true);
    setErrorMsg("");

    try {
      const res = await apiClient.post("/policies/global-monthly-limit/reset");
      setSuccessMsg(res.data.message);
      fetchConfig();
    } catch (err) {
      setErrorMsg("Failed to execute monthly reset");
    } finally {
      setResetting(false);
    }
  };

  const handleTestEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvaluating(true);
    setTestResult(null);

    try {
      const res = await apiClient.post("/policies/evaluate", {
        service_code: testService,
        amount: testAmount,
        kyc_level: "FULL_KYC",
        risk_score: 10
      });
      setTestResult(res.data.data);
    } catch (err) {
      console.error("Test evaluation failed", err);
    } finally {
      setEvaluating(false);
    }
  };

  const toggleService = (svc: string) => {
    const services = [...config.affected_services];
    const idx = services.indexOf(svc);
    if (idx > -1) {
      services.splice(idx, 1);
    } else {
      services.push(svc);
    }
    setConfig({ ...config, affected_services: services });
  };

  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/policies"
          className="p-2.5 bg-white hover:bg-[#F8FAFC] text-[#374151] rounded-lg border border-[#D1D5DB] shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
            <Sliders className="w-7 h-7 text-[#2563EB]" /> Overall Customer Monthly Limit & Midnight Reset Rules
          </h1>
          <p className="text-sm font-medium text-[#64748B] mt-0.5">
            Enforce platform-wide customer transfer caps across DMT & Payouts with automatic midnight reset on the 1st of every month
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs font-bold text-[#166534]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-[#166534] hover:text-[#14532D]">
            ×
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-between text-xs font-bold text-[#991B1B]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#DC2626]" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-[#991B1B]">
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Limit Configuration Card */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#2563EB]" /> Global Customer Limit Rules
            </h2>
            <button
              type="button"
              onClick={() => setConfig({ ...config, is_enabled: !config.is_enabled })}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                config.is_enabled
                  ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                  : "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
              }`}
            >
              {config.is_enabled ? (
                <>
                  <ToggleRight className="w-4 h-4 text-[#16A34A]" /> LIMIT ACTIVE
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-[#DC2626]" /> LIMIT DISABLED
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-[#374151] block mb-1">
                Overall Customer Monthly Transfer Cap (₹) *
              </label>
              <input
                type="number"
                required
                value={config.monthly_limit_amount}
                onChange={(e) => setConfig({ ...config, monthly_limit_amount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-[#D1D5DB] bg-white p-3 font-mono text-base text-[#0F172A] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-extrabold"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                If a customer reaches this overall limit in a month, further transactions will be blocked automatically.
              </p>
            </div>

            <div>
              <label className="font-semibold text-[#374151] block mb-1.5">
                Restricted Services when Cap is Exceeded
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleService("DMT")}
                  className={`p-3 rounded-xl border flex items-center justify-between font-bold transition-all cursor-pointer ${
                    config.affected_services?.includes("DMT")
                      ? "bg-[#EFF6FF] border-[#2563EB] text-[#1E40AF]"
                      : "bg-white border-[#E5E7EB] text-[#64748B]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#2563EB]" /> DMT Transfer
                  </span>
                  <span className="text-[11px] font-mono">{config.affected_services?.includes("DMT") ? "BLOCKED" : "ALLOWED"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleService("PAYOUT")}
                  className={`p-3 rounded-xl border flex items-center justify-between font-bold transition-all cursor-pointer ${
                    config.affected_services?.includes("PAYOUT")
                      ? "bg-[#EFF6FF] border-[#2563EB] text-[#1E40AF]"
                      : "bg-white border-[#E5E7EB] text-[#64748B]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#2563EB]" /> Bank Payouts
                  </span>
                  <span className="text-[11px] font-mono">{config.affected_services?.includes("PAYOUT") ? "BLOCKED" : "ALLOWED"}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving Configuration..." : "Save Overall Limit Configuration"}
              </button>
            </div>
          </form>
        </div>

        {/* Midnight Auto-Reset Schedule Card */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#E5E7EB] pb-3">
            <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#16A34A]" /> Monthly Auto-Reset Schedule
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5 font-medium">Automatic reset resets all customer monthly accumulated balances back to ₹0.00</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#374151]">Auto Reset Frequency:</span>
                <span className="font-extrabold font-mono text-[#166534] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
                  1st of Every Month @ 00:00:00 Midnight
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#374151]">Next Scheduled Reset:</span>
                <span className="font-extrabold font-mono text-[#2563EB]">
                  {config.next_reset_timestamp ? new Date(config.next_reset_timestamp).toLocaleString() : "2026-09-01 00:00:00 UTC"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#374151]">Last Execution Timestamp:</span>
                <span className="font-mono text-[#64748B]">
                  {config.last_reset_timestamp ? new Date(config.last_reset_timestamp).toLocaleString() : "2026-08-01 00:00:00 UTC"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] space-y-2">
              <span className="font-extrabold text-[#92400E] block uppercase text-[11px] tracking-wider">
                Emergency Manual Reset Controls
              </span>
              <p className="text-[#92400E] text-[11px] font-medium leading-relaxed">
                Clicking below will force an instant reset of all customer monthly transfer tallies back to ₹0.00 immediately without waiting for 1st midnight.
              </p>
              <button
                type="button"
                onClick={handleManualReset}
                disabled={resetting}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white font-extrabold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
                {resetting ? "Executing Reset..." : "Execute Instant Manual Monthly Counter Reset"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Rule Evaluator Test Bench */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xs space-y-4">
        <div className="border-b border-[#E5E7EB] pb-3">
          <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#2563EB]" /> Test Customer Limit Rule Evaluator
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5 font-medium">Test whether a transfer amount will be ALLOWED or BLOCKED based on current limit settings</p>
        </div>

        <form onSubmit={handleTestEvaluation} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs items-end">
          <div>
            <label className="font-semibold text-[#374151] block mb-1">Target Service</label>
            <select
              value={testService}
              onChange={(e) => setTestService(e.target.value)}
              className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] font-bold"
            >
              <option value="DMT">DMT Money Transfer</option>
              <option value="PAYOUT">Bank Payout</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-[#374151] block mb-1">Test Transfer Amount (₹)</label>
            <input
              type="number"
              required
              value={testAmount}
              onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] font-bold"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={evaluating}
              className="w-full py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer"
            >
              {evaluating ? "Testing..." : "Test Limit Evaluation"}
            </button>
          </div>
        </form>

        {testResult && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              testResult.is_allowed
                ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
                : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
            }`}
          >
            <div className="flex items-center gap-3">
              {testResult.is_allowed ? (
                <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-[#DC2626]" />
              )}
              <div>
                <h4 className="font-extrabold text-sm">
                  {testResult.is_allowed ? "TRANSACTION ALLOWED" : "TRANSACTION REJECTED & BLOCKED"}
                </h4>
                <p className="text-xs font-medium opacity-90 mt-0.5">
                  Applied Rule: <span className="font-mono">{testResult.evaluated_hierarchy_level}</span>
                </p>
                {testResult.rejection_reasons?.length > 0 && (
                  <p className="text-xs font-bold mt-1 text-[#DC2626]">
                    Reason: {testResult.rejection_reasons[0]}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right font-mono font-extrabold text-xs">
              Effective Limit: ₹{testResult.effective_monthly_amount_max?.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
