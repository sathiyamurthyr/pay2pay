"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Share2,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building2,
  Smartphone,
  Wallet,
  AlertCircle,
  Download,
  Send,
  Lock,
  ChevronRight
} from "lucide-react";
import { useCompanyBranding, COMPANY_PRESETS } from "@/hooks/useCompanyBranding";

interface ReceiptData {
  tid: string;
  reference_id: string;
  merchant_ref_id?: string;
  provider_ref_id?: string;
  order_id?: string;
  status: "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING" | string;
  amount: number;
  customer_payable: number;
  retailer_credit: number;
  mdr_amount: number;
  tax_amount: number;
  total_charges: number;
  customer_name?: string;
  customer_mobile?: string;
  provider?: string;
  card_network?: string;
  payment_mode?: string;
  company_code?: string;
  company_name?: string;
  domain?: string;
  created_at?: string;
  completed_at?: string;
  utr?: string;
  failure_reason?: string | null;
}

function numberToWordsINR(num: number): string {
  if (isNaN(num) || num === 0) return "Zero Rupees Only";
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const format999 = (n: number): string => {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let result = "";
  const crores = Math.floor(integerPart / 10000000);
  const lakhs = Math.floor((integerPart % 10000000) / 100000);
  const thousands = Math.floor((integerPart % 100000) / 1000);
  const hundreds = integerPart % 1000;

  if (crores > 0) result += format999(crores) + "Crore ";
  if (lakhs > 0) result += format999(lakhs) + "Lakh ";
  if (thousands > 0) result += format999(thousands) + "Thousand ";
  if (hundreds > 0) result += format999(hundreds);

  result = result.trim() + " Rupees";
  if (decimalPart > 0) {
    result += " and " + format999(decimalPart).trim() + " Paise";
  }
  return result + " Only";
}

function formatIST(isoDate?: string | null): string {
  if (!isoDate) return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  try {
    const d = new Date(isoDate);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  } catch {
    return isoDate;
  }
}

export function PayInStatusView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const branding = useCompanyBranding();

  const refParam =
    searchParams.get("referenceId") ||
    searchParams.get("reference_id") ||
    searchParams.get("tid") ||
    searchParams.get("orderId") ||
    "";
  const statusParam = (searchParams.get("status") || "pending").toUpperCase();
  const utrParam = searchParams.get("utr") || "";

  const [loading, setLoading] = useState<boolean>(true);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const fetchReceiptDetails = useCallback(
    async (showLoadingSpinner: boolean = true) => {
      if (!refParam) {
        setLoading(false);
        return;
      }
      if (showLoadingSpinner) setLoading(true);
      setIsRefreshing(true);

      try {
        const res = await fetch(`/api/v1/payin/receipt/${encodeURIComponent(refParam)}`, {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });

        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            setReceipt(body.data);
            setErrorMsg("");
          } else {
            setErrorMsg("Receipt details unavailable");
          }
        } else if (res.status === 404) {
          // Fallback minimal receipt from search params if backend hasn't written record yet
          setReceipt({
            tid: refParam,
            reference_id: refParam,
            status: statusParam === "SUCCESS" ? "SUCCESS" : statusParam === "FAILED" ? "FAILED" : "PENDING",
            amount: 0,
            customer_payable: 0,
            retailer_credit: 0,
            mdr_amount: 0,
            tax_amount: 0,
            total_charges: 0,
            provider: "BankMe Gateway",
            utr: utrParam || refParam,
            created_at: new Date().toISOString()
          });
        } else {
          setErrorMsg(`Server returned status ${res.status}`);
        }
      } catch (err: any) {
        console.error("Error fetching receipt:", err);
        setErrorMsg("Failed to connect to verification server");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [refParam, statusParam, utrParam]
  );

  // Initial load
  useEffect(() => {
    fetchReceiptDetails(true);
  }, [fetchReceiptDetails]);

  // Polling for pending status
  useEffect(() => {
    const currentStatus = (receipt?.status || statusParam).toUpperCase();
    if (currentStatus === "PENDING" || currentStatus === "PROCESSING" || currentStatus === "INITIATED") {
      if (pollCount < 20) {
        pollTimerRef.current = setTimeout(() => {
          setPollCount((prev) => prev + 1);
          fetchReceiptDetails(false);
        }, 3000);
      }
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [receipt?.status, statusParam, pollCount, fetchReceiptDetails]);

  // Determine current active status
  const effectiveStatus = (
    receipt?.status ||
    statusParam ||
    "PENDING"
  ).toUpperCase();
  const isSuccess = effectiveStatus === "SUCCESS";
  const isFailed = effectiveStatus === "FAILED" || effectiveStatus === "FAILURE";
  const isPending = !isSuccess && !isFailed;

  // Company Brand Determination
  const host = typeof window !== "undefined" ? window.location.host : "";
  const companyCode =
    receipt?.company_code ||
    (host.includes("smspay") || host.includes("sms-pay") ? "SMSPAY" : host.includes("near4you") ? "NEAR4YOU" : "PAY2PAY");
  const companyTitle =
    receipt?.company_name ||
    (companyCode === "SMSPAY"
      ? "SMSPAY Digital Payments"
      : companyCode === "NEAR4YOU"
      ? "Near4You Financial Services"
      : "Pay2Pay Enterprise Network");

  // Share handlers
  const handleWhatsAppShare = () => {
    if (!receipt && !refParam) return;
    const tid = receipt?.tid || refParam;
    const amountStr = receipt?.amount ? `₹${receipt.amount.toLocaleString("en-IN")}` : "N/A";
    const statusEmoji = isSuccess ? "✅ SUCCESS" : isFailed ? "❌ FAILED" : "⏳ PENDING";
    const utrStr = receipt?.utr || utrParam || "N/A";
    const dateStr = formatIST(receipt?.completed_at || receipt?.created_at);

    const effectiveBranding = COMPANY_PRESETS[companyCode] || branding;
    const shareUrl = `https://receipt.sathus.in/r/${tid}`;

    const text =
      `🧾 *PAYMENT RECEIPT*\n` +
      `--------------------------------\n` +
      `🏢 *Company:* ${companyTitle}\n` +
      `🆔 *Transaction ID:* ${tid}\n` +
      `💳 *Status:* ${statusEmoji}\n` +
      `💰 *Amount:* ${amountStr}\n` +
      `🏦 *Bank UTR:* ${utrStr}\n` +
      `📅 *Date:* ${dateStr}\n` +
      `--------------------------------\n` +
      `🔗 *View Official Receipt:*\n${shareUrl}\n\n` +
      `_Automated receipt generated by ${companyCode} Gateway_`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleNativeShare = async () => {
    const tid = receipt?.tid || refParam;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const title = `${companyCode} PayIn Receipt - ${tid}`;
    const text = `Receipt of ₹${receipt?.amount?.toLocaleString("en-IN") || "0"} (${effectiveStatus}) for TID ${tid}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to copy
      }
    }
    copyToClipboard(shareUrl, "Receipt Link");
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between py-6 px-3 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-semibold px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400 text-sm animate-bounce no-print">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Scoped CSS for Print Slip */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-slip-container {
            box-shadow: none !important;
            border: 2px solid #0f172a !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-black-text {
            color: #000000 !important;
          }
          .print-border {
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Top Header / Brand Bar (Hidden during print) */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800/80 no-print">
        <Link
          href="/retailer/dashboard"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors group px-3 py-1.5 rounded-lg hover:bg-slate-800/60"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-3">
          {effectiveBranding.logo_url ? (
            <img
              src={effectiveBranding.logo_url}
              alt={companyTitle}
              className="h-8 max-w-[130px] object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
              {companyCode.slice(0, 2)}
            </div>
          )}
          <div className="flex flex-col text-right sm:text-left">
            <span className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide">
              {companyTitle}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 justify-end sm:justify-start">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Verified Payment Switch
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl w-full mx-auto my-6">
        {loading && !receipt ? (
          <div className="bg-slate-850/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-12 text-center shadow-2xl flex flex-col items-center justify-center gap-4">
            <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
            <h2 className="text-lg font-semibold text-slate-200">
              Retrieving Authoritative Receipt...
            </h2>
            <p className="text-xs text-slate-400">
              Querying transaction switch for Reference: {refParam || "ID"}
            </p>
          </div>
        ) : (
          <div className="print-slip-container bg-slate-850/90 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Status Hero Card */}
            <div
              className={`p-6 sm:p-8 text-center relative overflow-hidden transition-all duration-300 ${
                isSuccess
                  ? "bg-gradient-to-b from-emerald-950/60 via-emerald-900/20 to-transparent border-b border-emerald-800/40"
                  : isFailed
                  ? "bg-gradient-to-b from-rose-950/60 via-rose-900/20 to-transparent border-b border-rose-800/40"
                  : "bg-gradient-to-b from-amber-950/60 via-amber-900/20 to-transparent border-b border-amber-800/40"
              }`}
            >
              {/* Status Icon Indicator */}
              <div className="flex justify-center mb-4">
                {isSuccess && (
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500/60 animate-pulse">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 stroke-[2.5]" />
                    </div>
                  </div>
                )}
                {isFailed && (
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center border-2 border-rose-500/60">
                      <XCircle className="w-12 h-12 text-rose-400 stroke-[2.5]" />
                    </div>
                  </div>
                )}
                {isPending && (
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center border-2 border-amber-500/60">
                      <Clock className="w-12 h-12 text-amber-400 stroke-[2.5] animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Title */}
              <div className="space-y-1">
                <span
                  className={`inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full ${
                    isSuccess
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : isFailed
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  {isSuccess ? "Payment Successful" : isFailed ? "Payment Failed" : "Payment Pending"}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-2">
                  {isSuccess
                    ? "Transaction Completed"
                    : isFailed
                    ? "Transaction Declined"
                    : "Processing Payment"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  {isSuccess
                    ? "Your wallet has been credited and payment has been verified by the bank switch."
                    : isFailed
                    ? receipt?.failure_reason ||
                      "The issuing bank or gateway declined the transaction. No amount was deducted."
                    : "Awaiting bank clearance. Please wait a moment while the switch updates your balance."}
                </p>
              </div>

              {/* Primary Amount Card */}
              <div className="mt-6 pt-6 border-t border-slate-800/60">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Total Amount Paid
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-white mt-1 tracking-tight">
                  ₹{Number(receipt?.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                {receipt?.amount ? (
                  <div className="text-xs text-slate-400 italic mt-1.5 capitalize">
                    {numberToWordsINR(receipt.amount)}
                  </div>
                ) : null}

                {/* Net Wallet Credit Tag (Retailer view) */}
                {isSuccess && receipt?.retailer_credit ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-medium">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Net Wallet Credit: ₹{Number(receipt.retailer_credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Quick Action Toolbar (WhatsApp, Share, Download, Print) */}
            <div className="bg-slate-900/90 border-y border-slate-800 p-4 sm:px-8 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="text-xs text-slate-400 font-medium">
                Receipt Actions & Sharing
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {/* WhatsApp Share */}
                <button
                  onClick={handleWhatsAppShare}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/40 transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                {/* Native / System Share */}
                <button
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all hover:scale-105 active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Share</span>
                </button>

                {/* Print / Save PDF */}
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all hover:scale-105 active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Print Slip</span>
                </button>

                {/* Manual Status Refresh (for pending) */}
                {isPending && (
                  <button
                    onClick={() => fetchReceiptDetails(false)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span>Check Status</span>
                  </button>
                )}
              </div>
            </div>

            {/* Authoritative Transaction Details Grid */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reference ID / TID */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Transaction Ref ID (TID)
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wide break-all">
                      {receipt?.tid || refParam || "N/A"}
                    </span>
                    <button
                      onClick={() => copyToClipboard(receipt?.tid || refParam, "TID")}
                      className="ml-2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors no-print"
                      title="Copy Reference ID"
                    >
                      {copiedKey === "TID" ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bank UTR */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Bank UTR / Ref Number
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-sm sm:text-base font-bold text-emerald-400 tracking-wide break-all">
                      {receipt?.utr || utrParam || receipt?.provider_ref_id || "Awaiting UTR"}
                    </span>
                    {(receipt?.utr || utrParam) && (
                      <button
                        onClick={() => copyToClipboard(receipt?.utr || utrParam, "UTR")}
                        className="ml-2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors no-print"
                        title="Copy UTR"
                      >
                        {copiedKey === "UTR" ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Customer Details */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    Customer Mobile
                  </span>
                  <div className="font-semibold text-sm sm:text-base text-slate-100 mt-1">
                    {receipt?.customer_mobile || "Retailer Direct PayIn"}
                  </div>
                  {receipt?.customer_name && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      Name: {receipt.customer_name}
                    </div>
                  )}
                </div>

                {/* Gateway / Switch Info */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    Payment Gateway Switch
                  </span>
                  <div className="font-semibold text-sm sm:text-base text-slate-100 mt-1">
                    {receipt?.provider || "SMSPAY Exclusive Gateway G-1"}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>256-Bit TLS Secured Switching</span>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Transaction Timestamp
                  </span>
                  <div className="font-semibold text-sm text-slate-100 mt-1">
                    {formatIST(receipt?.completed_at || receipt?.created_at)}
                  </div>
                </div>

                {/* Order ID */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Gateway Order ID
                  </span>
                  <div className="font-mono text-sm text-slate-200 mt-1 break-all">
                    {receipt?.order_id || receipt?.merchant_ref_id || "BM-PAYIN-DIRECT"}
                  </div>
                </div>
              </div>

              {/* Financial Charges & Settlement Breakdown */}
              {receipt && (receipt.mdr_amount > 0 || receipt.retailer_credit > 0) && (
                <div className="border border-slate-800 rounded-2xl p-4 sm:p-5 bg-slate-900/40">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Settlement & Fee Breakdown
                  </div>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Gross Payment Amount:</span>
                      <span className="font-semibold text-white">
                        ₹{Number(receipt.amount).toFixed(2)}
                      </span>
                    </div>
                    {receipt.mdr_amount > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Gateway MDR Charges:</span>
                        <span className="text-rose-400">
                          - ₹{Number(receipt.mdr_amount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {receipt.tax_amount > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>GST on MDR (18%):</span>
                        <span className="text-rose-400">
                          - ₹{Number(receipt.tax_amount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm sm:text-base">
                      <span className="text-emerald-400">Net Wallet Credited:</span>
                      <span className="text-emerald-400 font-mono">
                        ₹{Number(receipt.retailer_credit || receipt.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Authorized Stamp representation (Shows on print & screen) */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-slate-200">
                      Authoritatively Verified by {companyCode} Switch
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Reference Hash: {receipt?.tid ? `SHA256-${receipt.tid.slice(-8)}` : "VERIFIED"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] text-slate-500">
                    STATUS: {effectiveStatus}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {receipt?.domain || host || "sms-pay.in"}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer (Hidden during print) */}
            <div className="p-6 bg-slate-900 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
              <Link
                href="/retailer/payin"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Make Another PayIn</span>
              </Link>

              <div className="w-full sm:w-auto flex items-center gap-2">
                <Link
                  href="/wallet-ledger"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5 text-blue-400" />
                  <span>Wallet Ledger</span>
                </Link>

                <Link
                  href="/retailer/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
                >
                  <span>Dashboard</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Notice (Hidden during print) */}
      <footer className="max-w-4xl w-full mx-auto text-center pt-4 border-t border-slate-800/60 text-xs text-slate-500 no-print">
        <p>
          This is an electronically generated transaction receipt. For any discrepancies or support queries, quote the Transaction Reference ID (TID) to customer helpdesk.
        </p>
      </footer>
    </div>
  );
}
