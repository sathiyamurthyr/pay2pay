"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Share2,
  Printer,
  Copy,
  ArrowLeft,
  RefreshCw,
  User,
  CreditCard,
  Phone,
  Mail,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { useCompanyBranding, COMPANY_PRESETS } from "@/hooks/useCompanyBranding";
import { isReceiptSubdomain } from "@/lib/receipt-security";

export interface ReceiptData {
  tid: string;
  reference_id: string;
  merchant_ref_id?: string;
  provider_ref_id?: string;
  order_id?: string;
  status: "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING" | string;
  amount: number;
  gst?: number;
  tax_amount?: number;
  charges?: number;
  total_charges?: number;
  total_debited?: number;
  customer_payable?: number;
  retailer_credit?: number;
  retailer_name?: string;
  retailer_id?: string;
  customer_name?: string;
  customer_mobile?: string;
  gateway?: string;
  gateway_ref?: string;
  rrn?: string;
  provider?: string;
  card_network?: string;
  payment_mode?: string;
  payment_method?: string;
  domain?: string;
  support_phone?: string;
  support_email?: string;
  terms_url?: string;
  privacy_url?: string;
  created_at?: string;
  completed_at?: string;
  utr?: string;
  failure_reason?: string | null;
}

export function normalizeReceiptData(d: any): ReceiptData | null {
  if (!d) return null;
  const raw = d.data || d;
  const tid = raw.tid || raw.transactionId || raw.reference_id || raw.referenceId || "";
  if (!tid) return null;

  const rawMethod =
    raw.payment_method ||
    raw.paymentMethod ||
    raw.payment_mode ||
    raw.paymentMode ||
    raw.channel ||
    raw.card_network ||
    raw.cardNetwork;

  let cleanMethod = "Pending Classification";
  if (rawMethod && typeof rawMethod === "string" && rawMethod.trim()) {
    const rm = rawMethod.trim();
    const up = rm.toUpperCase();
    if (up === "VISA") cleanMethod = "Visa";
    else if (up === "MASTERCARD" || up === "MC") cleanMethod = "Mastercard";
    else if (up === "RUPAY") cleanMethod = "RuPay";
    else if (up === "AMEX") cleanMethod = "AMEX";
    else if (up === "CORP" || up === "CORPORATE") cleanMethod = "Corporate Card";
    else if (up === "UPI") cleanMethod = "UPI";
    else if (up === "CREDIT_CARD") cleanMethod = "Credit Card";
    else if (up === "DEBIT_CARD") cleanMethod = "Debit Card";
    else if (up === "NET_BANKING") cleanMethod = "Net Banking";
    else cleanMethod = rm;
  }

  const baseAmt = Number(raw.amount || raw.txn_amount || raw.requestedAmount || 0);
  const gstAmt = Number(raw.gst || raw.tax_amount || raw.taxAmount || 0);
  const chargesAmt = Number(raw.charges || raw.mdr_amount || (raw.total_charges ? Math.max(0, raw.total_charges - gstAmt) : 0) || 0);
  const totalDeb = Number(raw.total_debited || raw.totalDebited || raw.total_amount || raw.totalAmount || raw.totalPaid || raw.customer_payable || raw.customerPayable || (baseAmt + chargesAmt + gstAmt));
  const walletCred = Number(raw.retailer_credit || raw.retailerCredit || raw.wallet_credit || raw.walletCredit || raw.approvedAmount || baseAmt);

  return {
    tid,
    reference_id: raw.reference_id || raw.referenceId || tid,
    order_id: raw.order_id || raw.orderId || raw.merchant_ref_id || raw.merchantRefId || tid,
    merchant_ref_id: raw.merchant_ref_id || raw.merchantRefId || raw.orderId || raw.order_id,
    provider_ref_id: raw.provider_ref_id || raw.providerRefId || raw.gateway_ref || raw.gatewayRef || raw.utr || raw.rrn,
    status: (raw.status || raw.txn_status || "SUCCESS").toUpperCase(),
    amount: baseAmt,
    gst: gstAmt,
    tax_amount: gstAmt,
    charges: chargesAmt,
    total_charges: chargesAmt + gstAmt,
    total_debited: totalDeb,
    customer_payable: totalDeb,
    retailer_credit: walletCred,
    retailer_name: raw.retailer_name || raw.retailerName || raw.customer_name || raw.customerName || "Retailer Partner",
    retailer_id: raw.retailer_id || raw.retailerId || raw.retailer_code || raw.retailerCode || "RT12345",
    customer_name: raw.customer_name || raw.customerName || raw.retailer_name || raw.retailerName || "Customer",
    customer_mobile: raw.customer_mobile || raw.customerMobile || raw.mobile_no || raw.mobileNo || "",
    gateway: raw.gateway || raw.gatewayCode || raw.vendor_name || "G-1",
    gateway_ref: raw.gateway_ref || raw.gatewayRef || raw.provider_ref_id || raw.providerRefId || raw.utr || raw.rrn || "--",
    rrn: raw.rrn || raw.utr || raw.gateway_ref || raw.gatewayRef || raw.provider_ref_id || "--",
    provider: raw.provider || `Gateway ${raw.gateway || "G-1"}`,
    card_network: raw.card_network || raw.cardNetwork,
    payment_mode: cleanMethod,
    payment_method: cleanMethod,
    domain: raw.domain || raw.website,
    support_phone: raw.support_phone || raw.supportPhone || "+91 98765 43210",
    support_email: raw.support_email || raw.supportEmail || "support@smspay.store",
    terms_url: raw.terms_url || raw.termsUrl,
    privacy_url: raw.privacy_url || raw.privacyUrl,
    created_at: raw.created_at || raw.createdAt || raw.date || raw.dateTime,
    completed_at: raw.completed_at || raw.completedAt || raw.date || raw.dateTime,
    utr: raw.utr || raw.rrn || raw.gateway_ref,
    failure_reason: raw.failure_reason || raw.failureReason
  };
}

