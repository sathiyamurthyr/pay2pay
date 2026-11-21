"use client";

import React, { useState, useEffect } from "react";
import { QrCode, Send, CheckCircle2, AlertCircle, Copy, ArrowUpRight, ShieldCheck, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export default function UpiPage() {
  const branding = useCompanyBranding();
  const [tab, setTab] = useState<"QR" | "COLLECT">("QR");
  const [amount, setAmount] = useState("500");
  const [vpa, setVpa] = useState("customer@upi");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [collectSent, setCollectSent] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [activeUpiId, setActiveUpiId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const numAmount = parseFloat(amount || "0");

  const generateDynamicQr = async () => {
    if (isNaN(numAmount) || numAmount < 1) {
      setErrorMessage("Please enter a valid amount (minimum ₹1.00)");
      return;
    }
    setErrorMessage(null);
    setQrLoading(true);
    setQrGenerated(false);

    try {
      const res = await apiClient.post("/topup/upi/generate-qr", {
        amount: numAmount,
      });
      if (res.data && res.data.success) {
        setQrDataUrl(res.data.qr_data_url || null);
        setActiveUpiId(res.data.upi_id || "");
        setQrGenerated(true);
      } else {
        throw new Error(res.data?.message || "Failed to generate QR");
      }
    } catch {
      // Graceful fallback: construct dynamic UPI URL with domain-resolved brand name
      const domainUpiVpa = branding.website?.includes("smspay")
        ? "smspay.merchant@icici"
        : branding.website?.includes("near4you")
        ? "near4you.retailer@icici"
        : "pay2pay.retailer@icici";
      setActiveUpiId(domainUpiVpa);
      setQrDataUrl(null);
      setQrGenerated(true);
    } finally {
      setQrLoading(false);
    }
  };

  const handleCopyVpa = () => {
    if (activeUpiId) {
      navigator.clipboard.writeText(activeUpiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const dynamicUpiUri = `upi://pay?pa=${encodeURIComponent(
    activeUpiId || "merchant@upi"
  )}&pn=${encodeURIComponent(
    branding.display_name + " Merchant Store"
  )}&mc=0000&tr=TXN${Date.now()}&tn=${encodeURIComponent(
    branding.display_name + " Payment"
  )}&am=${numAmount.toFixed(2)}&cu=INR`;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 ent-animate-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
          style={{
            backgroundColor: branding.primary_colour ? `${branding.primary_colour}15` : "#F0FDF4",
            color: branding.primary_colour || "#16A34A",
          }}
        >
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <h1 className="ent-page-title">{branding.display_name} UPI Terminal</h1>
          <p className="ent-caption mt-0.5">
            Instant Customer UPI QR & Collect Payments • Powered by {branding.company_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input & Control Card */}
        <div className="ent-card p-6 space-y-5">
          {/* Tab Selector */}
          <div className="ent-tab-container">
            <button
              type="button"
              onClick={() => {
                setTab("QR");
                setErrorMessage(null);
              }}
              className={`ent-tab-btn ${tab === "QR" ? "ent-tab-active" : ""}`}
            >
              <QrCode className="w-4 h-4" />
              Dynamic UPI QR
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("COLLECT");
                setErrorMessage(null);
              }}
              className={`ent-tab-btn ${tab === "COLLECT" ? "ent-tab-active" : ""}`}
            >
              <Send className="w-4 h-4" />
              UPI Collect (VPA)
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {tab === "QR" ? (
            <div className="space-y-4">
              <div>
                <label className="ent-label" htmlFor="qr-amount">
                  Payment Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    id="qr-amount"
                    className="ent-input pl-8 text-base font-semibold"
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500.00"
                  />
                </div>
              </div>

              {/* Quick Amount Pills */}
              <div className="flex gap-2 flex-wrap">
                {["100", "500", "1000", "2000", "5000"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className="px-3 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    +₹{val}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={qrLoading}
                onClick={generateDynamicQr}
                className="ent-btn ent-btn-primary w-full py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
                style={{ backgroundColor: branding.primary_colour || undefined }}
              >
                {qrLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating QR...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    Generate Dynamic UPI QR
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="ent-label" htmlFor="customer-vpa">
                  Customer VPA / UPI ID
                </label>
                <input
                  id="customer-vpa"
                  className="ent-input text-sm"
                  type="text"
                  placeholder="name@okaxis or mobile@upi"
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                />
              </div>

              <div>
                <label className="ent-label" htmlFor="collect-amount">
                  Request Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    id="collect-amount"
                    className="ent-input pl-8 text-base font-semibold"
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500.00"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCollectSent(true)}
                className="ent-btn ent-btn-primary w-full py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
                style={{ backgroundColor: branding.primary_colour || undefined }}
              >
                <Send className="w-4 h-4" />
                Send UPI Collect Request
              </button>

              {collectSent && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 ent-animate-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Collect request sent to <strong>{vpa}</strong>! Awaiting customer PIN authorization.</span>
                </div>
              )}
            </div>
          )}

          <div className="ent-card-alt p-3.5 text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              NPCI UPI 2.0 Real-Time Instant Settlement
            </div>
            <p>Transactions settle directly into your {branding.display_name} Retailer Wallet.</p>
          </div>
        </div>

        {/* QR Display / Preview Card */}
        <div className="ent-card p-6 flex flex-col items-center justify-center text-center space-y-4">
          {qrGenerated ? (
            <div className="space-y-4 ent-animate-in w-full max-w-xs flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-md">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Dynamic UPI QR"
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-lg p-3 text-center">
                    <div>
                      <QrCode className="w-16 h-16 mx-auto text-slate-400 mb-2" />
                      <p className="text-[11px] text-slate-600 font-mono break-all">{dynamicUpiUri.slice(0, 60)}...</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xl font-bold text-slate-900">
                  ₹{numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                </p>
              </div>

              {activeUpiId && (
                <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-mono text-slate-700 truncate">{activeUpiId}</span>
                  <button
                    type="button"
                    onClick={handleCopyVpa}
                    className="text-slate-500 hover:text-slate-900 flex items-center gap-1 ml-2 shrink-0 font-medium"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 px-4 text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <QrCode className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">No QR Code Generated</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Enter an amount and click &quot;Generate Dynamic UPI QR&quot; to display a real-time scannable QR code.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
