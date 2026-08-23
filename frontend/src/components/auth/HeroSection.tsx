"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { AnimatedAuroraBackground } from "./motion/AnimatedAuroraBackground";
import { MouseSpotlight } from "./motion/MouseSpotlight";
import { CountUpNumber } from "./motion/CountUpNumber";

export const HeroSection: React.FC<{ darkMode?: boolean }> = ({ darkMode = true }) => {
  const shouldReduceMotion = useReducedMotion();

  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCard(idx);
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const BENEFITS = [
    { title: "Instant Settlement", icon: Zap },
    { title: "NPCI BBPS", icon: Building2 },
    { title: "UPI Enabled", icon: QrCode },
    { title: "AEPS Banking", icon: Smartphone },
    { title: "Secure Wallet", icon: CreditCard },
    { title: "PCI DSS Certified", icon: ShieldCheck },
    { title: "ISO 27001", icon: Lock },
    { title: "AI Fraud Detection", icon: Sparkles },
  ];

  const TICKER_ITEMS = [
    "⚡ Money Transfer ₹15,000 → HDFC Bank",
    "✓ UPI Success ₹500 → Merchant QR",
    "💳 Wallet Auto-Loaded ₹50,000",
    "🏦 AEPS Cash Withdrawal ₹10,000 → SBI",
    "✨ T+0 Settlement ₹2,50,000 → ICICI",
    "📄 BBPS Bill Paid ₹2,450 → TNEB Power",
    "🔐 Fraud Alert Blocked — AI Shield",
    "📱 UPI QR Payout ₹8,500 → Merchant",
  ];

  const TICKER_DOUBLED = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div
      className={`relative w-full h-full overflow-hidden flex flex-col justify-between select-none transition-colors duration-300 ${
        darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Background Effects */}
      <AnimatedAuroraBackground darkMode={darkMode} />
      <MouseSpotlight />

      {/* Inner layout with padding */}
      <div className="relative z-20 flex flex-col h-full justify-between p-5 xl:p-7 2xl:p-10">
        {/* ── Top Header ── */}
        <div className="flex items-center justify-between mb-3 2xl:mb-5">
          <div className="flex items-center gap-3 2xl:gap-4">
            <div className="w-10 h-10 2xl:w-12 2xl:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/30 shrink-0">
              <div
                className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                  darkMode ? "bg-slate-950" : "bg-white"
                }`}
              >
                <span className="text-sm 2xl:text-lg font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  P2P
                </span>
              </div>
            </div>
            <div>
              <h1
                className={`text-sm 2xl:text-lg font-extrabold tracking-tight leading-tight ${
                  darkMode ? "text-white" : "text-slate-900"
                }`}
              >
                Pay2Pay Enterprise
              </h1>
              <p
                className={`text-[10px] 2xl:text-xs font-semibold mt-0.5 ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Retailer Authentication Portal
              </p>
            </div>
          </div>

          {/* AI Fraud Shield Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 2xl:px-4 2xl:py-2 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 text-xs font-bold backdrop-blur-md shadow-lg shadow-emerald-500/10">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
            <span className="hidden sm:inline">AI Fraud Shield</span>
            <span className="sm:hidden">AI Shield</span>
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
        </div>

        {/* ── Hero Main Content ── */}
        <div className="flex-1 flex flex-col justify-center py-2 2xl:py-6">
          {/* RBI Compliance Badge */}
          <div className="mb-3 2xl:mb-5">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] 2xl:text-xs font-black uppercase tracking-wider backdrop-blur-md relative overflow-hidden ${
                darkMode
                  ? "bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15 border-blue-500/30 text-blue-400"
                  : "bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border-blue-400/40 text-blue-700 shadow-sm"
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>RBI Compliant FinTech Infrastructure</span>
            </div>
          </div>

          {/* Main Heading */}
          <div className="mb-3 2xl:mb-5">
            <h2
              className={`text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight leading-tight ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Power Every{" "}
              <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 bg-clip-text text-transparent">
                Retail Business
              </span>
            </h2>
          </div>

          {/* Subtitle */}
          <p
            className={`text-sm xl:text-base 2xl:text-xl font-medium leading-relaxed mb-5 2xl:mb-7 max-w-lg 2xl:max-w-2xl ${
              darkMode ? "text-slate-300" : "text-slate-700"
            }`}
          >
            Transfer Money · Accept UPI · AEPS Banking · BBPS · Wallet
            <span
              className={`block text-xs xl:text-sm 2xl:text-base font-normal mt-1 ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              All from one secure enterprise workstation platform.
            </span>
          </p>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-2 gap-3 2xl:gap-4 max-w-lg 2xl:max-w-3xl mb-5 2xl:mb-7">
            {[
              {
                title: "Instant Money Transfer",
                subtitle: "₹25,000 DMT",
                badge: "✓ Instant",
                icon: Zap,
                color: "blue",
              },
              {
                title: "Dynamic UPI 2.0",
                subtitle: "QR Accept",
                badge: "✓ 0% MDR",
                icon: QrCode,
                color: "purple",
              },
              {
                title: "AEPS Micro-ATM",
                subtitle: "Biometric Cash",
                badge: "✓ Verified",
                icon: Smartphone,
                color: "emerald",
              },
              {
                title: "Merchant Settlement",
                subtitle: "T+0 Payout",
                badge: "✓ 24x7",
                icon: TrendingUp,
                color: "cyan",
              },
            ].map((card, idx) => {
              const IconComp = card.icon;
              const colorMap: Record<string, string> = {
                blue: darkMode
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-blue-50 text-blue-600 border-blue-200",
                purple: darkMode
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                  : "bg-purple-50 text-purple-600 border-purple-200",
                emerald: darkMode
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-emerald-50 text-emerald-600 border-emerald-200",
                cyan: darkMode
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                  : "bg-cyan-50 text-cyan-600 border-cyan-200",
              };

              return (
                <div
                  key={idx}
                  onMouseMove={(e) => handleCardMouseMove(e, idx)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`relative p-3.5 2xl:p-4 rounded-2xl border backdrop-blur-xl flex items-center gap-3 group overflow-hidden transition-all duration-200 cursor-default hover:scale-[1.02] ${
                    darkMode
                      ? "bg-slate-900/75 border-slate-800/90 shadow-lg hover:border-blue-500/40 hover:shadow-blue-500/10"
                      : "bg-white/85 border-slate-200/90 shadow-xl shadow-slate-200/60 hover:border-blue-400/50 hover:shadow-blue-500/15"
                  }`}
                >
                  {/* Mouse spotlight glow */}
                  {hoveredCard === idx && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(180px circle at ${mousePos.x}px ${mousePos.y}px, rgba(59,130,246,0.2), transparent 80%)`,
                      }}
                    />
                  )}
                  <div
                    className={`w-9 h-9 2xl:w-11 2xl:h-11 rounded-xl flex items-center justify-center shrink-0 border ${colorMap[card.color]}`}
                  >
                    <IconComp className="w-4 h-4 2xl:w-5 2xl:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[10px] 2xl:text-xs font-semibold truncate ${
                        darkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {card.title}
                    </p>
                    <p
                      className={`text-xs 2xl:text-sm font-extrabold truncate ${
                        darkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {card.subtitle}{" "}
                      <span className="text-emerald-500 text-[9px] 2xl:text-xs font-extrabold">
                        {card.badge}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Benefits Pills */}
          <div className="flex flex-wrap gap-1.5 2xl:gap-2 max-w-lg 2xl:max-w-3xl">
            {BENEFITS.map((b) => {
              const IconComponent = b.icon;
              return (
                <div
                  key={b.title}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] 2xl:text-xs font-semibold transition-all cursor-default hover:scale-105 ${
                    darkMode
                      ? "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-blue-500/30 hover:text-white"
                      : "bg-white/80 border-slate-200 text-slate-700 hover:border-blue-500/40 hover:text-blue-900 shadow-sm"
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{b.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Bottom Stats & Ticker ── */}
        <div
          className={`pt-4 2xl:pt-6 border-t ${
            darkMode ? "border-slate-800/60" : "border-slate-200/80"
          }`}
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 2xl:gap-6 mb-3 2xl:mb-4">
            {[
              {
                value: <CountUpNumber target={50000} suffix="+" duration={2.2} />,
                label: "Active Retailers",
                color: darkMode ? "text-white" : "text-slate-900",
              },
              {
                value: <CountUpNumber target={5000} prefix="₹" suffix=" Cr+" duration={2.4} />,
                label: "Transactions",
                color: darkMode ? "text-white" : "text-slate-900",
              },
              {
                value: <CountUpNumber target={99.99} decimals={2} suffix="%" duration={2} />,
                label: "Success Rate",
                color: "text-emerald-500",
              },
              {
                value: "24x7",
                label: "Support",
                color: darkMode ? "text-cyan-400" : "text-cyan-600",
              },
            ].map((stat, i) => (
              <div key={i}>
                <p
                  className={`text-lg xl:text-xl 2xl:text-3xl font-black leading-tight ${stat.color}`}
                >
                  {stat.value}
                </p>
                <p className="text-[9px] 2xl:text-xs font-semibold text-slate-500 mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Live Ticker — seamless infinite scroll via CSS animation */}
          <div
            className={`overflow-hidden rounded-xl border py-2 2xl:py-2.5 backdrop-blur-md ${
              darkMode
                ? "bg-blue-950/40 border-blue-900/40 text-blue-300"
                : "bg-blue-50/80 border-blue-200/70 text-blue-700 shadow-sm"
            }`}
          >
            <div className="flex items-center">
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, duration: 28, ease: "linear" }}
                className="flex items-center gap-8 2xl:gap-12 whitespace-nowrap text-[10px] 2xl:text-xs font-bold px-4"
              >
                {TICKER_DOUBLED.map((item, idx) => (
                  <span key={idx} className="flex items-center gap-2 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    {item}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
