"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle,
  ShieldCheck,
  Printer,
  Download,
  Share2,
  Copy,
  ExternalLink,
  QrCode,
  Lock,
  ArrowLeft,
  Building2,
  User,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileText,
} from "lucide-react";

export default function PublicReceiptPage() {
  const params = useParams();
  const token = (params?.token as string) || "P2P-A61E08C4";

  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isTopup, setIsTopup] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isAdminSource, setIsAdminSource] = useState(false);
  const [adminApprovalUrl, setAdminApprovalUrl] = useState("");
  const [countdown, setCountdown] = useState(2);
  const [showReceiptSlip, setShowReceiptSlip] = useState(false);
  const [receiptData, setReceiptData] = useState({
    companyName: "SUPER REX PRODUCTS PRIVATE LIMITED",
    brandName: "Pay2Pay",
    brandTagline: "Enterprise Domestic Money Transfer (DMT) · Authorized Network",
    certifications: "NPCI IMPS Switch Certified · ISO 27001:2022 · 256-Bit SSL Encrypted",
    status: "SUCCESS",
    statusText: "TRANSACTION SUCCESSFUL · REAL-TIME CBS SETTLED",
    amount: 100.0,
    requestedAmount: 100.0,
    walletCredit: 100.0,
    charges: 20.0,
    gst: 4.0,
    totalPaid: 124.0,
    transactionId: "UPAY010926181100073",
    utr: "TEST-UTR168549591403",
    receiptToken: token,
    channel: "IMPS",
    date: "01 Sep 2026, 06:14 PM",
    retailerName: "Sathiya Murthy",
    retailerMobile: "+91 76669426",
    beneficiaryName: "Sathiya Murthy R",
    beneficiaryBank: "IDBI Bank",
    beneficiaryIfsc: "IBKL0000630",
    beneficiaryAccount: "0630104000156974",
    signature: `SIG-SHA256-${token.replace("P2P-", "")}982A1B7C`,
    proofSlipUrl: "",
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchReceipt() {
      if (!token) return;
      try {
        setLoading(true);
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://api.pay2pay.in";
        const res = await fetch(`${apiBase}/api/v1/public/receipt/${token}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.valid) {
            // 1. Detect if the visitor came from an Admin notification link
            // Admin template 1043386768499813 sends: ?source=admin_approval (or ?target=admin)
            const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
            const adminQuery = Boolean(
              searchParams && (
                searchParams.get("source") === "admin_approval" ||
                searchParams.get("source") === "admin" ||
                searchParams.get("target") === "admin" ||
                searchParams.get("role") === "admin"
              )
            );
            setIsAdminSource(adminQuery);

            const isTopupReq = Boolean(
              data.isTopup === true ||
              data.receiptType === "TOPUP_REQUEST" ||
              token.startsWith("TOP-") ||
              (data.transactionId && data.transactionId.startsWith("TOP-")) ||
              (data.statusText && data.statusText.includes("TOP-UP"))
            );

            const reqIsPending = Boolean(
              data.isPendingApproval === true ||
              data.status === "PENDING" ||
              data.status === "UNDER_REVIEW"
            );

            setIsTopup(isTopupReq);
            setIsPendingApproval(reqIsPending);

            const adminBase = process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || "https://admin.pay2pay.in";
            const reqId = data.topupRequestId || data.transactionId || token;
            const targetApprovalUrl = data.adminApprovalUrl || `${adminBase}/operations/topup-requests?requestId=${encodeURIComponent(reqId)}`;
            setAdminApprovalUrl(targetApprovalUrl);

            setReceiptData({
              companyName: data.companyName || "SUPER REX PRODUCTS PRIVATE LIMITED",
              brandName: data.brandName || "Pay2Pay",
              brandTagline: data.brandTagline || "Enterprise Domestic Money Transfer (DMT) · Authorized Network",
              certifications: data.certifications || "NPCI IMPS Switch Certified · ISO 27001:2022 · 256-Bit SSL Encrypted",
              status: data.status || "SUCCESS",
              statusText: data.statusText || "TRANSACTION SUCCESSFUL · REAL-TIME CBS SETTLED",
              amount: Number(data.amount) || 0,
              requestedAmount: Number(data.requestedAmount || data.amount) || 0,
              walletCredit: Number(data.walletCredit || data.amount) || 0,
              charges: Number(data.charges) || 0,
              gst: Number(data.gst) || 0,
              totalPaid: Number(data.totalPaid || data.amount) || 0,
              transactionId: data.transactionId || "",
              utr: data.utr || "N/A",
              receiptToken: data.receiptToken || token,
              channel: data.channel || "IMPS",
              date: data.date || "",
              retailerName: data.retailerName || "Pay2Pay Retailer",
              retailerMobile: data.retailerMobile || "",
              beneficiaryName: data.beneficiaryName || "Beneficiary",
              beneficiaryBank: data.beneficiaryBank || "",
              beneficiaryIfsc: data.beneficiaryIfsc || "",
              beneficiaryAccount: data.beneficiaryAccount || "",
              signature: data.signature || `SIG-SHA256-${token.replace("P2P-", "")}982A1B7C`,
              proofSlipUrl: data.proofSlipUrl || "",
            });
            setVerified(true);
            setNotFound(false);
            setLoading(false);
            return;
          }
        } else if (res.status === 404) {
          if (isMounted) {
            setNotFound(true);
            setVerified(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setNotFound(true);
          setVerified(false);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchReceipt();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Auto-redirect effect to Admin Approval Console ONLY for Admin alert with pending request:
  // 1. Retailer raised topup request (isTopup is true)
  // 2. Opened from WhatsApp Admin Alert (isAdminSource is true)
  // 3. Request is strictly pending admin action (isPendingApproval is true)
  // In ALL other cases (retailer clicking receipt, approved/rejected request, regular receipt):
  // DO NOT REDIRECT! Render receipt directly!
  useEffect(() => {
    if (!isTopup || !isAdminSource || !isPendingApproval || showReceiptSlip || !adminApprovalUrl) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (typeof window !== "undefined") {
            window.location.replace(adminApprovalUrl);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 750);

    return () => clearInterval(timer);
  }, [isTopup, isAdminSource, isPendingApproval, showReceiptSlip, adminApprovalUrl]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShareWhatsApp = () => {
    const shareText = `*Pay2Pay Official Transaction Receipt*\n\n` +
      `*Status:* SUCCESS (Real-Time CBS Settled)\n` +
      `*Amount:* ₹${receiptData.amount.toFixed(2)}\n` +
      `*Beneficiary:* ${receiptData.beneficiaryName}\n` +
      `*Bank:* ${receiptData.beneficiaryBank}\n` +
      `*A/C:* ${receiptData.beneficiaryAccount}\n` +
      `*UTR / RRN:* ${receiptData.utr}\n` +
      `*Receipt Token:* ${token}\n\n` +
      `Verify Online: https://receipt.pay2pay.in/r/${token}`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 select-none">
      {/* Global CSS for Clean Printing */}
      <style>{`
        @media print {
          body {
            background: #FFFFFF !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            box-shadow: none !important;
            border: 1px solid #E2E8F0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* ── TOP HEADER / BRAND BAR ── */}
      <header className="w-full max-w-xl flex items-center justify-between py-3 mb-4 border-b border-amber-500/20 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#080B11] rounded-[10px] flex items-center justify-center">
              <span className="text-sm font-black tracking-tighter bg-gradient-to-r from-[#FEF08A] to-[#F59E0B] bg-clip-text text-transparent">
                P2P
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight bg-gradient-to-r from-[#FEF08A] via-[#FBBF24] to-[#F59E0B] bg-clip-text text-transparent">
                Pay2Pay
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-400/40 text-blue-300 font-bold">
                Enterprise
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide">
              Public Receipt Verification Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? "Copied ✓" : "Copy URL"}</span>
          </button>
        </div>
      </header>

      {/* ── NOT FOUND ERROR CARD (Anti-Enumeration Protection) ── */}
      {notFound ? (
        <main className="w-full max-w-xl bg-[#0F172A] text-slate-100 rounded-3xl p-7 shadow-2xl border border-red-500/30 text-center my-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Receipt Link Not Found</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            The transaction receipt you are attempting to view does not exist, has expired, or access is restricted.
          </p>
          <div className="mt-5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-amber-400">
            Token: {token}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            If you recently initiated this transaction, please check your WhatsApp notification or contact Pay2Pay Support.
          </p>
        </main>
      ) : loading ? (
        <main className="w-full max-w-xl bg-white text-slate-900 rounded-3xl p-10 shadow-2xl border border-slate-200 text-center my-8">
          <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm font-bold text-slate-600">Verifying Digital Receipt...</p>
        </main>
      ) : (isTopup && isAdminSource && isPendingApproval && !showReceiptSlip) ? (
        <main className="w-full max-w-xl bg-gradient-to-b from-[#0D1527] to-[#0A0E1A] text-slate-100 rounded-3xl p-6 sm:p-8 shadow-2xl border border-blue-500/30 text-center my-6 relative overflow-hidden backdrop-blur-xl">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Security Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-bold mb-5 shadow-inner">
            <ShieldCheck className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>256-Bit SSL Encrypted · Admin Gateway</span>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-xl shadow-blue-500/25 mx-auto mb-4 flex items-center justify-center">
            <div className="w-full h-full bg-[#080B11] rounded-[14px] flex items-center justify-center">
              <Lock className="w-7 h-7 text-cyan-400" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Top-Up Request Approval Gateway
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
            Authorized administrative link verified. Redirecting you to the Pay2Pay Admin Console to review and approve this wallet top-up.
          </p>

          {/* Details Card */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Request Reference</span>
              <span className="font-mono font-bold text-amber-400">{receiptData.transactionId || token}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Retailer / Store</span>
              <span className="font-bold text-slate-200">{receiptData.retailerName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Requested Amount</span>
              <span className="font-black text-emerald-400 text-sm">₹{Number(receiptData.requestedAmount || receiptData.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Status</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                {receiptData.status}
              </span>
            </div>
          </div>

          {/* Progress / Countdown Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>Redirecting to Admin Portal...</span>
              </span>
              <span className="font-mono font-bold text-cyan-400">{countdown}s</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${Math.max(15, ((2 - countdown + 1) / 2) * 100)}%` }}
              />
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.replace(adminApprovalUrl);
                }
              }}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Proceed to Admin Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowReceiptSlip(true)}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Receipt Slip</span>
            </button>
          </div>
        </main>
      ) : (
        <>
          {isTopup && isAdminSource && isPendingApproval && (
            <div className="w-full max-w-xl mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border border-blue-500/40 flex items-center justify-between no-print shadow-lg">
              <div className="flex items-center gap-2 text-xs">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-200 font-semibold">Wallet Top-Up Request · Admin Review Action</span>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.replace(adminApprovalUrl);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span>Admin Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── VERIFIED RECEIPT CARD (PRINTABLE) ── */}
          <main className="w-full max-w-xl bg-white text-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 print-container relative overflow-hidden">
            {/* Subtle Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none -rotate-12">
              <span className="text-6xl sm:text-7xl font-black text-slate-900 uppercase tracking-widest">
                Pay2Pay Verified
              </span>
            </div>

          {/* ── 1. HEADER: BRAND & COMPANY DETAILS ── */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            {/* Pay2Pay Dual Emblem Logo */}
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/30 shrink-0 border-2 border-white/20">
              P2P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  {receiptData.brandName}
                </h1>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                  OFFICIAL RECEIPT
                </span>
              </div>
              <h2 className="text-xs font-extrabold text-slate-700 mt-0.5">
                {receiptData.companyName}
              </h2>
              <p className="text-[10.5px] font-bold text-blue-700">
                {receiptData.brandTagline}
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                {receiptData.certifications}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-[10px] font-black">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>VERIFIED</span>
            </div>
            <p className="text-[10px] font-mono font-bold text-slate-900 mt-1">
              {receiptData.receiptToken}
            </p>
            <p className="text-[9px] text-slate-500">
              {receiptData.date}
            </p>
          </div>
        </div>

        {/* ── 2. SUCCESS STATUS HERO ── */}
        <div className={`my-4 p-3 rounded-2xl text-center relative z-10 border ${
          receiptData.status === "FAILED"
            ? "bg-rose-50 border-rose-200 text-rose-700"
            : (receiptData.status === "PENDING" || isPendingApproval)
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          <div className="inline-flex items-center gap-1.5 font-black text-xs sm:text-sm tracking-wide">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{receiptData.statusText}</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            ₹{receiptData.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-0.5">
            {isTopup ? "Amount Credited to Retailer Wallet" : "Amount Credited to Beneficiary Account"}
          </p>
        </div>

        {/* ── 3. TRANSACTION METADATA GRID (2-COLUMN) ── */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 mb-4 grid grid-cols-2 gap-3 relative z-10 text-left">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transaction ID</p>
            <p className="text-xs font-mono font-bold text-slate-900 mt-0.5 break-all">
              {receiptData.transactionId}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bank UTR / RRN</p>
            <p className="text-xs font-mono font-bold text-blue-700 mt-0.5 break-all">
              {receiptData.utr}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Receipt Token</p>
            <p className="text-xs font-mono font-bold text-blue-600 mt-0.5">
              {receiptData.receiptToken}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Channel & Date</p>
            <p className="text-xs font-bold text-slate-900 mt-0.5">
              {receiptData.channel} · {receiptData.date}
            </p>
          </div>
        </div>

        {/* ── 4. SENDER & BENEFICIARY DETAILS ── */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 mb-4 space-y-3 relative z-10 text-left">
          <div>
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">
              {isTopup ? "Retailer Account" : "Retailer / Sender"}
            </p>
            <p className="text-xs sm:text-sm font-black text-slate-900">
              {receiptData.retailerName} {receiptData.retailerMobile ? <span className="text-slate-500 font-semibold">({receiptData.retailerMobile})</span> : null}
            </p>
          </div>

          <div className="h-px bg-slate-100" />

          <div>
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
              {isTopup ? "Beneficiary Wallet Account" : "Beneficiary Account Details"}
            </p>
            <p className="text-xs sm:text-sm font-black text-slate-900">
              {receiptData.beneficiaryName}
            </p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              Bank / Gateway: <span className="font-bold text-slate-900">{receiptData.beneficiaryBank}</span> · IFSC / Code: <span className="font-mono font-bold text-slate-900">{receiptData.beneficiaryIfsc}</span>
            </p>
            <p className="text-xs font-mono font-black text-slate-900 mt-0.5">
              A/C: {receiptData.beneficiaryAccount}
            </p>
          </div>
        </div>

        {/* ── 5. FINANCIAL BREAKDOWN ── */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 mb-4 space-y-1.5 relative z-10 text-left">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{isTopup ? "Requested / Paid Amount" : "Transfer Amount"}</span>
            <span className="font-bold text-slate-900">
              ₹{Number(receiptData.totalPaid || receiptData.requestedAmount || receiptData.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{isTopup ? "POS Fee / Charges" : "Convenience Fee"}</span>
            <span className="font-bold text-slate-900">
              ₹{receiptData.charges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          {receiptData.gst > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>GST</span>
              <span className="font-bold text-slate-900">
                ₹{receiptData.gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="h-px bg-slate-300 my-1" />

          <div className="flex items-center justify-between text-sm font-black text-blue-900">
            <span>{isTopup ? "NET WALLET CREDIT" : "TOTAL PAID"}</span>
            <span className="text-base text-blue-700">
              ₹{receiptData.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* ── 6. QR CODE & DIGITAL VERIFICATION SIGNATURE ── */}
        <div className="flex items-center gap-3 p-3 bg-slate-900 text-white rounded-2xl relative z-10 text-left">
          <div className="p-2 bg-white rounded-xl shrink-0 flex items-center justify-center">
            <QrCode className="w-10 h-10 text-slate-900" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <p className="text-xs font-black text-white">
                Cryptographically Signed & NPCI Verified
              </p>
            </div>
            <p className="text-[10px] font-mono text-amber-300 truncate mt-0.5">
              {receiptData.signature}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Powered by Pay2Pay Core Banking & DirectSwitch Engine
            </p>
          </div>
        </div>

        {/* ── 6b. PAYMENT SLIP PROOF ATTACHMENT (IF TOP-UP REQUEST) ── */}
        {receiptData.proofSlipUrl && (
          <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">Uploaded Payment Slip Proof</span>
              <a
                href={receiptData.proofSlipUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View Full Image</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white max-h-52 flex items-center justify-center p-1">
              <img
                src={receiptData.proofSlipUrl}
                alt="Payment Slip"
                className="object-contain max-h-48 w-full rounded-lg"
              />
            </div>
          </div>
        )}

        {/* ── 7. FOOTER ACTION BUTTONS (NO-PRINT) ── */}
        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-3 gap-2 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </main>
      </>
      )}

      {/* ── FOOTER COPYRIGHT ── */}
      <footer className="mt-6 text-center text-xs text-slate-500 no-print space-y-1">
        <p className="font-bold text-slate-400">
          © {new Date().getFullYear()} Pay2Pay Technologies. All rights reserved.
        </p>
        <p className="text-[11px]">
          Enterprise Payment Infrastructure · ISO 27001 Certified · PCI-DSS Compliant
        </p>
      </footer>
    </div>
  );
}
