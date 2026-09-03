"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  History,
  Search,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Smartphone,
  Calendar,
  Filter,
} from "lucide-react";
import { OperatorLogo } from "./operator-logos";
import { rechargeApi, RechargeReportItem } from "@/services/recharge-api";

interface RechargeHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReceipt: (item: RechargeReportItem) => void;
}

export function RechargeHistoryDrawer({
  isOpen,
  onClose,
  onSelectReceipt,
}: RechargeHistoryDrawerProps) {
  const [items, setItems] = useState<RechargeReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedTxn, setSelectedTxn] = useState<RechargeReportItem | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const copyTxnId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await rechargeApi.getRetailerReport({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        mobile_number: searchQuery.trim() || undefined,
        page_size: 50,
      });
      setItems(res.transactions || []);
    } catch (e) {
      console.error("Failed to load recharge history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, statusFilter]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-lg h-full bg-[#090D17] border-l border-white/10 flex flex-col text-slate-100 shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedTxn ? "Transaction Details" : "Recharge Statement"}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedTxn ? "Audit ledger & vendor timeline" : "Previous transactions & receipts"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (selectedTxn) {
                  setSelectedTxn(null);
                } else {
                  onClose();
                }
              }}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* If a transaction is selected, show the rich detail drawer */}
          {selectedTxn ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <button
                onClick={() => setSelectedTxn(null)}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                ← Back to All Transactions
              </button>

              {/* Header card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <OperatorLogo code={selectedTxn.operator_code} className="w-11 h-11 text-sm" />
                  <div>
                    <div className="font-mono font-bold text-white text-base">
                      +91 {selectedTxn.mobile_number}
                    </div>
                    <div className="text-xs text-slate-400">
                      {selectedTxn.operator_name} • {selectedTxn.circle}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-amber-400 font-mono">
                    ₹{Number(selectedTxn.recharge_amount).toFixed(2)}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                      selectedTxn.status === "SUCCESS"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : selectedTxn.status === "REVERSED"
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {selectedTxn.status}
                  </span>
                </div>
              </div>

              {/* Identifiers & Copy */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Transaction ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white font-bold">{selectedTxn.transaction_id}</span>
                    <button
                      onClick={() => copyTxnId(selectedTxn.transaction_id)}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-amber-300"
                    >
                      {copiedId ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Reference ID:</span>
                  <span className="font-mono text-slate-300">{selectedTxn.reference_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Operator Ref:</span>
                  <span className="font-mono font-bold text-amber-400">{selectedTxn.operator_ref || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Plan Type:</span>
                  <span className="text-slate-200 font-semibold">{selectedTxn.plan_type}</span>
                </div>
              </div>

              {/* Wallet Accounting Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2 text-xs">
                <div className="font-bold text-amber-400 uppercase text-[11px] mb-1">
                  Double-Entry Wallet Accounting
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Opening Balance:</span>
                  <span className="font-mono">₹{Number(selectedTxn.opening_balance).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-red-400">
                  <span>DR Recharge Amount:</span>
                  <span className="font-mono font-semibold">-₹{Number(selectedTxn.recharge_amount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400">
                  <span>CR Retailer Commission:</span>
                  <span className="font-mono font-semibold">+₹{Number(selectedTxn.commission_amount).toFixed(2)}</span>
                </div>
                {Number(selectedTxn.tax_amount) > 0 && (
                  <div className="flex items-center justify-between text-amber-400">
                    <span>DR Applicable Tax:</span>
                    <span className="font-mono font-semibold">-₹{Number(selectedTxn.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-white font-bold text-sm">
                  <span>Closing Balance:</span>
                  <span className="font-mono text-amber-400">₹{Number(selectedTxn.closing_balance).toFixed(2)}</span>
                </div>
              </div>

              {/* Vendor Section */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2 text-xs">
                <div className="font-bold text-slate-300 uppercase text-[11px] mb-1">
                  Telecom Vendor Routing
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Vendor Gateway:</span>
                  <span className="font-semibold text-white">{selectedTxn.vendor_name || "UTKALDIGITAL"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Gateway Status:</span>
                  <span className="font-semibold text-emerald-400">{selectedTxn.status}</span>
                </div>
                {selectedTxn.failure_reason && (
                  <div className="pt-1 text-rose-400 text-xs">
                    Reason: {selectedTxn.failure_reason}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3 text-xs">
                <div className="font-bold text-slate-300 uppercase text-[11px] mb-2">
                  Transaction Audit Timeline
                </div>
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                  <div className="flex items-center gap-3 relative">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
                    <div>
                      <div className="text-white font-semibold">Initiated</div>
                      <div className="text-[10px] text-slate-400">Unique Idempotency key verified</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
                    <div>
                      <div className="text-white font-semibold">Wallet Debit (DR)</div>
                      <div className="text-[10px] text-slate-400">Row-locked funds reservation</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
                    <div>
                      <div className="text-white font-semibold">Commission Credit (CR)</div>
                      <div className="text-[10px] text-slate-400">+₹{Number(selectedTxn.commission_amount).toFixed(2)} instant margin</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
                    <div>
                      <div className="text-white font-semibold">Vendor Gateway Processing</div>
                      <div className="text-[10px] text-slate-400">{selectedTxn.operator_name} network fulfillment</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative">
                    <div className={`w-4 h-4 rounded-full shrink-0 ${
                      selectedTxn.status === "SUCCESS" ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-rose-500 ring-4 ring-rose-500/20"
                    }`} />
                    <div>
                      <div className="text-white font-semibold">
                        {selectedTxn.status === "SUCCESS" ? "Fulfillment Completed" : "Order Declined & Reversed"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(selectedTxn.created_at).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    onSelectReceipt(selectedTxn);
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>View & Print Receipt Slip</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Filters & Search */}
              <div className="p-4 border-b border-white/5 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadHistory()}
                    placeholder="Search mobile number..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {["ALL", "SUCCESS", "FAILED", "REVERSED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        statusFilter === st
                          ? "bg-amber-400 text-slate-950"
                          : "bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Loading recharge transactions...
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No recharge transactions found.
                  </div>
                ) : (
                  items.map((item) => {
                    const isSuccess = item.status === "SUCCESS";
                    const isReversed = item.status === "REVERSED";

                    return (
                      <div
                        key={item.transaction_id}
                        onClick={() => setSelectedTxn(item)}
                        className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-amber-400/40 cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <OperatorLogo code={item.operator_code} className="w-8 h-8 text-xs" />
                            <div>
                              <div className="font-extrabold text-white text-sm font-mono">
                                +91 {item.mobile_number}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {item.operator_name}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-extrabold text-amber-400 text-base">
                              ₹{Number(item.recharge_amount).toFixed(2)}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                                isSuccess
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : isReversed
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                          <div>
                            Ref: <span className="font-mono text-slate-300">{item.operator_ref || item.transaction_id.slice(0, 12)}</span>
                          </div>
                          <div className="text-emerald-400 font-semibold">
                            Margin: +₹{Number(item.commission_amount || 1).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(item.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>

                          <span className="text-amber-400 font-semibold text-xs flex items-center gap-1">
                            <span>View Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
