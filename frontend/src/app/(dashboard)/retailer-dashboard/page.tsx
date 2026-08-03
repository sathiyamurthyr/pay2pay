"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Send, Fingerprint, Users, Building2, CreditCard, Wallet,
  Receipt, Volume2, ArrowUpRight, ArrowDownLeft, CheckCircle2,
  Clock, XCircle, ChevronRight, Copy, Check, Search, X,
  ShieldCheck, RefreshCw, Sparkles, AlertCircle, Download, Share2, Phone,
} from "lucide-react";

// ─── Mock Retailer Transactions ───
const MOCK_RETAILER_TXNS = [
  { id: "TXN-88219", type: "DMT Transfer", recipient: "Kavitha Sharma (HDFC ****", amount: 5000, fee: 10, margin: 6.50, status: "SUCCESS", utr: "UTR-20260730-8812", time: "12:42 PM" },
  { id: "TXN-88218", type: "AEPS Cash Out", recipient: "Ramesh Kumar (Aadhaar **4412)", amount: 2000, fee: 0, margin: 5.00, status: "SUCCESS", utr: "UTR-20260730-7719", time: "12:15 PM" },
  { id: "TXN-88217", type: "Wallet Top-up", recipient: "UPI Cash Load", amount: 10000, fee: 0, margin: 0, status: "SUCCESS", utr: "UTR-20260730-6601", time: "11:30 AM" },
  { id: "TXN-88216", type: "DMT Transfer", recipient: "Suresh Patel (SBI ****", amount: 12000, fee: 20, margin: 14.00, status: "PENDING", utr: "UTR-20260730-5412", time: "10:50 AM" },
];

