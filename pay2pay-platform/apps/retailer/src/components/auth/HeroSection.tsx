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
  ArrowRight
} from "lucide-react";
import { AnimatedAuroraBackground } from "./motion/AnimatedAuroraBackground";
import { MouseSpotlight } from "./motion/MouseSpotlight";
import { CountUpNumber } from "./motion/CountUpNumber";
import {
  logoSpringVariants,
  wordContainerVariants,
  wordChildVariants,
  fadeUpVariants,
  staggerContainerVariants,
  staggerCardVariants,
  floatingCardAnimation,
  neonPulseVariants,
  shimmerVariants
} from "./motion/animationVariants";

export const HeroSection: React.FC = () => {
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
    { title: "AI Fraud Detection", icon: Sparkles }
  ];

  const TICKER_ITEMS = [
    "⚡ Money Transfer ₹15,000 → HDFC Bank",
    "✓ UPI Success ₹500 → Merchant QR",
    "💳 Wallet Auto-Loaded ₹50,000",
    "🏦 AEPS Cash Withdrawal ₹10,000 → SBI",
    "✨ T+0 Settlement ₹2,50,000 → ICICI",
    "📄 BBPS Bill Paid ₹2,450 → TNEB Power",
    "🔐 Fraud Alert Blocked — AI Shield",
    "📱 UPI QR Payout ₹8,500 → Merchant"
  ];

  // Duplicate for seamless infinite scroll
  const TICKER_DOUBLED = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="relative w-full h-full bg-slate-950 text-white overflow-hidden flex flex-col justify-between select-none">

      {/* Background Effects */}
      <AnimatedAuroraBackground />
      <MouseSpotlight />

      {/* Inner layout with padding */}
      <div className="relative z-20 flex flex-col h-full justify-between p-4 xl:p-5 2xl:p-8">

        {/* ── Top Header ── */}
        <div className="flex items-center justify-between mb-2 2xl:mb-4">
          <div className="flex items-center gap-3 2xl:gap-4">
            <motion.div
              variants={logoSpringVariants}
              initial="hidden"
              animate="visible"
              className="w-9 h-9 2xl:w-12 2xl:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/30 shrink-0"
            >
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <span className="text-sm 2xl:text-lg font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  P2P
                </span>
              </div>
            </motion.div>
            <div>
              <h1 className="text-sm 2xl:text-lg font-extrabold tracking-tight text-white leading-tight">
                Pay2Pay Enterprise
              </h1>
              <p className="text-[10px] 2xl:text-xs font-semibold text-slate-400 mt-0.5">
                Retailer Authentication Portal
              </p>
            </div>
          </div>

          {/* AI Fraud Shield Badge */}
          <motion.div
            variants={neonPulseVariants}
            animate="animate"
            className="flex items-center gap-1.5 px-2.5 py-1 2xl:px-4 2xl:py-2 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-bold backdrop-blur-md shadow-lg shadow-emerald-500/10"
          >
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span className="hidden sm:inline">AI Fraud Shield</span>
            <span className="sm:hidden">AI Shield</span>
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </motion.div>
        </div>

        {/* ── Hero Main Content ── */}
        <div className="flex-1 flex flex-col justify-center py-1 2xl:py-4">

          {/* RBI Compliance Badge */}
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mb-2 2xl:mb-4"
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] 2xl:text-xs font-black uppercase tracking-wider backdrop-blur-md relative overflow-hidden">
              <motion.div
                variants={shimmerVariants}
                animate="animate"
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>RBI Compliant FinTech Infrastructure</span>
            </div>
          </motion.div>

          {/* Word-by-Word Heading */}
          <motion.div
            variants={wordContainerVariants}
            initial="hidden"
            animate="visible"
            className="mb-2 2xl:mb-4"
          >
            <div className="text-2xl xl:text-3xl 2xl:text-5xl font-black tracking-tight text-white leading-tight">
              <div className="overflow-hidden">
                {["Power", "Every"].map((word, i) => (
                  <motion.span key={i} variants={wordChildVariants} className="inline-block mr-2.5">
                    {word}
                  </motion.span>
                ))}
              </div>
              <div className="overflow-hidden">
                {["Retail", "Business"].map((word, i) => (
                  <motion.span
                    key={i}
                    variants={wordChildVariants}
                    className="inline-block mr-2.5 bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent"
                  >
                    {word}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="text-slate-300 text-sm xl:text-base 2xl:text-xl font-medium leading-relaxed mb-4 2xl:mb-6 max-w-lg 2xl:max-w-2xl"
          >
            Transfer Money · Accept UPI · AEPS Banking · BBPS · Wallet
            <span className="block text-slate-400 text-xs xl:text-sm 2xl:text-base font-normal mt-1">
              All from one secure enterprise workstation platform.
            </span>
          </motion.p>

          {/* Feature Cards Grid */}
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-2.5 2xl:gap-4 max-w-lg 2xl:max-w-3xl mb-4 2xl:mb-6"
          >
            {[
              {
                title: "Instant Money Transfer",
                subtitle: "₹25,000 DMT",
                badge: "✓ Instant",
                icon: Zap,
                color: "blue",
                delay: 0
              },
              {
                title: "Dynamic UPI 2.0",
                subtitle: "QR Accept",
                badge: "✓ 0% MDR",
                icon: QrCode,
                color: "purple",
                delay: 1.2
              },
              {
                title: "AEPS Micro-ATM",
                subtitle: "Biometric Cash",
                badge: "✓ Verified",
                icon: Smartphone,
                color: "emerald",
                delay: 0.6
              },
              {
                title: "Merchant Settlement",
                subtitle: "T+0 Payout",
                badge: "✓ 24x7",
                icon: TrendingUp,
                color: "cyan",
                delay: 1.8
              }
            ].map((card, idx) => {
              const IconComp = card.icon;
              const floatAnim = floatingCardAnimation(card.delay);
              const colorMap: Record<string, string> = {
                blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
                emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
              };

              return (
                <motion.div
                  key={idx}
                  variants={staggerCardVariants}
                  animate={shouldReduceMotion ? undefined : floatAnim}
                  whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
                  onMouseMove={(e) => handleCardMouseMove(e, idx)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="relative p-3 2xl:p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl flex items-center gap-3 shadow-lg group overflow-hidden hover:border-blue-500/40 hover:shadow-blue-500/10 transition-all cursor-default"
                >
                  {/* Mouse spotlight glow */}
                  {hoveredCard === idx && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(180px circle at ${mousePos.x}px ${mousePos.y}px, rgba(59,130,246,0.2), transparent 80%)`
                      }}
                    />
                  )}
                  <div className={`w-9 h-9 2xl:w-11 2xl:h-11 rounded-xl flex items-center justify-center shrink-0 border ${colorMap[card.color]}`}>
                    <IconComp className="w-4 h-4 2xl:w-5 2xl:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] 2xl:text-xs font-semibold text-slate-400 truncate">{card.title}</p>
                    <p className="text-xs 2xl:text-sm font-extrabold text-white truncate">
                      {card.subtitle}{" "}
                      <span className="text-emerald-400 text-[9px] 2xl:text-xs font-extrabold">{card.badge}</span>
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Benefits Pills */}
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap gap-1.5 2xl:gap-2 max-w-lg 2xl:max-w-3xl"
          >
            {BENEFITS.map((b) => {
              const IconComponent = b.icon;
              return (
                <motion.div
                  key={b.title}
                  variants={staggerCardVariants}
                  whileHover={{ scale: 1.04 }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 2xl:px-3 2xl:py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 text-[10px] 2xl:text-xs font-semibold hover:border-blue-500/30 hover:text-white transition-all cursor-default"
                >
                  <IconComponent className="w-3 h-3 text-blue-400 shrink-0" />
                  <span>{b.title}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* ── Bottom Stats & Ticker ── */}
        <div className="pt-4 2xl:pt-6 border-t border-slate-800/60">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 2xl:gap-6 mb-3 2xl:mb-4">
            {[
              { value: <CountUpNumber target={50000} suffix="+" duration={2.2} />, label: "Active Retailers", color: "text-white" },
              { value: <CountUpNumber target={5000} prefix="₹" suffix=" Cr+" duration={2.4} />, label: "Transactions", color: "text-white" },
              { value: <CountUpNumber target={99.99} decimals={2} suffix="%" duration={2} />, label: "Success Rate", color: "text-emerald-400" },
              { value: "24x7", label: "Support", color: "text-cyan-400" }
            ].map((stat, i) => (
              <div key={i}>
                <p className={`text-lg xl:text-xl 2xl:text-3xl font-black leading-tight ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-[9px] 2xl:text-xs font-semibold text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Live Ticker — seamless infinite scroll via CSS animation */}
          <div className="overflow-hidden rounded-xl bg-blue-950/40 border border-blue-900/40 py-2 2xl:py-2.5 backdrop-blur-md">
            <div className="flex items-center">
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, duration: 28, ease: "linear" }}
                className="flex items-center gap-8 2xl:gap-12 whitespace-nowrap text-[10px] 2xl:text-xs font-bold text-blue-300 px-4"
              >
                {TICKER_DOUBLED.map((item, idx) => (
                  <span key={idx} className="flex items-center gap-2 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
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
