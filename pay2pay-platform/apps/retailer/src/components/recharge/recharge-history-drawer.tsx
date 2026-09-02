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
          className="w-full max-w-md h-full bg-[#090D17] border-l border-white/10 flex flex-col text-slate-100 shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Recharge Statement</h3>
                <p className="text-xs text-slate-400">Previous transactions & receipts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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
                const isFailed = item.status === "FAILED";

                return (
                  <div
                    key={item.transaction_id}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-amber-400/30 transition-all space-y-2"
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

                      <button
                        onClick={() => {
                          onSelectReceipt(item);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 hover:text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