export default function RetailerMobileDashboardPage() {
  const [activeModal, setActiveModal] = useState<"dmt" | "aeps" | "receipt" | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── DMT Form State ──
  const [dmtMobile, setDmtMobile] = useState("9876543210");
  const [dmtAmount, setDmtAmount] = useState("5000");
  const [dmtBeneficiary, setDmtBeneficiary] = useState("Kavitha Sharma (HDFC - 50100998822)");
  const [dmtTransferring, setDmtTransferring] = useState(false);
  const [dmtSuccess, setDmtSuccess] = useState<any | null>(null);

  // ── AEPS Form State ──
  const [aepsAadhaar, setAepsAadhaar] = useState("998877664412");
  const [aepsBank, setAepsBank] = useState("State Bank of India");
  const [aepsService, setAepsService] = useState<"WITHDRAWAL" | "BALANCE" | "STATEMENT">("WITHDRAWAL");
  const [aepsAmount, setAepsAmount] = useState("2000");
  const [aepsScanning, setAepsScanning] = useState(false);
  const [aepsScanSuccess, setAepsScanSuccess] = useState(false);

  const handleCopy = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedId(utr);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDmtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDmtTransferring(true);
    setTimeout(() => {
      setDmtTransferring(false);
      const newTxn = {
        id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
        type: "DMT Transfer",
        recipient: dmtBeneficiary,
        amount: parseFloat(dmtAmount),
        fee: 10,
        margin: 6.50,
        status: "SUCCESS",
        utr: `UTR-20260730-${Math.floor(1000 + Math.random() * 9000)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setDmtSuccess(newTxn);
    }, 1200);
  };

  const handleAepsScan = () => {
    setAepsScanning(true);
    setTimeout(() => {
      setAepsScanning(false);
      setAepsScanSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen space-y-4 pb-16" style={{ background:"linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)", margin:"-20px -24px", padding:"24px" }}>
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[-80px] left-[5%]   w-[380px] h-[380px] rounded-full bg-indigo-600/10  blur-3xl" />
        <div className="absolute top-[25%]  right-[-50px] w-[320px] h-[320px] rounded-full bg-purple-600/8   blur-3xl" />
        <div className="absolute bottom-[10%] left-[30%] w-[280px] h-[280px] rounded-full bg-violet-600/7   blur-3xl" />
      </div>

      {/* ── Page Header Card ── */}
      <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none rounded-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-80 blur-sm animate-pulse" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/80 to-purple-600/80 border border-white/20 flex items-center justify-center">
                <Send className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-white tracking-tight">Retailer Banking Terminal</h1>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-extrabold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 relative" />
                  LIVE
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">DMT · AEPS · POS Swipe · Passbook · Soundbox</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-white/8 border border-white/15 text-center">
              <p className="text-[10px] font-bold text-slate-400">Wallet Balance</p>
              <p className="text-lg font-extrabold text-emerald-400 font-mono">₹28,450</p>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/8 border border-white/15 text-center">
              <p className="text-[10px] font-bold text-slate-400">Today Margin</p>
              <p className="text-lg font-extrabold text-violet-400 font-mono">₹1,480</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-4">

      {/* ── Quick Action Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wider">
            Banking Services
          </span>
          <span className="text-[10px] font-mono font-bold text-[#6C63FF] bg-[#EDE9FE] px-2 py-0.5 rounded-full">
            IMPS &amp; NPCI Live
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {/* DMT Action */}
          <button
            onClick={() => { setActiveModal("dmt"); setDmtSuccess(null); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#6C63FF] transition-all group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold text-[#0F172A] text-center leading-tight">
              DMT Transfer
            </span>
            <span className="text-[9px] text-[#10B981] font-bold mt-0.5">Instant IMPS</span>
          </button>

          {/* AEPS Action */}
          <button
            onClick={() => { setActiveModal("aeps"); setAepsScanSuccess(false); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#6C63FF] transition-all group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <Fingerprint className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold text-[#0F172A] text-center leading-tight">
              AEPS Banking
            </span>
            <span className="text-[9px] text-[#6C63FF] font-bold mt-0.5">Biometric</span>
          </button>

          {/* Customer Intake */}
          <Link
            href="/customers"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#6C63FF] transition-all group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold text-[#0F172A] text-center leading-tight">
              Customer Intake
            </span>
            <span className="text-[9px] text-[#64748B] font-bold mt-0.5">KYC Registration</span>
          </Link>

          {/* Beneficiary Intake */}
          <Link
            href="/beneficiaries"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#6C63FF] transition-all group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold text-[#0F172A] text-center leading-tight">
              Beneficiary
            </span>
            <span className="text-[9px] text-[#64748B] font-bold mt-0.5">Link Bank</span>
          </Link>

          {/* POS Terminal */}
          <Link
            href="/machines"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#6C63FF] transition-all group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold text-[#0F172A] text-center leading-tight">
              POS Swipe
            </span>
            <span className="text-[9px] text-[#64748B] font-bold mt-0.5">Bluetooth Terminal</span>
          </Link>

          {/* Wallet Passbook */}
          <Link
            href="/wallet-ledger/wallets"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#6C63FF] transition-all group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold text-[#0F172A] text-center leading-tight">
              Passbook
            </span>
            <span className="text-[9px] text-[#64748B] font-bold mt-0.5">Daily Ledger</span>
          </Link>

          {/* Bank Dispatches */}
          <Link
            href="/payouts/requests"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#6C63FF] transition-all group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold text-[#0F172A] text-center leading-tight">
              Dispatches
            </span>
            <span className="text-[9px] text-[#64748B] font-bold mt-0.5">Bank Payouts</span>
          </Link>

          {/* Soundbox Alerts */}
          <button
            onClick={() => alert("🔊 Soundbox Test: 'Payment of ₹5,000 received on Pay2Pay Merchant Wallet!'")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#6C63FF] transition-all group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <Volume2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold text-[#0F172A] text-center leading-tight">
              Soundbox
            </span>
            <span className="text-[9px] text-[#10B981] font-bold mt-0.5">Audio Alert</span>
          </button>
        </div>
      </div>

      {/* ── Today's Margin & Target Progress Card ── */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[12px] font-extrabold text-emerald-900">Today Retailer Margin</h4>
            <p className="text-[11px] text-emerald-700 font-medium">Earned +₹1,480.00 from 18 transactions</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono block">SLA Target</span>
          <span className="text-[13px] font-extrabold text-emerald-900 font-mono">92% Met</span>
        </div>
      </div>

      {/* ── Recent Mobile Passbook Feed ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
          <h3 className="text-[13px] font-bold text-[#0F172A] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#6C63FF]" />
            Recent Mobile Transactions
          </h3>
          <Link href="/dmt/transactions" className="text-[11px] font-extrabold text-[#6C63FF] hover:underline flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {MOCK_RETAILER_TXNS.map((txn) => (
            <div
              key={txn.id}
              onClick={() => setSelectedTxn(txn)}
              className="p-3 rounded-xl border border-[#F1F5F9] bg-[#FAFBFD] hover:bg-[#EEF6FF] transition-all cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 font-bold ${
                  txn.type.includes("DMT") ? "bg-indigo-500" : txn.type.includes("AEPS") ? "bg-emerald-500" : "bg-blue-500"
                }`}>
                  {txn.type.includes("DMT") ? <Send className="w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#0F172A] truncate">{txn.recipient}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono font-semibold text-[#6C63FF]">{txn.id}</span>
                    <span className="text-[10px] text-[#94A3B8]">• {txn.time}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[13px] font-extrabold text-[#0F172A] font-mono block">
                  ₹{txn.amount.toLocaleString("en-IN")}
                </span>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  +₹{txn.margin.toFixed(2)} Margin
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DMT Money Transfer Modal ── */}
      {activeModal === "dmt" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">DMT Money Transfer</h3>
                  <p className="text-[10px] text-[#64748B]">Instant IMPS Bank Remittance</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {dmtSuccess ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#0F172A]">Transfer Successful!</h4>
                  <p className="text-xs text-[#64748B] mt-0.5">Amount remitted to recipient bank account</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Transaction ID:</span>
                    <span className="font-mono font-bold text-[#6C63FF]">{dmtSuccess.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">UTR Number:</span>
                    <span className="font-mono font-bold text-[#0F172A]">{dmtSuccess.utr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Amount Transferred:</span>
                    <span className="font-mono font-extrabold text-[#0F172A]">₹{dmtSuccess.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-bold pt-1 border-t border-[#E2E8F0]">
                    <span>Agent Commission Earned:</span>
                    <span>+₹{dmtSuccess.margin.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 rounded-xl bg-[#6C63FF] text-white font-bold text-xs hover:bg-[#5B52E5] transition-all shadow-md"
                >
                  Done &amp; Close Receipt
                </button>
              </div>
            ) : (
              <form onSubmit={handleDmtSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="ent-label">Sender Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="text"
                      required
                      value={dmtMobile}
                      onChange={(e) => setDmtMobile(e.target.value)}
                      className="ent-input pl-9 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="ent-label">Select Beneficiary Account</label>
                  <select
                    value={dmtBeneficiary}
                    onChange={(e) => setDmtBeneficiary(e.target.value)}
                    className="ent-input pr-8"
                  >
                    <option value="Kavitha Sharma (HDFC - 50100998822)">Kavitha Sharma (HDFC - 50100998822)</option>
                    <option value="Ramesh Patel (SBI - 30441199228)">Ramesh Patel (SBI - 30441199228)</option>
                    <option value="Anand Kumar (ICICI - 00119922334)">Anand Kumar (ICICI - 00119922334)</option>
                  </select>
                </div>

                <div>
                  <label className="ent-label">Transfer Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={dmtAmount}
                    onChange={(e) => setDmtAmount(e.target.value)}
                    className="ent-input font-mono font-bold text-sm"
                  />
                </div>

                {/* Calculation breakdown */}
                <div className="p-3 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#4338CA] space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>IMPS Customer Charge:</span>
                    <span className="font-bold">₹10.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Retailer Agent Commission:</span>
                    <span>+₹6.50</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActiveModal(null)} className="ent-btn ent-btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={dmtTransferring} className="ent-btn ent-btn-primary flex-1">
                    {dmtTransferring ? "Remitting..." : `Send ₹${dmtAmount} Now`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── AEPS Biometric Banking Modal ── */}
      {activeModal === "aeps" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">AEPS Aadhaar Banking</h3>
                  <p className="text-[10px] text-[#64748B]">Biometric Micro-ATM &amp; Balance</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {aepsScanSuccess ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#0F172A]">Biometric Match Verified!</h4>
                  <p className="text-xs text-[#64748B] mt-0.5">Cash Dispatched: ₹{aepsAmount}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-left space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Bank Response:</span>
                    <span className="font-bold text-[#10B981]">NPCI 00 — SUCCESS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Remaining Balance:</span>
                    <span className="font-mono font-bold">₹14,250.00</span>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                  Print Slip &amp; Close
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="ent-label">Customer Aadhaar Number (12 Digits)</label>
                  <input
                    type="text"
                    value={aepsAadhaar}
                    onChange={(e) => setAepsAadhaar(e.target.value)}
                    className="ent-input font-mono tracking-widest font-bold"
                  />
                </div>

                <div>
                  <label className="ent-label">Select Customer Bank</label>
                  <select
                    value={aepsBank}
                    onChange={(e) => setAepsBank(e.target.value)}
                    className="ent-input pr-8"
                  >
                    <option value="State Bank of India">State Bank of India</option>
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Bank of Baroda">Bank of Baroda</option>
                    <option value="Punjab National Bank">Punjab National Bank</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ent-label">Service Type</label>
                    <select
                      value={aepsService}
                      onChange={(e) => setAepsService(e.target.value as any)}
                      className="ent-input pr-8"
                    >
                      <option value="WITHDRAWAL">Cash Withdrawal</option>
                      <option value="BALANCE">Balance Enquiry</option>
                      <option value="STATEMENT">Mini Statement</option>
                    </select>
                  </div>
                  <div>
                    <label className="ent-label">Amount (₹)</label>
                    <input
                      type="number"
                      value={aepsAmount}
                      onChange={(e) => setAepsAmount(e.target.value)}
                      className="ent-input font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Fingerprint Sensor Trigger Area */}
                <div
                  onClick={handleAepsScan}
                  className="p-4 rounded-2xl border-2 border-dashed border-[#6C63FF] bg-[#EDE9FE]/50 text-center cursor-pointer hover:bg-[#EDE9FE] transition-all space-y-2"
                >
                  <Fingerprint className={`w-10 h-10 mx-auto text-[#6C63FF] ${aepsScanning ? "animate-pulse" : ""}`} />
                  <p className="text-[11px] font-bold text-[#4338CA]">
                    {aepsScanning ? "Scanning Fingerprint on Mantra/Morpho…" : "Tap to Scan Customer Fingerprint"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Transaction Receipt Modal ── */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">Transaction Receipt Slip</h3>
              <button onClick={() => setSelectedTxn(null)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs">
              <div className="text-center pb-3 border-b border-[#E2E8F0]">
                <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Pay2Pay Merchant Receipt</p>
                <p className="text-lg font-extrabold text-[#0F172A] font-mono mt-1">₹{selectedTxn.amount.toLocaleString()}</p>
                <span className="ent-badge ent-badge-success mt-1">{selectedTxn.status}</span>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-[#64748B]">Txn ID:</span>
                <span className="font-mono font-bold text-[#6C63FF]">{selectedTxn.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">UTR Ref:</span>
                <span className="font-mono font-bold text-[#0F172A]">{selectedTxn.utr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Service:</span>
                <span className="font-semibold text-[#0F172A]">{selectedTxn.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Recipient:</span>
                <span className="font-semibold text-[#0F172A] truncate max-w-[160px]">{selectedTxn.recipient}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-[#E2E8F0]">
                <span>Retailer Commission:</span>
                <span>+₹{selectedTxn.margin.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(selectedTxn.utr)}
                className="flex-1 ent-btn ent-btn-secondary text-[11px]"
              >
                {copiedId === selectedTxn.utr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === selectedTxn.utr ? "Copied" : "Copy UTR"}
              </button>
              <button onClick={() => setSelectedTxn(null)} className="flex-1 ent-btn ent-btn-primary text-[11px]">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      </div>{/* end relative z-10 space-y-4 */}
    </div>
  );
}
