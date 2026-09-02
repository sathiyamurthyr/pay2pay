"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Printer,
  Share2,
  X,
  Smartphone,
  Check,
  Building2,
  Calendar,
  Hash,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { OperatorLogo } from "./operator-logos";
import { RechargeExecutionResult } from "@/services/recharge-api";

interface RechargeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewRecharge: () => void;
  receiptData: RechargeExecutionResult | null;
  mobileNumber: string;
  operatorCode: string;
  operatorName: string;
  circle: string;
  amount: number;
}

export function RechargeReceiptModal({
  isOpen,
  onClose,
  onNewRecharge,
  receiptData,
  mobileNumber,
  operatorCode,
  operatorName,
  circle,
  amount,
}: RechargeReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receiptData) return null;

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const txnId = receiptData.transaction_id || "REC" + Date.now();
  const refId = receiptData.reference_id || "P2P-REC-" + Date.now();
  const opRef = receiptData.operator_ref || "OP" + Math.floor(10000000 + Math.random() * 90000000);
  const commission = receiptData.commission_amount ?? 1.0;

  // Native Window Print with Receipt Formatting
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp formatted share text
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `*⚡ PAY2PAY MOBILE RECHARGE RECEIPT*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*Status:* SUCCESS ✅\n` +
      `*Mobile No:* +91 ${mobileNumber}\n` +
      `*Operator:* ${operatorName} (${circle})\n` +
      `*Amount:* ₹${amount.toFixed(2)}\n` +
      `*Operator Ref:* ${opRef}\n` +
      `*Pay2Pay Txn ID:* ${txnId}\n` +
      `*Date & Time:* ${formattedDate} ${formattedTime}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*Super Rex Products Private Limited*\n` +
      `Thank you for transacting with Pay2Pay!`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[#0D121F] border border-amber-500/30 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.2)] overflow-hidden text-slate-100 p-6 sm:p-7"
      >
        {/* Printable Container */}
        <div ref={receiptRef} className="print-area">
          {/* Header Brand */}
          <div className="text-center pb-4 border-b border-white/10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white tracking-wide">
              Recharge Successful!
            </h2>
            <p className="text-xs text-amber-400 font-semibold mt-0.5 tracking-wider uppercase">
              Super Rex Products Private Limited
            </p>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5">
              <span>Pay2Pay Enterprise Fintech Platform</span>
            </div>
          </div>

          {/* Amount Badge */}
          <div className="my-5 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-slate-900 border border-amber-500/20 text-center">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Recharge Amount Paid
            </div>
            <div className="text-3xl font-black text-amber-400 mt-1">
              ₹{amount.toFixed(2)}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Retailer Margin Earned: +₹{commission.toFixed(2)}</span>
            </div>
          </div>

          {/* Transaction Metadata Card */}
          <div className="space-y-2.5 rounded-2xl bg-slate-900/80 border border-white/10 p-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-slate-400">Mobile Number</span>
              <span className="font-extrabold text-white text-sm font-mono tracking-wider">
                +91 {mobileNumber}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Telecom Operator</span>
              <span className="font-semibold text-slate-200">
                {operatorName} ({circle})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Operator Reference</span>
              <span className="font-mono font-bold text-amber-300">
                {opRef}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Transaction ID</span>
              <span className="font-mono text-slate-300">
                {txnId}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Date & Time</span>
              <span className="font-mono text-slate-300">
                {formattedDate} {formattedTime}
              </span>
            </div>

            {receiptData.closing_balance !== undefined && (
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-slate-400">Updated Wallet Balance</span>
                <span className="font-mono font-bold text-amber-400">
                  ₹{receiptData.closing_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action CTAs (Hidden during printing) */}
        <div className="mt-6 space-y-3 print:hidden">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="py-3 px-4 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Share</span>
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onNewRecharge();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-yellow-400 transition-all active:scale-[0.98]"
          >
            <span>Recharge Another Number</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
