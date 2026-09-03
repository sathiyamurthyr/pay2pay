"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Zap,
  Search,
  Check,
  ChevronDown,
  History,
  Wallet,
  PlusCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Wifi,
  PhoneCall,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { OperatorLogo } from "./operator-logos";
import { RechargeConfirmationModal } from "./recharge-confirmation-modal";
import { RechargeReceiptModal } from "./recharge-receipt-modal";
import { RechargeHistoryDrawer } from "./recharge-history-drawer";
import {
  rechargeApi,
  RechargeOperator,
  RechargePlan,
  RechargeValidationResponse,
  RechargeExecutionResult,
  RechargeReportItem,
} from "@/services/recharge-api";

const QUICK_AMOUNTS = [19, 149, 199, 239, 299, 666, 719, 2999];

const PLAN_CATEGORIES = [
  { id: "ALL", label: "All Plans" },
  { id: "RECOMMENDED", label: "Recommended" },
  { id: "POPULAR", label: "Popular" },
  { id: "5G", label: "True 5G" },
  { id: "DATA", label: "Daily Data" },
  { id: "VALIDITY", label: "Long Validity" },
  { id: "ANNUAL", label: "Annual Plans" },
];

export function RechargeView() {
  const { wallet, updateWallet } = useRetailerStore();

  // Mode
  const [rechargeMode, setRechargeMode] = useState<"PREPAID" | "POSTPAID">("PREPAID");

  // Operators & Plans data from backend SP
  const [operators, setOperators] = useState<RechargeOperator[]>([]);
  const [plans, setPlans] = useState<RechargePlan[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Form State
  const [mobileNumber, setMobileNumber] = useState("");
  const [selectedOperator, setSelectedOperator] = useState<RechargeOperator | null>(null);
  const [selectedCircle, setSelectedCircle] = useState("All India");
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [planSearch, setPlanSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");

  // Flow Modals State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationData, setValidationData] = useState<RechargeValidationResponse | null>(null);
  const [receiptData, setReceiptData] = useState<RechargeExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Operators from Backend SP
  useEffect(() => {
    async function loadOperators() {
      try {
        setLoadingOperators(true);
        const data = await rechargeApi.getOperators();
        setOperators(data);
        if (data.length > 0 && !selectedOperator) {
          setSelectedOperator(data[0]);
        }
      } catch (err) {
        console.error("Failed to load telecom operators:", err);
      } finally {
        setLoadingOperators(false);
      }
    }
    loadOperators();
  }, []);

  // 2. Fetch Plans from Backend SP whenever operator changes
  useEffect(() => {
    if (!selectedOperator) return;

    async function loadPlans() {
      try {
        setLoadingPlans(true);
        const data = await rechargeApi.getPlans({
          operator_code: selectedOperator!.operator_code,
          circle: selectedCircle,
        });
        setPlans(data);
      } catch (err) {
        console.error("Failed to load plans:", err);
      } finally {
        setLoadingPlans(false);
      }
    }
    loadPlans();
  }, [selectedOperator, selectedCircle]);

  // Auto-detect operator from mobile number prefix series
  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(clean);
    setErrorMessage(null);

    if (clean.length >= 4 && operators.length > 0) {
      const prefix = clean.slice(0, 2);
      // Auto-suggest heuristic if user hasn't actively switched
      if (["98", "99", "90", "97", "88", "81"].includes(prefix)) {
        const airtel = operators.find((o) => o.operator_code === "AIRTEL");
        if (airtel && selectedOperator?.operator_code === "JIO") {
          // keep or suggest
        }
      } else if (["70", "79", "63", "62", "91"].includes(prefix)) {
        const jio = operators.find((o) => o.operator_code === "JIO");
        if (jio) setSelectedOperator(jio);
      }
    }
  };

  // Effective Recharge Amount
  const effectiveAmount = selectedPlan ? selectedPlan.amount : parseFloat(customAmount) || 0;

  // Filtered Plans Catalog
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesCategory =
        activeCategory === "ALL" ||
        p.plan_type === activeCategory ||
        (activeCategory === "POPULAR" && (p.is_popular || p.is_best_seller));

      const matchesSearch =
        !planSearch ||
        p.amount.toString().includes(planSearch) ||
        p.description.toLowerCase().includes(planSearch.toLowerCase()) ||
        p.validity.toLowerCase().includes(planSearch.toLowerCase()) ||
        (p.data_quota && p.data_quota.toLowerCase().includes(planSearch.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [plans, activeCategory, planSearch]);

  // Handle "Proceed to Recharge" Button
  const handleProceedClick = async () => {
    if (mobileNumber.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!selectedOperator) {
      setErrorMessage("Please select a telecom operator.");
      return;
    }
    if (effectiveAmount <= 0) {
      setErrorMessage("Please select a recharge plan or enter an amount.");
      return;
    }

    try {
      setErrorMessage(null);
      setIsProcessing(true);

      // Call Backend Validation SP
      const valRes = await rechargeApi.validateRecharge({
        mobile_number: mobileNumber,
        operator_code: selectedOperator.operator_code,
        recharge_amount: effectiveAmount,
        circle: selectedCircle,
      });

      if (!valRes.is_valid) {
        setErrorMessage(valRes.error_message || "Validation failed. Please verify mobile number and balance.");
        setIsProcessing(false);
        return;
      }

      setValidationData(valRes);
      setIsConfirmOpen(true);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to validate recharge request.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Recharge via Backend Stored Procedures
  const handleConfirmRecharge = async () => {
    if (!selectedOperator) return;

    try {
      setIsProcessing(true);
      const res = await rechargeApi.confirmRecharge({
        mobile_number: mobileNumber,
        operator_code: selectedOperator.operator_code,
        circle: selectedCircle,
        recharge_amount: effectiveAmount,
        plan_id: selectedPlan?.plan_id,
        plan_type: selectedPlan?.plan_type || "CUSTOM",
        plan_description: selectedPlan?.description || "Custom recharge",
        idempotency_key: `REC-${Date.now()}-${mobileNumber}`,
      });

      setIsConfirmOpen(false);

      if (res.success && res.status === "SUCCESS") {
        setReceiptData(res);
        setIsReceiptOpen(true);

        // Update local wallet store with new balance
        if (res.closing_balance !== undefined) {
          updateWallet({
            mainBalance: res.closing_balance,
            todayMargin: (wallet.todayMargin || 0) + (res.commission_amount || 1.0),
          });
        }
      } else {
        setErrorMessage(res.message || res.error_message || "Recharge failed. Any debited amount has been refunded.");
      }
    } catch (err: any) {
      setIsConfirmOpen(false);
      setErrorMessage(err?.response?.data?.detail || "Network communication error. Check your transactions statement.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectFromHistory = (item: RechargeReportItem) => {
    setReceiptData({
      success: item.status === "SUCCESS",
      status: item.status as any,
      transaction_id: item.transaction_id,
      reference_id: item.reference_id,
      operator_ref: item.operator_ref,
      recharge_amount: Number(item.recharge_amount),
      commission_amount: Number(item.commission_amount),
      closing_balance: Number(item.closing_balance),
    });
    setMobileNumber(item.mobile_number);
    setIsReceiptOpen(true);
  };

  return (
    <div className="min-h-screen pb-32 text-slate-100 bg-[#080C14]">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. Header & Wallet Bar */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#080C14]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white">
                  Mobile Recharge
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Instant 5G
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct operator gateway with instant commission settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Wallet Balance Pill */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
              <Wallet className="w-4 h-4 text-amber-400" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                  Wallet Balance
                </div>
                <div className="text-sm font-black text-white font-mono">
                  ₹{Number(wallet.mainBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <Link
                href="/retailer/wallet-topup"
                className="ml-1 p-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 transition-colors"
                title="Top-up Wallet"
              >
                <PlusCircle className="w-4 h-4" />
              </Link>
            </div>

            {/* History Drawer Trigger */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-300 transition-all active:scale-[0.98]"
            >
              <History className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Statements</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Error Notification Alert */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-red-300 text-sm"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-lg hover:bg-red-500/20 text-red-400"
            >
              ×
            </button>
          </motion.div>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 2. Mode Selector: Prepaid / Postpaid */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="inline-flex p-1 rounded-2xl bg-white/[0.04] border border-white/10">
            <button
              onClick={() => setRechargeMode("PREPAID")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                rechargeMode === "PREPAID"
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Prepaid Mobile
            </button>
            <button
              onClick={() => setRechargeMode("POSTPAID")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                rechargeMode === "POSTPAID"
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Postpaid Bill
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-amber-400 font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Earn flat ₹1.00 instant commission on every recharge</span>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 3. Top Inputs: Mobile Number & Telecom Operators */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Mobile & Circle (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Mobile Number Card */}
            <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400 border-r border-white/10 pr-3 font-mono font-bold text-sm">
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  placeholder="Enter 10-digit number"
                  className="w-full pl-20 pr-12 py-3.5 bg-slate-950/60 border border-white/10 rounded-2xl text-white font-mono text-lg font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
                {mobileNumber.length === 10 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Quick test numbers */}
              <div className="pt-1 flex items-center gap-2 overflow-x-auto text-[11px] text-slate-400">
                <span className="text-slate-500 shrink-0">Recent:</span>
                {["9840192837", "9876543210", "7019283456"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleMobileChange(num)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Circle Selector Card */}
            <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Telecom Circle / State
              </label>
              <div className="relative">
                <select
                  value={selectedCircle}
                  onChange={(e) => setSelectedCircle(e.target.value)}
                  className="w-full py-3.5 px-4 bg-slate-950/60 border border-white/10 rounded-2xl text-white text-sm font-semibold focus:outline-none focus:border-amber-400 appearance-none cursor-pointer"
                >
                  <option value="All India">All India (Default)</option>
                  <option value="Andhra Pradesh & Telangana">Andhra Pradesh & Telangana</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Maharashtra & Goa">Maharashtra & Goa</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi NCR">Delhi NCR</option>
                  <option value="UP East">UP East</option>
                  <option value="UP West">UP West</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Punjab">Punjab</option>
                  <option value="West Bengal">West Bengal</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Right Column: Operators Selection (7 cols) */}
          <div className="lg:col-span-7 p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Telecom Operator
              </label>
              {selectedOperator && (
                <span className="text-xs text-amber-400 font-semibold">
                  Selected: {selectedOperator.operator_name}
                </span>
              )}
            </div>

            {/* Operator Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {operators.map((op) => {
                const isSelected = selectedOperator?.operator_code === op.operator_code;
                return (
                  <button
                    key={op.operator_code}
                    type="button"
                    onClick={() => {
                      setSelectedOperator(op);
                      setSelectedPlan(null);
                    }}
                    className={`relative p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                      isSelected
                        ? "bg-amber-400/10 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)] scale-[1.02]"
                        : "bg-slate-900/50 border-white/10 hover:border-white/20 hover:bg-slate-900/80"
                    }`}
                  >
                    <OperatorLogo code={op.operator_code} className="w-12 h-12 mb-2" />
                    <span className="text-xs font-bold text-white tracking-wide line-clamp-1">
                      {op.operator_name.split(" ")[0]}
                    </span>
                    <span className="text-[10px] text-slate-400">Prepaid</span>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount / Quick Chips */}
            <div className="pt-2 border-t border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Quick Amount or Custom Entry
                </span>
                <span className="text-[11px] text-slate-400">Or pick from plans below</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={selectedPlan ? selectedPlan.amount : customAmount}
                    onChange={(e) => {
                      setSelectedPlan(null);
                      setCustomAmount(e.target.value);
                    }}
                    placeholder="Enter custom amount"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                {selectedPlan && (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline px-2"
                  >
                    Clear Selected Plan
                  </button>
                )}
              </div>

              {/* Quick Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedPlan(null);
                      setCustomAmount(amt.toString());
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                      !selectedPlan && parseFloat(customAmount) === amt
                        ? "bg-amber-400 text-slate-950 shadow-md"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 4. Plans Catalog Section */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="space-y-4 pt-2">
          {/* Section Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Browse {selectedOperator?.operator_name || "Telecom"} Plans</span>
                <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {filteredPlans.length} Plans
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official plans updated in real-time from operator network
              </p>
            </div>

            {/* Plan Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                placeholder="Search plan, e.g. 299, 1.5GB, 5G"
                className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {PLAN_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md"
                    : "bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Plans Grid */}
          {loadingPlans ? (
            <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span>Fetching dynamic plans from {selectedOperator?.operator_name}...</span>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm bg-white/[0.01] rounded-3xl border border-white/5">
              No plans found matching your search. Try changing category or search terms.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => {
                const isSelected = selectedPlan?.plan_id === plan.plan_id;

                return (
                  <motion.div
                    key={plan.plan_id}
                    layout
                    onClick={() => {
                      setSelectedPlan(plan);
                      setCustomAmount("");
                    }}
                    className={`relative p-5 rounded-3xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-gradient-to-br from-amber-500/15 to-yellow-500/5 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                        : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    {/* Top row: Amount & Badges */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white font-mono">
                            ₹{plan.amount}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {plan.is_best_seller && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
                              Best Seller
                            </span>
                          )}
                          {plan.is_popular && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Popular
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Benefits Matrix */}
                      <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-2xl bg-slate-950/40 border border-white/5 text-center">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Validity</div>
                          <div className="text-xs font-extrabold text-white font-mono mt-0.5">{plan.validity}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Data</div>
                          <div className="text-xs font-extrabold text-amber-400 font-mono mt-0.5">{plan.data_quota || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Voice</div>
                          <div className="text-xs font-extrabold text-emerald-400 mt-0.5 truncate">{plan.voice_benefit || "Unlimited"}</div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                        {plan.description}
                      </p>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Instant Crediting</span>
                      </span>

                      <button
                        type="button"
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-amber-400 text-slate-950 shadow-md"
                            : "bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {isSelected ? "Selected ✓" : "Choose Plan"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. Sticky Floating Bottom Bar */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080C14]/95 backdrop-blur-2xl border-t border-amber-500/20 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {selectedOperator && (
              <OperatorLogo code={selectedOperator.operator_code} className="w-10 h-10 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-white font-mono">
                  {mobileNumber ? `+91 ${mobileNumber}` : "Enter Mobile Number"}
                </span>
                {selectedOperator && (
                  <span className="hidden sm:inline text-xs text-slate-400">
                    ({selectedOperator.operator_name})
                  </span>
                )}
              </div>
              <div className="text-xs text-amber-400 font-bold mt-0.5">
                {effectiveAmount > 0
                  ? `Recharge Amount: ₹${effectiveAmount.toFixed(2)}`
                  : "Select a plan to continue"}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={effectiveAmount <= 0 || mobileNumber.length !== 10 || isProcessing}
            onClick={handleProceedClick}
            className={`py-3.5 px-6 sm:px-8 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
              effectiveAmount <= 0 || mobileNumber.length !== 10
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                : "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-amber-500/25 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.98]"
            }`}
          >
            <span>Proceed to Recharge</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 6. Modals & Drawers */}
      {/* ──────────────────────────────────────────────────────────── */}
      <RechargeConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmRecharge}
        isProcessing={isProcessing}
        mobileNumber={mobileNumber}
        operatorCode={selectedOperator?.operator_code || "JIO"}
        operatorName={selectedOperator?.operator_name || "Telecom"}
        circle={selectedCircle}
        amount={effectiveAmount}
        planDescription={selectedPlan?.description}
        validationData={validationData}
      />

      <RechargeReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        onNewRecharge={() => {
          setSelectedPlan(null);
          setCustomAmount("");
          setMobileNumber("");
        }}
        receiptData={receiptData}
        mobileNumber={mobileNumber}
        operatorCode={selectedOperator?.operator_code || "JIO"}
        operatorName={selectedOperator?.operator_name || "Telecom"}
        circle={selectedCircle}
        amount={effectiveAmount || receiptData?.recharge_amount || 0}
      />

      <RechargeHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectReceipt={handleSelectFromHistory}
      />
    </div>
  );
}