function formatIST(isoDate?: string | null): string {
  if (!isoDate) {
    const d = new Date();
    const day = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit" });
    const month = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short" });
    const year = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", year: "numeric" });
    const time = d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
    return `${day} ${month} ${year}, ${time}`;
  }
  try {
    const d = new Date(isoDate);
    const day = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit" });
    const month = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short" });
    const year = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", year: "numeric" });
    const time = d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
    return `${day} ${month} ${year}, ${time}`;
  } catch {
    return isoDate;
  }
}

/**
 * Centered Brand Logo Component
 * Renders high-fidelity SMSPAY logo or domain-specific company logo
 */
function ReceiptBrandLogo({ companyCode, logoUrl }: { companyCode: string; logoUrl?: string }) {
  if (companyCode === "SMSPAY") {
    return (
      <div className="flex items-center justify-center select-none py-1">
        <svg viewBox="0 0 240 52" className="h-11 sm:h-12 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Upper Orange Swoosh */}
          <path d="M142 6C168 2 200 10 212 24C200 21 170 14 145 17L142 6Z" fill="#F97316" />
          {/* Lower Blue Swoosh */}
          <path d="M202 20C218 28 217 39 184 46C199 43 210 34 204 25L202 20Z" fill="#0284C7" />
          {/* SMS Letters in Royal Blue */}
          <text x="12" y="38" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontStyle="italic" fontSize="38" fill="#0284C7" letterSpacing="-1.5">
            SMS
          </text>
          {/* PAY Letters in Vivid Orange */}
          <text x="106" y="38" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontStyle="italic" fontSize="38" fill="#F97316" letterSpacing="-1.5">
            PAY
          </text>
        </svg>
      </div>
    );
  }

  if (logoUrl) {
    return (
      <div className="flex items-center justify-center py-1">
        <img src={logoUrl} alt="Logo" className="h-10 sm:h-11 max-w-[160px] object-contain" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-1 text-xl font-black text-slate-900 tracking-tight">
      {companyCode}
    </div>
  );
}

interface PayInStatusViewProps {
  tokenProp?: string;
  initialData?: ReceiptData | null;
  isStandalone?: boolean;
}

export function PayInStatusView({
  tokenProp,
  initialData,
  isStandalone
}: PayInStatusViewProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const branding = useCompanyBranding();

  const refParam =
    tokenProp ||
    searchParams.get("referenceId") ||
    searchParams.get("reference_id") ||
    searchParams.get("tid") ||
    searchParams.get("orderId") ||
    "";
  const statusParam = (searchParams.get("status") || "pending").toUpperCase();
  const utrParam = searchParams.get("utr") || "";

  const [loading, setLoading] = useState<boolean>(!initialData);
  const [receipt, setReceipt] = useState<ReceiptData | null>(initialData ? normalizeReceiptData(initialData) : null);
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
        // Attempt retrieval via verified public receipt capability endpoint
        let fetched = false;
        const publicRes = await fetch(`/api/v1/public/receipt/${encodeURIComponent(refParam)}`, {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });

        if (publicRes.ok) {
          const body = await publicRes.json();
          const normalized = normalizeReceiptData(body);
          if (normalized) {
            setReceipt(normalized);
            setErrorMsg("");
            fetched = true;
          }
        }

        if (!fetched) {
          // Fallback to payin receipt endpoint
          const res = await fetch(`/api/v1/payin/receipt/${encodeURIComponent(refParam)}`, {
            cache: "no-store",
            headers: { Accept: "application/json" }
          });

          if (res.ok) {
            const body = await res.json();
            const normalized = normalizeReceiptData(body);
            if (normalized) {
              setReceipt(normalized);
              setErrorMsg("");
              fetched = true;
            }
          }
        }

        if (!fetched && !receipt) {
          setErrorMsg("Receipt details unavailable or verification failed");
        }
      } catch (err: any) {
        console.error("Error fetching receipt:", err);
        setErrorMsg("Failed to connect to verification server");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [refParam, statusParam, utrParam, receipt]
  );

  // Clean URL search parameters on mount if standalone receipt view
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search && isStandalone) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [isStandalone]);

  // Initial load
  useEffect(() => {
    fetchReceiptDetails(true);
  }, [fetchReceiptDetails]);

  // Polling for pending status
  useEffect(() => {
    const currentStatus = (receipt?.status || "PENDING").toUpperCase();
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
  }, [receipt?.status, pollCount, fetchReceiptDetails]);

  // Determine current active status strictly from verified backend receipt record
  // Never trust status query parameter from URL (prevent tampering/spoofing)
  const effectiveStatus = (
    receipt?.status ||
    (loading ? "VERIFYING" : "PENDING")
  ).toUpperCase();
  const isSuccess = effectiveStatus === "SUCCESS";
  const isFailed = effectiveStatus === "FAILED" || effectiveStatus === "FAILURE";
  const isPending = !isSuccess && !isFailed;

  // Domain & Company Brand Determination
  const host = typeof window !== "undefined" ? window.location.host.toLowerCase() : "";
  const companyCode =
    (host.includes("smspay") || host.includes("sms-pay"))
      ? "SMSPAY"
      : host.includes("near4you")
      ? "NEAR4YOU"
      : "PAY2PAY";

  const effectiveBranding = COMPANY_PRESETS[companyCode] || branding;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShare = async () => {
    const tid = receipt?.tid || refParam;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const title = `SMSPAY PayIn Receipt - ${tid}`;
    const text = `SMSPAY Payment Receipt: TID ${tid} | Status: ${effectiveStatus} | Amount: ₹${Number(receipt?.amount || 0).toLocaleString("en-IN")}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }
    copyToClipboard(shareUrl, "Receipt Link");
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-800 flex flex-col justify-between py-6 px-3 sm:px-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400 text-sm animate-bounce no-print">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Scoped CSS for Print Receipt Slip */}
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
          .receipt-main-container {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .receipt-accent-swoosh {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Navigation Back to Dashboard (No-print) */}
      <header className="max-w-[640px] w-full mx-auto flex items-center justify-between pb-3 no-print">
        {(!isStandalone && !isReceiptSubdomain(host)) ? (
          <Link
            href="/retailer/dashboard"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors group px-3 py-1.5 rounded-lg hover:bg-slate-200/60"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </Link>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Verified Payment Receipt</span>
        </div>
      </header>

      {/* Main Receipt Container */}
      <main className="max-w-[640px] w-full mx-auto my-2">
        {errorMsg && !receipt ? (
          <div className="bg-white border border-red-200 rounded-3xl p-10 text-center shadow-lg flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Receipt Verification Failed</h2>
            <p className="text-xs text-slate-500 max-w-sm">
              The requested payment receipt does not exist, has expired, or failed security validation.
            </p>
          </div>
        ) : loading && !receipt ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-lg flex flex-col items-center justify-center gap-4">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
            <h2 className="text-lg font-bold text-slate-800">
              Retrieving Verified Receipt...
            </h2>
            <p className="text-xs text-slate-500">
              Querying transaction switch for Reference: {refParam || "ID"}
            </p>
          </div>
        ) : (
          <div className="receipt-main-container relative bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
            {/* Top Curved Blue Accents (Decorative corners matching design) */}
            <div className="receipt-accent-swoosh absolute top-0 left-0 w-28 sm:w-36 h-28 sm:h-36 overflow-hidden pointer-events-none z-0">
              <svg viewBox="0 0 140 140" fill="none" className="w-full h-full">
                <path d="M0 0H140C90 10 30 50 0 140V0Z" fill="url(#blue_grad_left)" />
                <defs>
                  <linearGradient id="blue_grad_left" x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1D4ED8" />
                    <stop offset="1" stopColor="#0284C7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="receipt-accent-swoosh absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 overflow-hidden pointer-events-none z-0">
              <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
                <path d="M120 0V120C110 70 80 20 0 0H120Z" fill="url(#blue_grad_right)" />
                <defs>
                  <linearGradient id="blue_grad_right" x1="120" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1E40AF" />
                    <stop offset="1" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Header: Logo in Center */}
            <div className="relative z-10 pt-6 pb-2 px-6 text-center">
              <ReceiptBrandLogo companyCode={companyCode} logoUrl={effectiveBranding?.logo_url} />
            </div>

            {/* Payment Status Hero */}
            <div className="relative z-10 text-center px-6 pt-3 pb-2">
              <div className="flex justify-center mb-3">
                {isSuccess && (
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-full bg-[#22C55E] flex items-center justify-center text-white shadow-md">
                      <Check className="w-10 h-10 stroke-[3.5]" />
                    </div>
                    {/* Sparkle accents matching design */}
                    <span className="absolute -top-1 -left-4 text-[#22C55E] text-lg font-bold select-none">✦</span>
                    <span className="absolute bottom-1 -left-2 text-[#22C55E] text-xs font-bold select-none">✦</span>
                    <span className="absolute -top-2 -right-3 text-[#22C55E] text-xs font-bold select-none">✦</span>
                    <span className="absolute bottom-1 -right-4 text-[#22C55E] text-base font-bold select-none">✦</span>
                  </div>
                )}
                {isFailed && (
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-full bg-[#EF4444] flex items-center justify-center text-white shadow-md">
                      <XCircle className="w-10 h-10 stroke-[3]" />
                    </div>
                  </div>
                )}
                {isPending && (
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-full bg-[#F59E0B] flex items-center justify-center text-white shadow-md">
                      <Clock className="w-10 h-10 stroke-[3] animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Title & Message */}
              <h1
                className={`text-2xl sm:text-[28px] font-extrabold tracking-tight ${
                  isSuccess ? "text-[#15803D]" : isFailed ? "text-[#DC2626]" : "text-[#D97706]"
                }`}
              >
                {isSuccess ? "Payment Successful" : isFailed ? "Payment Failed" : "Payment Pending"}
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                {isSuccess
                  ? "Your payment has been processed successfully."
                  : isFailed
                  ? receipt?.failure_reason || "The payment transaction could not be completed by the bank switch."
                  : "Your payment is awaiting confirmation from the bank switch."}
              </p>
            </div>

            {/* 1. Transaction Summary 3-Column Box */}
            <div className="relative z-10 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-4 sm:p-5 mx-4 sm:mx-8 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Transaction ID (TID)</div>
                  <div className="text-sm font-bold text-slate-900 mt-1 font-mono tracking-tight break-all">
                    {receipt?.tid || refParam || "--"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Order ID</div>
                  <div className="text-sm font-bold text-slate-900 mt-1 font-mono tracking-tight break-all">
                    {receipt?.order_id || receipt?.merchant_ref_id || receipt?.tid || "--"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Date & Time</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {formatIST(receipt?.completed_at || receipt?.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Retailer Details Box (STRICT: Retailer Name & Retailer ID ONLY. NO COMPANY DETAILS) */}
            <div className="relative z-10 border border-[#E2E8F0] rounded-2xl mx-4 sm:mx-8 mt-4 p-4 sm:p-5 bg-white shadow-xs">
              <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#0284C7]">
                  <User className="w-4 h-4 text-[#0284C7]" />
                </div>
                <span className="text-sm sm:text-base font-bold text-[#0F172A]">Retailer Details</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-normal">Retailer Name</span>
                  <span className="font-bold text-slate-900 text-right">
                    {receipt?.retailer_name || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-normal">Retailer ID</span>
                  <span className="font-bold text-slate-900 text-right font-mono">
                    {receipt?.retailer_id || "--"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Payment Details Box */}
            <div className="relative z-10 border border-[#E2E8F0] rounded-2xl mx-4 sm:mx-8 mt-4 p-4 sm:p-5 bg-white shadow-xs">
              <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#0284C7]">
                  <CreditCard className="w-4 h-4 text-[#0284C7]" />
                </div>
                <span className="text-sm sm:text-base font-bold text-[#0F172A]">Payment Details</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-normal">Amount</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number(receipt?.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-normal">GST (18%)</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number(receipt?.gst || receipt?.tax_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-normal">Charges</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number(receipt?.charges || receipt?.total_charges ? Math.max(0, (receipt?.total_charges || 0) - (receipt?.tax_amount || 0)) : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Highlight Band: Total Debited */}
                <div className="bg-[#EFF6FF] border border-blue-100 rounded-lg px-4 py-2.5 my-2.5 flex items-center justify-between">
                  <span className="text-sm sm:text-base font-bold text-[#1E3A8A]">Total Debited</span>
                  <span className="text-base sm:text-lg font-black text-[#1E3A8A]">
                    ₹{Number(receipt?.total_debited || receipt?.customer_payable || receipt?.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600 font-normal">Payment Method</span>
                  <span className="font-bold text-slate-900">
                    {receipt?.payment_method || receipt?.payment_mode || "Pending Classification"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-normal">Gateway</span>
                  <span className="font-bold text-slate-900">
                    {receipt?.gateway || "G-1"}
                  </span>
                </div>
              </div>

              {/* For Your Reference Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E2E8F0]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 font-semibold text-[#0284C7] flex items-center gap-1 select-none">
                    <span className="text-[#0284C7] text-[10px]">§</span> For Your Reference
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-normal">Gateway Ref No.</span>
                  <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm break-all">
                    {receipt?.gateway_ref || receipt?.provider_ref_id || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-normal">RRN</span>
                  <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm break-all">
                    {receipt?.rrn || receipt?.utr || receipt?.provider_ref_id || "--"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Print Receipt & Share Receipt (Hidden during print) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mx-4 sm:mx-8 my-6 no-print">
              <button
                onClick={handlePrint}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#0284C7] hover:bg-[#0369A1] active:scale-98 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>

              <button
                onClick={handleShare}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-white hover:bg-sky-50 active:scale-98 text-[#0284C7] border-2 border-[#0284C7] font-bold text-sm shadow-xs transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Receipt</span>
              </button>

              {isPending && (
                <button
                  onClick={() => fetchReceiptDetails(false)}
                  disabled={isRefreshing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span>Check Status</span>
                </button>
              )}
            </div>

            {/* Bottom Navy Footer Bar */}
            <footer className="bg-[#1E3A8A] text-white px-5 sm:px-8 py-4 sm:py-5 rounded-b-3xl mt-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-[13px]">
                {/* Left: Need Help & Phone */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Need Help?</span>
                  <a
                    href={`tel:${receipt?.support_phone || "+91 98765 43210"}`}
                    className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-white" />
                    <span className="font-semibold">{receipt?.support_phone || "+91 98765 43210"}</span>
                  </a>
                </div>

                {/* Center: Email */}
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-white/30">|</span>
                  <a
                    href={`mailto:${receipt?.support_email || "support@smspay.store"}`}
                    className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-white" />
                    <span className="font-semibold">{receipt?.support_email || "support@smspay.store"}</span>
                  </a>
                </div>

                {/* Right: Terms & Privacy Links */}
                <div className="flex items-center gap-3 text-xs text-white/90">
                  <a
                    href={receipt?.terms_url || "https://smspay.store/terms"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-white transition-colors"
                  >
                    Terms & Conditions
                  </a>
                  <span className="text-white/40">|</span>
                  <a
                    href={receipt?.privacy_url || "https://smspay.store/privacy"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </a>
                </div>
              </div>

              {/* Bottom Verification Note */}
              <div className="mt-3.5 pt-2.5 border-t border-white/10 text-center text-[11px] text-white/70">
                Payment is subject to successful verification.
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* Footer spacer */}
      <div className="py-2 no-print" />
    </div>
  );
}
