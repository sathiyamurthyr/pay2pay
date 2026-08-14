"use client";

import React from "react";
import { X, Receipt, Shield, Building, User, Landmark, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export interface PayoutTransactionDetail {
  transaction_info: {
    transaction_id: string;
    payout_id: string;
    service: string;
    date_time: string | null;
    status: string;
    payment_mode: string;
  };
  hierarchy: {
    tenant: string;
    company: string;
    sd: string;
    distributor: string;
    retailer: string;
  };
  financial: {
    gross_amount: number;
    charges: number;
    gst: number;
    commission: number;
    net_amount: number;
    payout_amount: number;
  };
  bank: {
    bank_name: string;
    masked_account_number: string;
    ifsc: string;
    utr: string;
  };
  status_timeline: Array<{
    step: string;
    status: string;
    timestamp?: string | null;
  }>;
  audit: {
    created_by: string;
    created_at: string | null;
    updated_by: string;
    updated_at: string | null;
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: PayoutTransactionDetail | null;
  loading?: boolean;
}

export const PayoutTransactionDetailDrawer: React.FC<Props> = ({ open, onClose, data, loading }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-[#0F172A] border-l border-slate-800 text-slate-100 h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Payout Transaction Audit Details</h2>
              <p className="text-xs text-slate-400">
                {data ? `Transaction ID: ${data.transaction_info.transaction_id}` : "Loading audit parameters..."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        {loading || !data ? (
          <div className="p-12 flex flex-col items-center justify-center flex-1">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400 font-medium">Fetching enterprise transaction ledger...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            
            {/* 1. Status Banner */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  data.transaction_info.status === "SUCCESS"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : data.transaction_info.status === "FAILED"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {data.transaction_info.status}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Payment Mode</span>
                <span className="text-sm font-bold text-white tracking-wider">{data.transaction_info.payment_mode}</span>
              </div>
            </div>

            {/* 2. Hierarchy Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                Organizational Hierarchy Scope
              </h3>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block">Tenant</span>
                  <span className="font-semibold text-slate-200">{data.hierarchy.tenant}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Company</span>
                  <span className="font-semibold text-slate-200">{data.hierarchy.company}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Super Distributor (SD)</span>
                  <span className="font-semibold text-blue-400">{data.hierarchy.sd}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Distributor (DIST)</span>
                  <span className="font-semibold text-indigo-400">{data.hierarchy.distributor}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-800/60">
                  <span className="text-slate-400 block">Retailer Merchant</span>
                  <span className="font-bold text-white">{data.hierarchy.retailer}</span>
                </div>
              </div>
            </div>

            {/* 3. Financial Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Financial Breakdown
              </h3>
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Gross Payout Amount</span>
                  <span className="font-bold text-white">₹{data.financial.gross_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Service Charges</span>
                  <span>₹{data.financial.charges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST (18%)</span>
                  <span>₹{data.financial.gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Commission Earned</span>
                  <span className="text-emerald-400">+₹{data.financial.commission.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                  <span>Net Debited Amount</span>
                  <span className="text-blue-400">₹{data.financial.net_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* 4. Bank Information (Masked) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-purple-400" />
                Beneficiary Bank Information
              </h3>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block">Bank Name</span>
                  <span className="font-bold text-slate-200">{data.bank.bank_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Masked Account Number</span>
                  <span className="font-mono font-bold text-amber-400">{data.bank.masked_account_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">IFSC Code</span>
                  <span className="font-mono text-slate-300">{data.bank.ifsc}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bank UTR</span>
                  <span className="font-mono font-bold text-emerald-400">{data.bank.utr}</span>
                </div>
              </div>
            </div>

            {/* 5. Status Timeline */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Status Timeline
              </h3>
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 text-xs">
                {data.status_timeline.map((st, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        st.status === "COMPLETED" ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-slate-600"
                      }`} />
                      <span className={st.status === "COMPLETED" ? "font-semibold text-white" : "text-slate-500"}>
                        {st.step}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {st.timestamp || st.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Audit Trail */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Created By: <strong className="text-slate-200">{data.audit.created_by}</strong></span>
                <span>Created At: <strong className="text-slate-200">{data.audit.created_at || "N/A"}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>Updated By: <strong className="text-slate-200">{data.audit.updated_by}</strong></span>
                <span>Updated At: <strong className="text-slate-200">{data.audit.updated_at || "N/A"}</strong></span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
