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
  Sparkles
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

  // Mouse hover follow light effect per card
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCard(idx);
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
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
    "⚡ Money Transfer Completed ₹15,000 → HDFC Bank",
    "✓ UPI Success ₹500 → Merchant QR",
    "💳 Merchant Wallet Auto-Loaded ₹50,000",
    "🏦 AEPS Cash Withdrawal ₹10,000 → SBI",
    "✨ T+0 Settlement Completed ₹2,50,000 → ICICI",
    "📄 BBPS Bill Paid ₹2,450 → TNEB Power"
  ];

  return (
    <div className="relative w-full h-full bg-slate-950 text-white overflow-hidden flex flex-col justify-between p-4 xl:p-6 2xl:p-10 select-none">
      {/* 1. Background Aurora & Desktop Cursor Spotlight */}
      <AnimatedAuroraBackground />
      <MouseSpotlight />

      {/* 2. Top Header Logo & Neon Pulsing Badges */}
      <div className="relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5 2xl:gap-4">
          <motion.div
            variants={logoSpringVariants}
            initial="hidden"
            animate="visible"
            className="w-9 h-9 2xl:w-12 2xl:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/25"
          >
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="text-base 2xl:text-xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                P2P
              </span>
            </div>
          </motion.div>
          <div>
            <h1 className="text-base 2xl:text-xl font-extrabold tracking-tight text-white">
              Pay2Pay Enterprise
            </h1>
            <p className="text-[11px] 2xl:text-xs font-semibold text-slate-400">
              Retailer Authentication Portal
            </p>
          </div>
        </div>

        {/* AI Fraud Shield Badge (Neon Pulse every 6s) */}
        <motion.div
          variants={neonPulseVariants}
          animate="animate"
          className="flex items-center gap-1.5 px-3 py-1 2xl:px-4 2xl:py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-[11px] 2xl:text-xs font-bold backdrop-blur-md shadow-lg shadow-emerald-500/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>AI Fraud Shield Active</span>
        </motion.div>
      </div>

      {/* 3. Center Hero Main Content */}
      <div className="relative z-20 my-auto py-1 2xl:py-4 flex flex-col justify-center">
        
        {/* RBI Badge with Shimmer Effect */}
        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="mb-1.5 2xl:mb-3"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] 2xl:text-xs font-black uppercase tracking-wider backdrop-blur-md relative overflow-hidden">
            <motion.div
              variants={shimmerVariants}
              animate="animate"
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%] pointer-events-none"
            />
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>RBI Compliant FinTech Infrastructure</span>
          </div>
        </motion.div>

        {/* Word-by-Word Reveal Heading */}
        <motion.h2
          variants={wordContainerVariants}
          initial="hidden"
          animate="visible"
          className="text-2xl xl:text-4xl 2xl:text-6xl font-black tracking-tight text-white leading-tight mb-1.5 2xl:mb-3"
        >
          <div className="overflow-hidden inline-block">
            {["Power", "Every"].map((word, i) => (
              <motion.span
                key={i}
                variants={wordChildVariants}
                className="inline-block mr-2.5"
              >
                {word}
              </motion.span>
            ))}
          </div>
          <br />
          <div className="overflow-hidden inline-block">
            {["Retail", "Business"].map((word, i) => (
              <motion.span
                key={i}
                variants={wordChildVariants}
                className="inline-block mr-2.5 bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent animate-gradient-slow"
              >
                {word}
              </motion.span>
            ))}
          </div>
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-slate-300 text-xs xl:text-sm 2xl:text-xl max-w-xl 2xl:max-w-3xl font-medium leading-relaxed mb-2.5 2xl:mb-5"
        >
          Transfer Money · Accept UPI · AEPS Banking · BBPS · Wallet · Settlement
          <br />
          <span className="text-slate-400 text-[11px] xl:text-xs 2xl:text-base font-normal">
            All from one secure enterprise workstation platform.
          </span>
        </motion.p>

        {/* Floating FinTech Animated Cards Matrix */}
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-2.5 2xl:gap-4 max-w-xl 2xl:max-w-4xl"
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

            return (
              <motion.div
                key={idx}
                variants={staggerCardVariants}
                animate={shouldReduceMotion ? undefined : floatAnim}
                whileHover={{
                  scale: 1.03,
                  y: -4,
                  transition: { duration: 0.2, ease: "easeOut" }
                }}
                onMouseMove={(e) => handleCardMouseMove(e, idx)}
                onMouseLeave={() => setHoveredCard(null)}
                className="relative p-2.5 2xl:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center gap-3 shadow-lg transition-colors duration-200 group overflow-hidden hover:border-blue-500/50 hover:shadow-blue-500/10"
              >
                {/* Mouse Follow Radial Light Effect */}
                {hoveredCard === idx && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(200px circle at ${mousePos.x}px ${mousePos.y}px, rgba(59, 130, 246, 0.25), transparent 80%)`
                    }}
                  />
                )}

                <div className={`w-8 h-8 2xl:w-11 2xl:h-11 rounded-lg flex items-center justify-center font-bold shrink-0 shadow-md ${
                  card.color === "blue" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                  card.color === "purple" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                  card.color === "emerald" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                  "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                }`}>
                  <IconComp className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] 2xl:text-xs font-semibold text-slate-400 truncate">
                    {card.title}
                  </p>
                  <p className="text-xs 2xl:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                    {card.subtitle}
                    <span className="text-emerald-400 text-[9px] 2xl:text-xs font-extrabold">
                      {card.badge}
                    </span>
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Benefits Stagger Pills */}
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          className="mt-2.5 2xl:mt-4 flex flex-wrap gap-1 2xl:gap-2.5 max-w-xl 2xl:max-w-4xl"
        >
          {BENEFITS.map((b) => {
            const IconComponent = b.icon;
            return (
              <motion.div
                key={b.title}
                variants={staggerCardVariants}
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-1 px-2 py-0.5 2xl:px-3 2xl:py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 text-[10px] 2xl:text-xs font-semibold hover:border-blue-500/40 hover:text-white transition-all cursor-default shadow-xs"
              >
                <IconComponent className="w-3 h-3 text-blue-400" />
                <span>{b.title}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* 4. Bottom Live Stats & Ticker */}
      <div className="relative z-20 pt-2 2xl:pt-4 border-t border-slate-800/80">
        {/* Animated CountUp Stats Grid */}
        <div className="grid grid-cols-4 gap-2 2xl:gap-6 mb-2 2xl:mb-4">
          <div>
            <p className="text-base xl:text-lg 2xl:text-2xl font-black text-white">
              <CountUpNumber target={50000} suffix="+" duration={2.2} />
            </p>
            <p className="text-[9px] 2xl:text-xs font-semibold text-slate-400">
              Active Retailers
            </p>
          </div>
          <div>
            <p className="text-base xl:text-lg 2xl:text-2xl font-black text-white">
              <CountUpNumber target={5000} prefix="₹" suffix=" Cr+" duration={2.4} />
            </p>
            <p className="text-[9px] 2xl:text-xs font-semibold text-slate-400">
              Transactions
            </p>
          </div>
          <div>
            <p className="text-base xl:text-lg 2xl:text-2xl font-black text-emerald-400">
              <CountUpNumber target={99.99} decimals={2} suffix="%" duration={2} />
            </p>
            <p className="text-[9px] 2xl:text-xs font-semibold text-slate-400">
              Success Rate
            </p>
          </div>
          <div>
            <p className="text-base xl:text-lg 2xl:text-2xl font-black text-white">
              24x7
            </p>
            <p className="text-[9px] 2xl:text-xs font-semibold text-slate-400">
              Enterprise Support
            </p>
          </div>
        </div>

        {/* Live Infinite Scrolling Ticker */}
        <div className="overflow-hidden bg-blue-950/40 border border-blue-900/40 rounded-lg py-1 px-2.5 2xl:py-2 backdrop-blur-md">
          <motion.div
            animate={{ x: [0, -600] }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            className="flex items-center gap-6 2xl:gap-10 whitespace-nowrap text-[10px] 2xl:text-xs font-bold text-blue-300"
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
