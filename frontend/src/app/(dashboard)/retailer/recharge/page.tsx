"use client";

import React, { useState } from "react";
import { Smartphone, Tv, CheckCircle2, AlertCircle, RefreshCw, Zap, ShieldCheck } from "lucide-react";
import { retailerApi } from "@/services/retailer-api";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export default function RechargePage() {
  const branding = useCompanyBranding();
  const { wallet, updateWallet } = useRetailerStore();
  const [tab, setTab] = useState<"MOBILE" | "DTH">("MOBILE");
  const [operator, setOperator] = useState("AIRTEL");
  const [number, setNumber] = useState("9840192837");
  const [amount, setAmount] = useState("299");
  const [loading, setLoading] = useState(false);
  const [txnSuccess, setTxnSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const operators = [
    { value: "AIRTEL", label: "Airtel Prepaid / Postpaid" },
    { value: "JIO", label: "Reliance Jio 4G/5G" },
    { value: "VI", label: "Vodafone Idea (Vi)" },
    { value: "BSNL", label: "BSNL Mobile" },
    { value: "TATA_PLAY", label: "Tata Play DTH" },
    { value: "AIRTEL_DTH", label: "Airtel Digital TV" },
  ];

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setTxnSuccess(null);
    setLoading(true);

    const numericAmt = parseFloat(amount) || 0;
    try {
      const res = await retailerApi.processRecharge({
        operator,
        mobileOrVcNumber: number,
        amount: numericAmt,
        rechargeType: tab,
      });

      setLoading(false);
      if (res && (res.status === "SUCCESS" || res.success)) {
        setTxnSuccess(res);
        const earnedCommission = res.commission || numericAmt * 0.025;
        updateWallet({
          mainBalance: (wallet.mainBalance || 0) - numericAmt + earnedCommission,
          todayMargin: (wallet.todayMargin || 0) + earnedCommission,
        });
      } else {
        setErrorMsg(res?.message || "Recharge transaction failed. Please verify details.");
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err?.response?.data?.detail || err?.message || "Failed to process recharge.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 ent-animate-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
          style={{
            backgroundColor: branding.primary_colour ? `${branding.primary_colour}15` : "#EFF6FF",
            color: branding.primary_colour || "#2563EB",
          }}
        >
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h1 className="ent-page-title">{branding.display_name} Mobile & DTH Recharge</h1>
          <p className="ent-caption mt-0.5">
            Instant Real-Time Prepaid Top-Up & Commission Settlement • {branding.company_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
        {/* Main Form (4 cols on tablet, 4 on desktop) */}
        <div className="md:col-span-4 ent-card p-6 space-y-5">
          {/* Tabs */}
          <div className="ent-tab-container">
            <button
              type="button"
              onClick={() => {
                setTab("MOBILE");
                setOperator("AIRTEL");
                setTxnSuccess(null);
                setErrorMsg(null);
              }}
              className={`ent-tab-btn ${tab === "MOBILE" ? "ent-tab-active" : ""}`}
            >
              <Smartphone className="w-4 h-4" />
              Mobile Recharge
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("DTH");
                setOperator("TATA_PLAY");
                setTxnSuccess(null);
                setErrorMsg(null);
              }}
              className={`ent-tab-btn ${tab === "DTH" ? "ent-tab-active" : ""}`}
            >
              <Tv className="w-4 h-4" />
              DTH Connection
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 ent-animate-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {txnSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1.5 ent-animate-in">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Recharge Successful!
              </div>
              <p>Operator Ref: <strong>{txnSuccess.operatorRef || txnSuccess.operatorTxnId || "OP-SUCCESS"}</strong></p>
              <p>Commission Credited: <strong className="text-emerald-700">+₹{(txnSuccess.commission || 0).toFixed(2)}</strong></p>
            </div>
          )}

          <form onSubmit={handleRecharge} className="space-y-4">
            <div>
              <label className="ent-label" htmlFor="operator-select">
                Select Telecom / DTH Operator
              </label>
              <select
                id="operator-select"
                className="ent-input text-sm"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              >
                {operators
                  .filter((op) => (tab === "MOBILE" ? !op.value.includes("DTH") && op.value !== "TATA_PLAY" : op.value.includes("DTH") || op.value === "TATA_PLAY"))
                  .map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="ent-label" htmlFor="recharge-number">
                {tab === "MOBILE" ? "10-Digit Mobile Number" : "DTH VC / Subscriber ID"}
              </label>
              <input
                id="recharge-number"
                className="ent-input text-sm"
                type="text"
                placeholder={tab === "MOBILE" ? "9840192837" : "1029384756"}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="ent-label" htmlFor="recharge-amount">
                Recharge Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input
                  id="recharge-amount"
                  className="ent-input pl-8 text-base font-semibold"
                  type="number"
                  min="10"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="299"
                  required
                />
              </div>
            </div>

            {/* Quick Amount Pills */}
            <div className="flex gap-2 flex-wrap">
              {["149", "239", "299", "666", "719", "2999"].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  ₹{val}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !number || !amount}
              className="ent-btn ent-btn-primary w-full py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
              style={{ backgroundColor: branding.primary_colour || undefined }}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing Recharge...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Process Recharge ₹{parseFloat(amount || "0").toFixed(2)}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Side Summary & Commission Info (3 cols) */}
        <div className="md:col-span-3 space-y-4">
          <div className="ent-card p-5 space-y-4">
            <h3 className="ent-card-title text-sm">Retailer Margin & Benefits</h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span>Commission Rate</span>
                <span className="font-bold text-emerald-600">Up to 2.50% Instant</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span>Settlement Speed</span>
                <span className="font-semibold text-slate-800">Real-Time Wallet Credit</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span>Estimated Margin</span>
                <span className="font-bold text-slate-900">
                  +₹{((parseFloat(amount || "0") || 0) * 0.025).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span>Platform Network</span>
                <span className="font-semibold text-slate-800">{branding.display_name} Switch</span>
              </div>
            </div>
          </div>

          <div className="ent-card-alt p-4 space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Operator Auto-Failover
            </div>
            <p>Direct integration with telecom switch. In case of timeout, refunds are credited back to your wallet instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
