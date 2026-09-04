"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useWalletSync, triggerWalletSync } from "@/context/WalletSyncProvider";
import {
  UploadCloud,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Wallet,
  Store,
  FileImage,
  ArrowUpRight,
  Info,
  AlertTriangle,
  AlertCircle,
  Receipt,
  Copy,
  Check,
  Eye,
  X,
  ExternalLink,
  ChevronRight,
  FileCheck,
  Lock,
  Calculator
} from "lucide-react";

interface TopupRequestItem {
  id: string;
  topup_request_id: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  payment_reference: string;
  payment_method: string;
  payment_mode?: string;
  payment_date?: string;
  slip_id?: string;
  slip_url?: string;
  slip_original_filename?: string;
  slip_file_size_bytes?: number;
  slip_checksum?: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
  retailer_remarks?: string;
  admin_notes?: string;
  rejection_reason?: string;
  submitted_at: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  transaction_reference?: string;
  mdr_charge?: number;
  gst_amount?: number;
  charges?: number;
  received_amount?: number;
}

interface PaymentModeOption {
  id?: string;
  code: string;
  name: string;
  display_order?: number;
  settlement_type?: string;
}

export default function RetailerTopupRequestPage() {
  // ── States & Live Sync ────────────────────────────────────────────────────────
  const { walletData, refreshWallet } = useWalletSync();
  const [walletBalance, setWalletBalance] = useState<number>(walletData?.wallet_balance ?? 0);
  const [retailerInfo, setRetailerInfo] = useState<{ code: string; name: string } | null>(
    walletData ? { code: walletData.retailer_code, name: walletData.retailer_name || walletData.owner_name } : null
  );
  const [myRequests, setMyRequests] = useState<TopupRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadingSlip, setUploadingSlip] = useState<boolean>(false);

  // Sync wallet balance whenever walletData updates
  useEffect(() => {
    if (walletData && typeof walletData.wallet_balance === "number") {
      setWalletBalance(walletData.wallet_balance);
      if (!retailerInfo && walletData.retailer_code) {
        setRetailerInfo({
          code: walletData.retailer_code,
          name: walletData.retailer_name || walletData.owner_name || "Retailer Account"
        });
      }
    }
  }, [walletData, retailerInfo]);

  // Allowed Dynamic Payment Modes (Loaded from live DB/API)
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);

  // Form Fields
  const [requestedAmount, setRequestedAmount] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [retailerRemarks, setRetailerRemarks] = useState<string>("");

  // Dynamic MDR Breakdown State
  const [mdrBreakdown, setMdrBreakdown] = useState<{
    transaction_amount: number;
    mdr: number;
    gst: number;
    charges: number;
    received_amount: number;
    payment_mode: string;
    mdr_config_id?: string;
  } | null>(null);
  const [calculatingMdr, setCalculatingMdr] = useState<boolean>(false);

  // Uploaded Slip Data
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [uploadedSlipData, setUploadedSlipData] = useState<{
    slip_id: string;
    slip_url: string;
    checksum: string;
    file_size: number;
    original_filename: string;
  } | null>(null);

  // UI helpers
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch Dynamic Payment Modes (Zero Local Storage, DB/API Driven) ───────────
  useEffect(() => {
    const fetchPaymentModes = async () => {
      try {
        const res = await api.get("/api/v1/pos/payment-modes");
        const items = res.data?.items || [];
        setPaymentModes(items);
        if (items.length > 0) {
          setPaymentMethod((prev) => {
            const exists = items.some((m: any) => m.code === prev);
            return exists ? prev : items[0].code;
          });
        } else {
          setPaymentMethod("");
        }
      } catch (err) {
        console.warn("Failed to load payment modes dynamically:", err);
        setPaymentModes([]);
        setPaymentMethod("");
      }
    };
    fetchPaymentModes();
  }, []);

  // ── Real-time Dynamic MDR Calculation ─────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const amt = parseFloat(requestedAmount);
    if (!amt || isNaN(amt) || amt <= 0 || !paymentMethod) {
      setMdrBreakdown(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCalculatingMdr(true);
        const activeCode = retailerInfo?.code || walletData?.retailer_code || "";
        const res = await api.post("/api/v1/pos/calculate-mdr", {
          payment_mode: paymentMethod,
          transaction_amount: amt,
          retailer_id: activeCode || undefined
        });
        if (isMounted && res.data) {
          setMdrBreakdown(res.data);
          setErrorMessage(null);
        }
      } catch (err: any) {
        if (isMounted) {
          const detail = err.response?.data?.detail || "MDR configuration is not available for this retailer and payment mode.";
          console.warn("MDR calculate warning:", detail);
          setMdrBreakdown(null);
        }
      } finally {
        if (isMounted) setCalculatingMdr(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [requestedAmount, paymentMethod, retailerInfo, walletData]);

  // ── Fetch Profile & My Requests ──────────────────────────────────────────────
  const fetchMyTopups = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingRequests(true);
      let userRefId: any = null;
      let userTypeRefId: any = 2;
      let retailerCode: string = "";
      if (typeof window !== "undefined") {
        try {
          const userStr =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            localStorage.getItem("pay2pay_user_data");
          if (userStr) {
            const u = JSON.parse(userStr);
            userRefId = u.user_ref_id || u.retailer_ref_id || u.ref_id || null;
            userTypeRefId = u.user_type_ref_id || 2;
            retailerCode = u.retailer_code || u.code || "";
          }
        } catch {}
      }
      const qParams = new URLSearchParams();
      qParams.set("user_type_ref_id", String(userTypeRefId || 2));
      if (userRefId) qParams.set("user_ref_id", String(userRefId));
      if (retailerCode) qParams.set("retailer_id", retailerCode);

      const res = await api.get(`/api/v1/topup/my-requests?${qParams.toString()}`);
      setMyRequests(res.data?.items || []);
      if (res.data?.retailer) {
        setRetailerInfo((prev) => {
          if (prev?.code === res.data.retailer.retailer_code && prev?.name === res.data.retailer.retailer_name) {
            return prev;
          }
          return {
            code: res.data.retailer.retailer_code,
            name: res.data.retailer.retailer_name
          };
        });
        if (res.data.retailer.current_wallet_balance !== undefined) {
          setWalletBalance(res.data.retailer.current_wallet_balance);
        }
      }
    } catch (err) {
      console.error("Failed to load my topup requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // Run initial fetch on mount
  useEffect(() => {
    fetchMyTopups(false);
  }, [fetchMyTopups]);

  // ── File Selection & Auto Upload ─────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Invalid format. Please upload JPG, PNG, or WEBP image.");
      return;
    }

    setSlipFile(file);
    setSlipPreview(URL.createObjectURL(file));
    setErrorMessage(null);

    // Auto-upload slip to storage backend
    try {
      setUploadingSlip(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await api.post("/api/v1/topup/upload-slip", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (uploadRes.data?.data) {
        setUploadedSlipData(uploadRes.data.data);
      }
    } catch (err: any) {
      console.error("Slip upload error:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to upload payment slip.";
      setErrorMessage(detail);
      setUploadedSlipData(null);
    } finally {
      setUploadingSlip(false);
    }
  };

  // ── Submit Topup Request ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const amt = parseFloat(requestedAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage("Please enter a valid requested amount greater than ₹0.");
      return;
    }

    if (!paymentReference.trim()) {
      setErrorMessage("Please provide the Bank Reference / UTR Number from your payment receipt.");
      return;
    }

    if (!uploadedSlipData && !uploadingSlip) {
      setErrorMessage("Please upload your payment proof / bank transfer slip image.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        requested_amount: amt,
        payment_reference: paymentReference.trim(),
        payment_method: paymentMethod,
        payment_mode: paymentMethod,
        payment_date: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        slip_id: uploadedSlipData?.slip_id,
        slip_url: uploadedSlipData?.slip_url,
        slip_original_filename: uploadedSlipData?.original_filename,
        slip_file_size_bytes: uploadedSlipData?.file_size_bytes || uploadedSlipData?.file_size,
        slip_checksum: uploadedSlipData?.checksum,
        retailer_remarks: retailerRemarks.trim() || undefined,
        // Transaction Pricing Snapshot
        mdr_charge: mdrBreakdown?.mdr,
        gst_amount: mdrBreakdown?.gst,
        charges: mdrBreakdown?.charges,
        received_amount: mdrBreakdown?.received_amount,
        mdr_config_id: mdrBreakdown?.mdr_config_id
      };

      let userRefId: any = null;
      let userTypeRefId: any = 2;
      if (typeof window !== "undefined") {
        try {
          const userStr =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            localStorage.getItem("pay2pay_user_data");
          if (userStr) {
            const u = JSON.parse(userStr);
            userRefId = u.user_ref_id || u.retailer_ref_id || u.ref_id || null;
            userTypeRefId = u.user_type_ref_id || 2;
          }
        } catch {}
      }
      const qParams = new URLSearchParams();
      qParams.set("user_type_ref_id", String(userTypeRefId || 2));
      if (userRefId) qParams.set("user_ref_id", String(userRefId));

      const res = await api.post(`/api/v1/topup/request?${qParams.toString()}`, payload);

      const newReqId = res.data.topup_request_id;
      setSuccessMessage(res.data.message || `Topup request ${newReqId} submitted successfully and is pending admin verification.`);

      // Optimistically prepend to right-hand table
      const newClaim: TopupRequestItem = {
        id: res.data?.id || `req-${Date.now()}`,
        topup_request_id: newReqId,
        requested_amount: amt,
        approved_amount: undefined,
        payment_reference: paymentReference.trim(),
        payment_method: paymentMethod,
        payment_mode: paymentMethod,
        payment_date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        slip_id: uploadedSlipData?.slip_id,
        slip_url: uploadedSlipData?.slip_url,
        status: "PENDING",
        submitted_at: new Date().toISOString(),
        mdr_charge: mdrBreakdown?.mdr,
        gst_amount: mdrBreakdown?.gst,
        charges: mdrBreakdown?.charges,
        received_amount: mdrBreakdown?.received_amount
      };
      setMyRequests((prev) => [newClaim, ...prev.filter(r => r.topup_request_id !== newReqId)]);

      // Reset Form
      setRequestedAmount("");
      setPaymentReference("");
      setRetailerRemarks("");
      setSlipFile(null);
      setSlipPreview(null);
      setUploadedSlipData(null);
      setMdrBreakdown(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh list and sync wallet from server
      fetchMyTopups();
      refreshWallet();
      triggerWalletSync();
    } catch (err: any) {
      console.error("Submit request error:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to submit topup request.";
      setErrorMessage(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const amountPresets = [1000, 2000, 5000, 10000, 25000, 50000];

  return (
    <div className="p-6 space-y-6 bg-slate-900/50 min-h-screen text-slate-100 font-sans">
      {/* ── Page Header & Wallet Balance Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 pb-5 lg:pb-0 lg:pr-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Request Wallet Top-up
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                    POS Settlement
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transfer funds to company bank account, select your POS settlement type, and receive wallet credit upon admin verification.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
            <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Server-Side Isolation Active:</strong> Credits are posted strictly to your authenticated retailer wallet ({retailerInfo?.code || "Retailer"}).
            </span>
          </div>
        </div>

        {/* Live Wallet Balance Indicator */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Wallet className="h-4 w-4" />
              Primary Settlement Balance
            </div>
            <button
              onClick={() => {
                fetchMyTopups();
                refreshWallet();
                triggerWalletSync();
              }}
              disabled={loadingRequests}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Refresh Balance"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRequests ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>

          <div className="my-2">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{retailerInfo?.name || "Retailer Account"}</span>
              <span className="font-mono text-amber-400 font-semibold">{retailerInfo?.code}</span>
            </div>
          </div>

          <div className="text-[11px] text-emerald-400/80 font-medium">
            ● Database Ledger Single Source of Truth
          </div>
        </div>
      </div>

      {/* ── Main Layout: Form + Requests List ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Column: Topup Request Form (5 cols) ── */}
        <div className="lg:col-span-5 bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-amber-400" />
              New POS Topup Request
            </h2>
            <span className="text-[11px] text-slate-400">Step 1 of 2</span>
          </div>

          {/* Feedback Messages */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Field + Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex justify-between">
                <span>Transaction Amount (₹) <span className="text-amber-400">*</span></span>
              </label>
              <input
                type="number"
                step="1"
                min="100"
                placeholder="Enter amount (e.g. 10000)"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {amountPresets.map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setRequestedAmount(amt.toString())}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition-colors"
                  >
                    +₹{amt.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Payment Mode {paymentModes.length === 0 && <span className="text-rose-400 font-bold">(Unavailable)</span>}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={paymentModes.length === 0}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentModes.length === 0 ? (
                    <option value="" disabled>
                      No settlement modes active
                    </option>
                  ) : (
                    paymentModes.map((mode) => (
                      <option key={mode.code} value={mode.code}>
                        {mode.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Warning Banner when all POS settlement modes are disabled */}
            {paymentModes.length === 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <strong>POS Top-Up Temporarily Unavailable:</strong> All settlement modes (Instant, T+1, T+2) are currently disabled by administrator. Top-up submissions are paused.
                </div>
              </div>
            )}

            {/* ── Dynamic Live MDR Breakdown Card ── */}
            {parseFloat(requestedAmount || "0") > 0 && (
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/80 p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5 text-amber-400" />
                    Live Fee & Received Amount Breakdown
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-semibold">
                    {paymentMethod}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <span className="text-slate-400">Payment Mode</span>
                  <span className="text-right font-medium text-slate-200">{paymentMethod}</span>

                  <span className="text-slate-400">Transaction Amount</span>
                  <span className="text-right font-semibold text-white">
                    ₹{parseFloat(requestedAmount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>

                  <span className="text-slate-400">MDR</span>
                  <span className="text-right font-medium text-amber-400">
                    {mdrBreakdown ? `₹${mdrBreakdown.mdr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : (calculatingMdr ? "..." : "₹0.00")}
                  </span>

                  <span className="text-slate-400">GST</span>
                  <span className="text-right font-medium text-amber-400/90">
                    {mdrBreakdown ? `₹${mdrBreakdown.gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : (calculatingMdr ? "..." : "₹0.00")}
                  </span>

                  <span className="text-slate-400">Charges</span>
                  <span className="text-right font-medium text-slate-300">
                    {mdrBreakdown ? `₹${mdrBreakdown.charges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : (calculatingMdr ? "..." : "₹0.00")}
                  </span>

                  <div className="col-span-2 pt-2.5 mt-0.5 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Received Amount</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      {mdrBreakdown
                        ? `₹${mdrBreakdown.received_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : (calculatingMdr ? "..." : `₹${parseFloat(requestedAmount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}`)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Reference / UTR */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Bank UTR / Transaction Reference <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. UTR123456789 or UPI-Ref"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            {/* Payment Slip / Proof Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex justify-between">
                <span>Upload Payment Slip / Screenshot <span className="text-amber-400">*</span></span>
                <span className="text-[10px] text-slate-400">JPG, PNG, WEBP (Max 10MB)</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileChange}
                className="hidden"
                id="slip-upload-input"
              />

              {slipPreview ? (
                <div className="relative border border-slate-700 rounded-xl p-3 bg-slate-950 flex items-center gap-3">
                  <img
                    src={slipPreview}
                    alt="Slip Preview"
                    className="h-16 w-16 object-cover rounded-lg border border-slate-800 cursor-pointer"
                    onClick={() => setLightboxImage(slipPreview)}
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-medium text-slate-200 truncate">{slipFile?.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {slipFile ? `${Math.round(slipFile.size / 1024)} KB` : ""}
                    </p>
                    {uploadingSlip ? (
                      <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 mt-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Uploading to secure storage...
                      </span>
                    ) : uploadedSlipData ? (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                        <Check className="h-3 w-3" />
                        Ready for verification
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSlipFile(null);
                      setSlipPreview(null);
                      setUploadedSlipData(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="slip-upload-input"
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl bg-slate-950/60 cursor-pointer transition-colors group"
                >
                  <UploadCloud className="h-8 w-8 text-slate-500 group-hover:text-amber-400 transition-colors mb-2" />
                  <p className="text-xs font-semibold text-slate-300 group-hover:text-white">
                    Click or drag & drop payment receipt
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Supports Google Pay, PhonePe, Paytm & Bank receipts
                  </p>
                </label>
              )}
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Remarks / Note (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Daily POS working capital top-up"
                value={retailerRemarks}
                onChange={(e) => setRetailerRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || uploadingSlip || paymentModes.length === 0 || !paymentMethod}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Submitting Top-up Claim...
                </>
              ) : paymentModes.length === 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-950" />
                  POS Top-Up Temporarily Unavailable
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Submit Topup Request for Approval
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Right Column: My Topup Requests History (7 cols) ── */}
        <div className="lg:col-span-7 bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-cyan-400" />
                My Top-up History & Claims
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Live status of your submitted payment proofs</p>
            </div>
            <button
              onClick={fetchMyTopups}
              disabled={loadingRequests}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${loadingRequests ? "animate-spin text-amber-400" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="py-3 px-3">Request ID</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-right">Net Credit</th>
                  <th className="py-3 px-3">Ref / UTR</th>
                  <th className="py-3 px-3 text-center">Proof</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loadingRequests ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-400" />
                      Loading history...
                    </td>
                  </tr>
                ) : myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <Info className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                      No topup requests submitted yet. Use the form on the left to request your first wallet top-up.
                    </td>
                  </tr>
                ) : (
                  myRequests.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Request ID */}
                      <td className="py-3 px-3 font-mono font-medium text-slate-200">
                        <div className="flex items-center gap-1">
                          <span>{item.topup_request_id}</span>
                          <button
                            onClick={() => copyToClipboard(item.topup_request_id, item.id)}
                            className="text-slate-500 hover:text-slate-300 p-0.5"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3 px-3 font-medium text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono">
                          {item.payment_mode || item.payment_method}
                        </span>
                      </td>

                      {/* Requested Amount */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-100">
                        ₹{item.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Net Received / Approved Amount */}
                      <td className="py-3 px-3 text-right font-semibold">
                        {item.received_amount !== undefined && item.received_amount !== null ? (
                          <span className="text-emerald-400">
                            ₹{item.received_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : item.approved_amount !== undefined && item.approved_amount !== null ? (
                          <span className="text-emerald-400">
                            ₹{item.approved_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            ₹{item.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Mode / Ref */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-200 truncate max-w-[120px]" title={item.payment_reference}>
                          {item.payment_reference}
                        </div>
                      </td>

                      {/* Proof */}
                      <td className="py-3 px-3 text-center">
                        {item.slip_url ? (
                          <button
                            onClick={() => setLightboxImage(item.slip_url || null)}
                            className="p-1 rounded bg-slate-700/60 hover:bg-slate-700 text-amber-300 text-[10px] inline-flex items-center gap-1"
                          >
                            <FileImage className="h-3 w-3 text-amber-400" />
                            Slip
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          item.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : item.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : item.status === "REJECTED"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-slate-700 text-slate-300"
                        }`}>
                          {item.status === "PENDING" && <Clock className="h-2.5 w-2.5 animate-pulse" />}
                          {item.status === "APPROVED" && <Check className="h-2.5 w-2.5" />}
                          {item.status === "REJECTED" && <X className="h-2.5 w-2.5" />}
                          {item.status}
                        </span>
                      </td>

                      {/* Submitted At */}
                      <td className="py-3 px-3 text-slate-400 text-[10px] whitespace-nowrap">
                        {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        }) : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Image Lightbox Modal ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Payment Slip Proof"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
