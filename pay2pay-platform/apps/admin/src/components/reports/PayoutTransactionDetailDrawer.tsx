"use client";

import React from "react";
import { X, Receipt, Shield, Building, User, Landmark, CheckCircle2, Clock, AlertTriangle, MessageSquare, Server, ExternalLink, ArrowRight, Terminal } from "lucide-react";

export interface PayoutTransactionDetail {
  transaction?: {
    txn_id: string;
    reference_id?: string;
    service: string;
    date_time: string | null;
    status: string;
    mode?: string;
    amount?: number;
  };
  transaction_info?: {
    transaction_id: string;
    payout_id: string;
    service: string;
    date_time: string | null;
    status: string;
    payment_mode: string;
  };
  hierarchy?: {
    tenant?: string;
    company?: string;
    sd?: string;
    distributor?: string;
    retailer?: string;
  };
  party?: {
    company?: string;
    retailer?: string;
    distributor?: string;
    sd?: string;
    rm?: string;
    customer?: string;
    customer_mobile?: string;
  };
  customer?: {
    name: string;
    mobile: string;
  };
  financial?: {
    amount?: number;
    gross_amount?: number;
    charge?: number;
    charges?: number;
    gst?: number;
    commission?: number;
    total_debit?: number;
    net_amount?: number;
    payout_amount?: number;
  };
  beneficiary?: {
    name: string;
    account: string;
    bank: string;
    ifsc: string;
  };
  bank?: {
    bank_name: string;
    masked_account_number: string;
    ifsc: string;
    utr: string;
  };
  vendor?: {
    name: string;
    api_status: string;
    api_response: string;
  } | null;
  comments?: string;
  status_timeline?: Array<{
    step: string;
    status: string;
    timestamp?: string | null;
  }>;
  audit?: {
    created_by?: string;
    created_at?: string | null;
    created_date?: string | null;
    updated_by?: string;
    updated_at?: string | null;
    updated_date?: string | null;
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: any;
  loading?: boolean;
}

export const PayoutTransactionDetailDrawer: React.FC<Props> = ({ open, onClose, data, loading }) => {
  if (!open) return null;

  const txnId = data?.transaction?.txn_id || data?.transaction_info?.transaction_id || "N/A";
  const status = (data?.transaction?.status || data?.transaction_info?.status || "SUCCESS").toUpperCase();
  const paymentMode = data?.transaction?.mode || data?.transaction_info?.payment_mode || "IMPS";
  const dateTime = data?.transaction?.date_time || data?.transaction_info?.date_time || "N/A";

  const isSuccess = status === "SUCCESS" || status === "COMPLETED" || status === "SETTLED";
  const isPending = status === "PENDING" || status === "PROCESSING" || status === "INITIATED";

  const companyName = data?.company?.name || data?.party?.company || data?.hierarchy?.company || "Pay2Pay Fintech";
  const retailerName = data?.party?.retailer || data?.hierarchy?.retailer || "Retailer Merchant";
  const distName = data?.party?.distributor || data?.hierarchy?.distributor;
  const sdName = data?.party?.sd || data?.hierarchy?.sd;
  const rmName = data?.party?.rm;

  const custName = data?.customer?.name || data?.party?.customer || "Not Available";
  const custMobile = data?.customer?.mobile || data?.party?.customer_mobile || "Not Available";

  const beneName = data?.beneficiary?.name || "Not Available";
  const beneAcc = data?.beneficiary?.account || data?.bank?.masked_account_number || "Not Available";
  const beneBank = data?.beneficiary?.bank || data?.bank?.bank_name || "Not Available";
  const beneIfsc = data?.beneficiary?.ifsc || data?.bank?.ifsc || "Not Available";
  const utr = data?.processing?.utr || data?.bank?.utr || "--";

  const grossAmount = Number(data?.financial?.amount ?? data?.financial?.gross_amount ?? data?.transaction?.amount ?? 0);
  const charge = Number(data?.financial?.charge ?? data?.financial?.charges ?? 0);
  const gst = Number(data?.financial?.gst ?? 0);
  const commission = Number(data?.financial?.commission ?? 0);
  const netDebit = Number(data?.financial?.total_debit ?? data?.financial?.net_amount ?? (grossAmount + charge + gst));

  const vendor = data?.vendor;
  const comments = data?.comments;

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
              <p className="text-xs text-slate-400 font-mono">
                {data ? `Txn ID: ${txnId}` : "Loading transaction details..."}
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
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400 font-medium">Loading transaction details...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            
            {/* 1. Status Banner */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isSuccess
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : isPending
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {status}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Payment Mode</span>
                <span className="text-sm font-bold text-white tracking-wider">{paymentMode}</span>
              </div>
            </div>

            {/* 2. Hierarchy Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                Organizational Hierarchy & Customer
              </h3>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block">Company</span>
                  <span className="font-semibold text-slate-200">{companyName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Retailer Merchant</span>
                  <span className="font-bold text-white">{retailerName}</span>
                </div>
                {distName && (
                  <div>
                    <span className="text-slate-400 block">Distributor (DIST)</span>
                    <span className="font-semibold text-indigo-400">{distName}</span>
                  </div>
                )}
                {sdName && (
                  <div>
                    <span className="text-slate-400 block">Super Distributor (SD)</span>
                    <span className="font-semibold text-blue-400">{sdName}</span>
                  </div>
                )}
                {rmName && (
                  <div>
                    <span className="text-slate-400 block">Regional Manager (RM)</span>
                    <span className="font-semibold text-slate-300">{rmName}</span>
                  </div>
                )}
                <div className="col-span-2 pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block">Customer Name</span>
                    <span className="font-semibold text-slate-200">{custName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Customer Mobile</span>
                    <span className="font-mono text-slate-200">{custMobile}</span>
                  </div>
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
                  <span>Payout Transfer Amount</span>
                  <span className="font-bold text-white font-mono">₹{grossAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Service / Transfer Charge</span>
                  <span className="font-mono">₹{charge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST</span>
                  <span className="font-mono">₹{gst.toFixed(2)}</span>
                </div>
                {commission > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Commission Earned</span>
                    <span className="text-emerald-400 font-mono">+₹{commission.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                  <span>Total Wallet Debit</span>
                  <span className="text-blue-400 font-mono">₹{netDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* 4. Beneficiary Bank Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-purple-400" />
                Beneficiary Information
              </h3>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block">Beneficiary Name</span>
                  <span className="font-bold text-slate-200">{beneName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Account Number</span>
                  <span className="font-mono font-bold text-amber-400">{beneAcc}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bank Name</span>
                  <span className="font-semibold text-slate-200">{beneBank}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">IFSC Code</span>
                  <span className="font-mono text-slate-300">{beneIfsc}</span>
                </div>
              </div>
            </div>

            {/* 5. Vendor / API Details & Telemetry Inspection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  Vendor &amp; Gateway Telemetry
                </h3>
                {txnId && txnId !== "N/A" && (
                  <a
                    href={`/operations/api-logs?transaction_id=${txnId}&service=PAYOUT`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>View Raw Logs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {vendor ? (
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vendor / Switch Name</span>
                    <span className="font-bold text-slate-200">{vendor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">API Status</span>
                    <span className={`font-bold ${vendor.api_status === "SUCCESS" ? "text-emerald-400" : "text-rose-400"}`}>
                      {vendor.api_status}
                    </span>
                  </div>
                  {vendor.api_response && (
                    <div>
                      <span className="text-slate-400 block mb-1">API Response</span>
                      <div className="font-mono text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 break-all">
                        {vendor.api_response}
                      </div>
                    </div>
                  )}

                  {txnId && txnId !== "N/A" && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <a
                        href={`/operations/api-logs?transaction_id=${txnId}&service=PAYOUT`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold transition-all text-xs"
                      >
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Inspect Outbound Vendor Logs &amp; Latency</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="text-slate-400">
                    <span>Audit telemetry logs recorded for this transaction</span>
                  </div>
                  {txnId && txnId !== "N/A" && (
                    <a
                      href={`/operations/api-logs?transaction_id=${txnId}&service=PAYOUT`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition-all text-xs"
                    >
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span>View API Logs</span>
                    </a>
                  )}
                </div>
              )}

              {/* Gateway Failure Direct Redirection Banner */}
              {!isSuccess && !isPending && txnId && txnId !== "N/A" && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>Transaction encountered a vendor switch failure.</span>
                  </div>
                  <a
                    href={`/operations/api-logs?transaction_id=${txnId}&service=PAYOUT&direction=OUTBOUND&is_error=true`}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1 transition-all flex-shrink-0 text-[11px]"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Inspect Failure Log</span>
                  </a>
                </div>
              )}
            </div>

            {/* 6. Comments */}
            {comments && (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2.5 text-xs">
                <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block font-semibold text-[11px]">Transaction Comments</span>
                  <span className={`font-semibold ${isSuccess ? "text-emerald-400" : isPending ? "text-amber-400" : "text-rose-400"}`}>
                    {comments}
                  </span>
                </div>
              </div>
            )}

            {/* 7. Audit Trail */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Initiated Date: <strong className="text-slate-200">{dateTime}</strong></span>
                <span>Completed Date: <strong className="text-slate-200">{data?.audit?.updated_date || data?.audit?.created_date || dateTime}</strong></span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
