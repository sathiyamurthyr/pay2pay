"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
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
  Receipt,
  Copy,
  Check,
  Eye,
  X,
  ExternalLink,
  ChevronRight,
  FileCheck,
  Lock
} from "lucide-react";

interface TopupRequestItem {
  id: string;
  topup_request_id: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  payment_reference: string;
  payment_method: string;
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
}

export default function RetailerTopupRequestPage() {
  // ── States ───────────────────────────────────────────────────────────────────
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [retailerInfo, setRetailerInfo] = useState<{ code: string; name: string } | null>(null);
  const [myRequests, setMyRequests] = useState<TopupRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadingSlip, setUploadingSlip] = useState<boolean>(false);

  // Form Fields
  const [requestedAmount, setRequestedAmount] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");
  const [retailerRemarks, setRetailerRemarks] = useState<string>("");

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

  // ── Fetch Profile & My Requests ──────────────────────────────────────────────
  const fetchMyTopups = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const activeCode = typeof window !== "undefined" ? localStorage.getItem("p2p_active_retailer_id") || localStorage.getItem("pay2pay_reg_mobile") || "" : "";
      const query = activeCode ? `?retailer_id=${encodeURIComponent(activeCode)}` : "";
      const res = await api.get(`/api/v1/topup/my-requests${query}`);
      setMyRequests(res.data.items || []);
      if (res.data?.retailer) {
        setRetailerInfo({
          code: res.data.retailer.retailer_code,
          name: res.data.retailer.retailer_name
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

  useEffect(() => {
    fetchMyTopups();
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
        payment_date: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        slip_id: uploadedSlipData?.slip_id,
        slip_url: uploadedSlipData?.slip_url,
        slip_original_filename: uploadedSlipData?.original_filename,
        slip_file_size_bytes: uploadedSlipData?.file_size_bytes || uploadedSlipData?.file_size,
        slip_checksum: uploadedSlipData?.checksum,
        retailer_remarks: retailerRemarks.trim() || undefined
      };

      const res = await api.post("/api/v1/topup/request", payload);
      setSuccessMessage(res.data.message || `Topup request ${res.data.topup_request_id} submitted successfully.`);

      // Reset Form
      setRequestedAmount("");
      setPaymentReference("");
      setRetailerRemarks("");
      setSlipFile(null);
      setSlipPreview(null);
      setUploadedSlipData(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh list
      fetchMyTopups();
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
                    Proof Verification
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transfer funds to company bank account, upload receipt slip, and receive wallet credit upon admin verification.
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
              onClick={fetchMyTopups}
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
              New Topup Request
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
                <span>Requested Top-up Amount (₹) <span className="text-amber-400">*</span></span>
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

            {/* Payment Method & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Payment Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="IMPS">IMPS Instant Transfer</option>
                  <option value="NEFT">NEFT Transfer</option>
                  <option value="RTGS">RTGS Transfer</option>
                  <option value="BANK_DEPOSIT">Direct Cash / Branch Deposit</option>
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
                placeholder="e.g. Paid via SBI UPI for daily working capital"
                value={retailerRemarks}
                onChange={(e) => setRetailerRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || uploadingSlip}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Submitting Top-up Claim...
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
                  <th className="py-3 px-3 text-right">Requested</th>
                  <th className="py-3 px-3 text-right">Approved</th>
                  <th className="py-3 px-3">Payment / Ref</th>
                  <th className="py-3 px-3 text-center">Proof</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loadingRequests ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-400" />
                      Loading history...
                    </td>
                  </tr>
                ) : myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
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

                      {/* Requested Amount */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-100">
                        ₹{item.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Approved Amount */}
                      <td className="py-3 px-3 text-right font-semibold">
                        {item.approved_amount !== undefined && item.approved_amount !== null ? (
                          <span className="text-emerald-400">
                            ₹{item.approved_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Mode / Ref */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-200 truncate max-w-[120px]" title={item.payment_reference}>
                          {item.payment_reference}
                        </div>
                        <div className="text-[10px] text-slate-400">{item.payment_method}</div>
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
