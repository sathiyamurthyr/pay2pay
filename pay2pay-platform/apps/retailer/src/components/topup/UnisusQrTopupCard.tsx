"use client";

import React, { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  UploadCloud,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X
} from "lucide-react";

export interface UnisusQrItem {
  qr_id: string;
  title: string;
  qr_image_base64: string;
}

interface UnisusQrTopupCardProps {
  onSuccess?: () => void;
  className?: string;
}

export default function UnisusQrTopupCard({ onSuccess, className = "" }: UnisusQrTopupCardProps) {
  // ── Availability & QR State ──
  const [loading, setLoading] = useState<boolean>(true);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDefaultQr, setIsDefaultQr] = useState<boolean>(false);
  const [qrList, setQrList] = useState<UnisusQrItem[]>([]);
  const [selectedQrIndex, setSelectedQrIndex] = useState<number>(0);

  // ── Form State ──
  const [amount, setAmount] = useState<string>("");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Submission State ──
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<{
    payment_request_id: string;
    amount: number;
    reference_no: string;
    status: string;
    topup_request_id?: string;
  } | null>(null);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchQrs = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.get("/api/v1/unisus/qrs");
      if (res.data && res.data.code === 200 && res.data.data) {
        setIsAvailable(true);
        setIsDefaultQr(Boolean(res.data.data.is_default_qr));
        const qrs = res.data.data.qrs || [];
        setQrList(qrs);
        if (qrs.length > 0) {
          setSelectedQrIndex(0);
        }
      } else {
        setIsAvailable(false);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        // Strictly non-Sathus company or unassigned
        setIsAvailable(false);
      } else {
        setIsAvailable(false);
        setErrorMessage(err.response?.data?.detail || "Unisus Pay QR is currently unavailable.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrs();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload a valid image file (JPG, PNG, or GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Receipt image must be smaller than 5 MB.");
      return;
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReceiptPreview(result);
      setReceiptBase64(result);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptBase64("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount < 1) {
      setErrorMessage("Please enter a valid amount (minimum ₹1).");
      return;
    }

    const cleanRef = referenceNo.trim();
    if (!cleanRef || cleanRef.length < 4) {
      setErrorMessage("Please provide a valid UTR / Transaction Reference Number.");
      return;
    }

    if (!receiptBase64) {
      setErrorMessage("Payment receipt / screenshot is mandatory to prove the deposit.");
      return;
    }

    const currentQr = qrList[selectedQrIndex];
    if (!currentQr) {
      setErrorMessage("No active QR code selected.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        amount: numAmount,
        reference_no: cleanRef,
        note: note.trim() || undefined,
        receipt_image: receiptBase64,
        qr_id: currentQr.qr_id
      };

      const res = await api.post("/api/v1/unisus/submit-payment-request", payload);
      if (res.data && res.data.code === 200) {
        setSubmittedData({
          payment_request_id: res.data.data.payment_request_id || "PR-PENDING",
          amount: res.data.data.amount || numAmount,
          reference_no: res.data.data.deposited_no || cleanRef,
          status: res.data.data.status || "PENDING",
          topup_request_id: res.data.data.topup_request_id
        });
        onSuccess?.();
      } else {
        throw new Error(res.data?.msg || "Submission failed");
      }
    } catch (err: any) {
      console.error("Unisus Pay payment submission error:", err);
      const detail = err.response?.data?.detail || err.response?.data?.msg || err.message || "Failed to submit payment request.";
      setErrorMessage(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedData(null);
    setAmount("");
    setReferenceNo("");
    setNote("");
    handleRemoveReceipt();
    setErrorMessage(null);
  };

  if (loading) {
    return (
      <div className={`p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col items-center justify-center min-h-[300px] text-slate-400 ${className}`}>
        <RefreshCw className="h-8 w-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm font-medium">Checking Sathus Partner QR Channel...</p>
      </div>
    );
  }

  if (!isAvailable || qrList.length === 0) {
    return null; // Gracefully hidden for non-Sathus company or when no QR is available
  }

  const activeQr = qrList[selectedQrIndex] || qrList[0];
  const qrImageSrc = activeQr.qr_image_base64.startsWith("data:")
    ? activeQr.qr_image_base64
    : `data:image/png;base64,${activeQr.qr_image_base64}`;

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 border border-amber-500/30 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl p-6 md:p-8 ${className}`}>
      {/* Background Glow */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">Partner UPI QR Collection</h2>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sathus Exclusivity
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct UPI QR collection with automated bank settlement into your Pay2Pay wallet.
            </p>
          </div>
        </div>

        {/* QR Selector if multiple QRs are returned */}
        {qrList.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800 self-start sm:self-auto">
            {qrList.map((qr, idx) => (
              <button
                key={qr.qr_id || idx}
                type="button"
                onClick={() => setSelectedQrIndex(idx)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                  selectedQrIndex === idx
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {`QR Option ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {submittedData ? (
        /* ══════════════════════════════════════════════════════════════════════
           SUCCESS CONFIRMATION VIEW
           ══════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-white">Payment Request Submitted!</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Your payment proof has been successfully registered with our verification desk.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 max-w-lg mx-auto text-left">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Request ID</span>
                <p className="text-xs font-mono font-bold text-amber-400 truncate">{submittedData.payment_request_id}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Amount</span>
                <p className="text-xs font-bold text-emerald-400">₹{submittedData.amount.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Reference / UTR</span>
                <p className="text-xs font-mono font-bold text-slate-200 truncate">{submittedData.reference_no}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2 max-w-lg mx-auto text-left">
              <Clock className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Automatic Wallet Credit:</strong> Once verified against the bank statement, the system will trigger an instant settlement to immediately credit your wallet.
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleReset}
              className="py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/25 transition-all"
            >
              Submit Another Payment
            </button>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           STREAMLINED WORKFLOW: QR DISPLAY + PAYMENT VERIFICATION FORM
           ══════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Top Section: QR Card (Centered, Aspect-Square, No Vendor Name, No Download) */}
          <div className="flex flex-col items-center p-5 sm:p-6 rounded-2xl bg-slate-950/70 border border-slate-800 text-center relative overflow-hidden">
            <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-3 border-b border-slate-800/80 pb-2.5">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-amber-400" />
                Scan to Pay via UPI
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Channel
              </span>
            </div>

            {/* QR Image Container with Glow (Fixed Aspect Ratio, Never Distorted) */}
            <div className="relative p-3.5 bg-white rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.2)] border-2 border-amber-400/60 my-2 group flex items-center justify-center">
              <img
                src={qrImageSrc}
                alt="UPI Collection QR"
                className="w-56 h-56 aspect-square object-contain rounded-xl"
              />
            </div>

            {/* QR ID Tag */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 max-w-full">
              <span className="text-[10px] uppercase font-bold text-slate-500">QR ID:</span>
              <span className="font-mono text-slate-300 truncate max-w-[200px]">{activeQr.qr_id}</span>
              <button
                type="button"
                onClick={() => handleCopy(activeQr.qr_id, "qr_id")}
                className="text-amber-400 hover:text-amber-300 transition-colors ml-1"
                title="Copy QR ID"
              >
                {copiedId === "qr_id" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="mt-3.5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Accepted on GPay, PhonePe, Paytm, BHIM & All UPI Apps</span>
            </div>
          </div>

          {/* Bottom Section: Submission Form */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/50 border border-slate-800/80">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Submit Payment Verification
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  After paying against the QR code, fill in the details below with your receipt screenshot.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Deposited Amount (₹) <span className="text-amber-400">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Min ₹1</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-amber-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 1500)"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[500, 1000, 2000, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 border border-slate-700 transition-colors"
                    >
                      +₹{preset.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference / UTR Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Bank Reference / UTR Number <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value.toUpperCase())}
                  placeholder="e.g. TXN123456789 or 425617281920"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white font-mono font-bold text-sm uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-amber-400 transition-colors"
                />
                <p className="text-[10px] text-slate-400">
                  Enter the 12-digit UTR or transaction ID shown in your payment app confirmation.
                </p>
              </div>

              {/* Optional Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Remarks / Note <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Morning counter cash deposit"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Receipt Screenshot Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Payment Screenshot / Receipt <span className="text-amber-400">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Max 5MB (JPG/PNG)</span>
                </label>

                {receiptPreview ? (
                  <div className="relative p-2.5 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                      />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-200 truncate">{receiptFile?.name || "receipt.png"}</p>
                        <p className="text-[10px] text-emerald-400">Ready for submission</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveReceipt}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer p-4 rounded-xl border border-dashed border-slate-700 hover:border-amber-400/60 bg-slate-950/40 hover:bg-slate-900/60 transition-all text-center space-y-1.5"
                  >
                    <UploadCloud className="h-6 w-6 mx-auto text-amber-400/80" />
                    <p className="text-xs text-slate-300 font-medium">Click to upload payment screenshot</p>
                    <p className="text-[10px] text-slate-500">Supports JPG, PNG, GIF up to 5MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Submitting Payment Request...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Payment Request</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
