"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  Lock,
  QrCode,
  Smartphone,
  Building2,
  Activity,
  Cpu,
  Globe2,
  CreditCard,
  Sparkles
} from "lucide-react";

export const HeroSection: React.FC = () => {
  // Animated Counters
  const [retailersCount, setRetailersCount] = useState(48500);
  const [txVolume, setTxVolume] = useState(4920);

  useEffect(() => {
    const timer = setInterval(() => {
      setRetailersCount((prev) => (prev < 50000 ? prev + 45 : 50000));
      setTxVolume((prev) => (prev < 5000 ? prev + 3 : 5000));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const BENEFITS = [
    { title: "Instant Settlement", icon: Zap },
    { title: "NPCI BBPS", icon: Building2 },
    { title: "UPI Enabled", icon: QrCode },
    { title: "AEPS Banking", icon: Smartphone },
    { title: "Secure Wallet", icon: CreditCard },
    { title: "PCI DSS Certified", icon: ShieldCheck },
    { title: "ISO 27001", icon: Lock },
    { title: "AES-256 Encryption", icon: Cpu },
    { title: "AI Fraud Detection", icon: Sparkles },
    { title: "99.99% Uptime", icon: Activity },
    { title: "RBI Ready", icon: Globe2 }
  ];

  const TICKER_ITEMS = [
    "⚡ Money Transfer Completed ₹15,000 → HDFC Bank",
    "✓ UPI Success ₹500 → Merchant QR",
    "💳 Merchant Wallet Auto-Loaded ₹50,000",
    "🏦 AEPS Cash Withdrawal ₹10,000 → SBI",
    "✨ T+0 Settlement Completed ₹2,50,000 → ICICI",
    "📄 BBPS Bill Paid ₹2,450 → TNEB Power"
  ];

  return (
    <div className="relative w-full h-full bg-slate-950 text-white overflow-hidden flex flex-col justify-between p-6 xl:p-10 2xl:p-14 select-none">
      {/* 1. Background Gradients & Cyan Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-950 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 2xl:w-[600px] 2xl:h-[600px] bg-blue-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 2xl:w-[600px] 2xl:h-[600px] bg-purple-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 left-1/4 w-80 h-80 2xl:w-[500px] 2xl:h-[500px] bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* 2. Top Header Logo & Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3 2xl:gap-4">
          <div className="w-10 h-10 2xl:w-14 2xl:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="text-lg 2xl:text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                P2P
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-lg 2xl:text-2xl font-extrabold tracking-tight text-white">Pay2Pay Enterprise</h1>
            <p className="text-xs 2xl:text-sm font-semibold text-slate-400">Retailer Authentication Portal</p>
          </div>
        </div>

        {/* AI Protection Badge */}
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="flex items-center gap-2 px-3 py-1.5 2xl:px-4 2xl:py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs 2xl:text-sm font-bold shadow-xs backdrop-blur-md"
        >
          <Sparkles className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
          <span>AI Fraud Shield Active</span>
        </motion.div>
      </div>

      {/* 3. Center Hero Main Content (No Scroll Overflow) */}
      <div className="relative z-10 my-auto py-2 2xl:py-6 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] 2xl:text-xs font-black uppercase tracking-wider mb-2 2xl:mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> RBI Compliant FinTech Infrastructure
          </span>
          <h2 className="text-3xl xl:text-5xl 2xl:text-7xl font-black tracking-tight text-white leading-tight mb-2 2xl:mb-4">
            Power Every <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              Retail Business
            </span>
          </h2>
          <p className="text-slate-300 text-sm xl:text-base 2xl:text-2xl max-w-xl 2xl:max-w-3xl font-medium leading-normal mb-4 2xl:mb-8">
            Transfer Money · Accept UPI · AEPS Banking · BBPS · Wallet · Settlement
            <br />
            <span className="text-slate-400 text-xs xl:text-sm 2xl:text-lg font-normal">All from one secure enterprise platform.</span>
          </p>
        </motion.div>

        {/* Floating Animated FinTech Cards Matrix (Compact for 100vh lock) */}
        <div className="grid grid-cols-2 gap-3 2xl:gap-5 max-w-xl 2xl:max-w-4xl">
          {/* Card 1: Money Transfer */}
          <motion.div
            whileHover={{ y: -3 }}
            className="p-3 2xl:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3 shadow-lg"
          >
            <div className="w-9 h-9 2xl:w-12 2xl:h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Zap className="w-4 h-4 2xl:w-6 2xl:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] 2xl:text-xs font-semibold text-slate-400 truncate">Instant Money Transfer</p>
              <p className="text-xs 2xl:text-base font-extrabold text-white truncate">₹25,000 DMT <span className="text-emerald-400 text-[10px] 2xl:text-xs">✓ Instant</span></p>
            </div>
          </motion.div>

          {/* Card 2: UPI Acceptance */}
          <motion.div
            whileHover={{ y: -3 }}
            className="p-3 2xl:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3 shadow-lg"
          >
            <div className="w-9 h-9 2xl:w-12 2xl:h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold shrink-0">
              <QrCode className="w-4 h-4 2xl:w-6 2xl:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] 2xl:text-xs font-semibold text-slate-400 truncate">Dynamic UPI 2.0</p>
              <p className="text-xs 2xl:text-base font-extrabold text-white truncate">QR Accept <span className="text-emerald-400 text-[10px] 2xl:text-xs">✓ 0% MDR</span></p>
            </div>
          </motion.div>

          {/* Card 3: AEPS Micro-ATM */}
          <motion.div
            whileHover={{ y: -3 }}
            className="p-3 2xl:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3 shadow-lg"
          >
            <div className="w-9 h-9 2xl:w-12 2xl:h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Smartphone className="w-4 h-4 2xl:w-6 2xl:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] 2xl:text-xs font-semibold text-slate-400 truncate">AEPS Micro-ATM</p>
              <p className="text-xs 2xl:text-base font-extrabold text-white truncate">Biometric Cash <span className="text-emerald-400 text-[10px] 2xl:text-xs">✓ Verified</span></p>
            </div>
          </motion.div>

          {/* Card 4: T+0 Settlement */}
          <motion.div
            whileHover={{ y: -3 }}
            className="p-3 2xl:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3 shadow-lg"
          >
            <div className="w-9 h-9 2xl:w-12 2xl:h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-4 h-4 2xl:w-6 2xl:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] 2xl:text-xs font-semibold text-slate-400 truncate">Merchant Settlement</p>
              <p className="text-xs 2xl:text-base font-extrabold text-white truncate">T+0 Payout <span className="text-emerald-400 text-[10px] 2xl:text-xs">✓ 24x7</span></p>
            </div>
          </motion.div>
        </div>

        {/* Benefits Grid Pills */}
        <div className="mt-4 2xl:mt-6 flex flex-wrap gap-1.5 2xl:gap-3 max-w-xl 2xl:max-w-4xl">
          {BENEFITS.map((b) => {
            const IconComponent = b.icon;
            return (
              <div
                key={b.title}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 2xl:px-3.5 2xl:py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-[11px] 2xl:text-sm font-semibold hover:border-blue-500/40 transition-colors"
              >
                <IconComponent className="w-3 h-3 2xl:w-4 2xl:h-4 text-blue-400" />
                <span>{b.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Live Stats & Ticker */}
      <div className="relative z-10 pt-3 2xl:pt-6 border-t border-slate-800/80">
        {/* Animated Counters Grid */}
        <div className="grid grid-cols-4 gap-2 2xl:gap-6 mb-3 2xl:mb-6">
          <div>
            <p className="text-lg xl:text-xl 2xl:text-3xl font-black text-white">{retailersCount.toLocaleString()}+</p>
            <p className="text-[10px] 2xl:text-xs font-semibold text-slate-400">Active Retailers</p>
          </div>
          <div>
            <p className="text-lg xl:text-xl 2xl:text-3xl font-black text-white">₹{txVolume.toLocaleString()}Cr+</p>
            <p className="text-[10px] 2xl:text-xs font-semibold text-slate-400">Transactions</p>
          </div>
          <div>
            <p className="text-lg xl:text-xl 2xl:text-3xl font-black text-emerald-400">99.99%</p>
            <p className="text-[10px] 2xl:text-xs font-semibold text-slate-400">Success Rate</p>
          </div>
          <div>
            <p className="text-lg xl:text-xl 2xl:text-3xl font-black text-white">24x7</p>
            <p className="text-[10px] 2xl:text-xs font-semibold text-slate-400">Enterprise Support</p>
          </div>
        </div>

        {/* Live Continuous Auto-Scrolling Ticker */}
        <div className="overflow-hidden bg-blue-950/40 border border-blue-900/40 rounded-xl py-1.5 px-3 2xl:py-2.5">
          <motion.div
            animate={{ x: [0, -600] }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            className="flex items-center gap-6 2xl:gap-10 whitespace-nowrap text-[11px] 2xl:text-sm font-bold text-blue-300"
          >
            {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, idx) => (
              <span key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {item}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
