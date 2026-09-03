"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Loader2,
  Lock,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { OperatorLogo } from "./operator-logos";
import { RechargeValidationResponse } from "@/services/recharge-api";

interface RechargeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
  mobileNumber: string;
  operatorCode: string;
  operatorName: string;
  circle: string;
  amount: number;
  planDescription?: string;
  validationData: RechargeValidationResponse | null;
}

export function RechargeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  mobileNumber,
  operatorCode,
  operatorName,
  circle,
  amount,
  planDescription,
  validationData,
}: RechargeConfirmationModalProps) {
  const [processingStep, setProcessingStep] = useState<string>("Validating with Telecom Network...");

  if (!isOpen) return null;

  const openingBal = validationData?.opening_balance ?? 0;
  const rechargeAmt = amount;
  const commission = validationData?.commission_amount ?? 1.0;
  const tax = validationData?.tax_amount ?? 0.0;
  const netDebit = rechargeAmt + tax;
  const closingBal = validationData?.closing_balance ?? (openingBal - rechargeAmt + commission - tax);

  const handleConfirmClick = async () => {
    setProcessingStep("Reserving wallet funds (DR Recharge)...");
    setTimeout(() => {
      setProcessingStep("Crediting retailer commission (+₹" + commission.toFixed(2) + ")...");
    }, 700);
    setTimeout(() => {
      setProcessingStep("Connecting to " + operatorName + " Gateway...");
    }, 1400);

    await onConfirm();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-[#0D121F] border border-amber-500/20 rounded-t-3xl sm:rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden text-slate-100 p-6 sm:p-7"
        >
          {/* Top Gold Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Confirm Mobile Recharge
                </h3>
                <p className="text-xs text-slate-400">
                  Verify transaction details & wallet accounting
                </p>
              </div>
            </div>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Beneficiary Telecom Card */}
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <OperatorLogo code={operatorCode} className="w-12 h-12 text-base" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-lg tracking-wider font-mono">
                    +91 {mobileNumber}
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="text-amber-400 font-semibold">{operatorName}</span>
                  <span>•</span>
                  <span>{circle}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-amber-400">
                ₹{amount.toFixed(2)}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 inline-block mt-1">
                Instant 4G/5G
              </div>
            </div>
          </div>

          {planDescription && (
            <p className="mt-2 text-xs text-slate-400 line-clamp-2 px-1">
              {planDescription}
            </p>
          )}

          {/* Accounting Breakdown Ledger */}
          <div className="mt-5 rounded-2xl bg-slate-900/60 border border-white/10 p-4 space-y-2.5 text-sm">
            <div className="text-xs font-bold text-amber-400/90 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Financial Ledger Sequence</span>
              <span className="text-[11px] font-normal text-slate-400">Double-Entry SP</span>
            </div>

            {/* Opening Balance */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                Opening Wallet Balance
              </span>
              <span className="font-mono text-slate-200">
                ₹{openingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Step 1 DR */}
            <div className="flex items-center justify-between text-red-400 font-medium">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Step 1: Recharge Debit (DR)
              </span>
              <span className="font-mono font-semibold">
                -₹{rechargeAmt.toFixed(2)}
              </span>
            </div>

            {/* Step 2 CR Commission */}
            <div className="flex items-center justify-between text-emerald-400 font-medium">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Step 2: Retailer Margin Credit (CR)
              </span>
              <span className="font-mono font-semibold">
                +₹{commission.toFixed(2)}
              </span>
            </div>

            {/* Step 3 DR Tax */}
            {tax > 0 && (
              <div className="flex items-center justify-between text-amber-400 font-medium">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Step 3: Applicable GST/Tax (DR)
                </span>
                <span className="font-mono font-semibold">
                  -₹{tax.toFixed(2)}
                </span>
              </div>
            )}

            <div className="border-t border-white/10 pt-2.5 mt-2 flex items-center justify-between text-base">
              <span className="font-semibold text-white">Estimated Closing Balance</span>
              <span className="font-mono font-extrabold text-amber-400">
                ₹{closingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Insufficient balance guard */}
          {openingBal < netDebit && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Insufficient balance. Required: ₹{netDebit.toFixed(2)}, Available: ₹{openingBal.toFixed(2)}. Please top up your wallet.
              </span>
            </div>
          )}

          {/* Actions & Processing State */}
          <div className="mt-6 pt-2">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="relative flex items-center justify-center w-12 h-12 mb-3">
                  <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 animate-ping" />
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
                <div className="font-bold text-white text-sm tracking-wide">
                  Processing Mobile Recharge
                </div>
                <div className="text-xs text-amber-300 mt-1 font-mono">
                  {processingStep}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={openingBal < netDebit || isProcessing}
                  onClick={handleConfirmClick}
                  className={`flex-[2] py-3.5 px-6 rounded-2xl font-bold text-sm text-slate-950 flex items-center justify-center gap-2 shadow-lg transition-all ${
                    openingBal < netDebit
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.98] shadow-amber-500/20"
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Confirm & Pay ₹{amount.toFixed(2)}</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
