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

interface HeroSectionProps {
  darkMode?: boolean;
  portalRole?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  darkMode = true,
  portalRole = "DISTRIBUTOR"
}) => {
  const shouldReduceMotion = useReducedMotion();

  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCard(idx);
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const BENEFITS = [
    { title: "Network Management", icon: Building2 },
    { title: "Instant Settlement", icon: Zap },
    { title: "MDR Commission", icon: TrendingUp },
    { title: "NPCI BBPS Hub", icon: ShieldCheck },
    { title: "UPI QR Network", icon: QrCode },
    { title: "AEPS Banking", icon: Smartphone },
    { title: "Distributor Wallet", icon: CreditCard },
    { title: "AI Risk Radar", icon: Sparkles }
  ];

  const TICKER_ITEMS = [
    "⚡ Commission Credited ₹45,200 → Main Wallet",
    "✓ Retailer Onboarded #RT-9876 → Active",
    "💳 Bulk Float Pool Loaded ₹5,00,000 → ICICI",
    "🏦 Instant Payout Settled ₹1,20,000 → SBI",
    "✨ T+0 MDR Commission Verified — Pay2Pay Hub",
    "📄 BBPS Commission Shared ₹12,450 → Distributor",
    "🔐 Security Shield Active — AI Risk Radar",
    "📱 Retailer Volume Alert ₹15,80,000 Today"
  ];

  // Duplicate for seamless infinite scroll
  const TICKER_DOUBLED = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className={`relative w-full h-full text-white overflow-hidden flex flex-col justify-between select-none transition-colors duration-300 ${
      darkMode ? "bg-slate-950" : "bg-[#0B1120]"
    }`}>

      {/* Background Effects */}
      <AnimatedAuroraBackground />
      <MouseSpotlight />

      {/* Inner layout with padding */}
      <div className="relative z-20 flex flex-col h-full p-5 xl:p-7 2xl:p-10">

        {/* ── Top Header ── */}
        <div className="flex items-center justify-between mb-4 2xl:mb-6">
          <div className="flex items-center gap-3 2xl:gap-4">
            <motion.div
              variants={logoSpringVariants}
              initial="hidden"
              animate="visible"
              className="w-10 h-10 2xl:w-13 2xl:h-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 shrink-0"
            >
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <span className="text-base 2xl:text-xl font-black tracking-tighter bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                  P2P
                </span>
              </div>
            </motion.div>
            <div>
              <h1 className="text-base 2xl:text-xl font-extrabold tracking-tight text-white leading-tight">
                Pay2Pay Distributor Enterprise
              </h1>
              <p className="text-[11px] 2xl:text-xs font-semibold text-amber-400/90 mt-0.5">
                Distributor Operations & Management Portal
              </p>
            </div>
          </div>

          {/* AI Fraud Shield Badge */}
          <motion.div
            variants={neonPulseVariants}
            animate="animate"
            className="flex items-center gap-1.5 px-3 py-1.5 2xl:px-4 2xl:py-2 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-bold backdrop-blur-md shadow-lg shadow-amber-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span className="hidden sm:inline">Enterprise Shield</span>
            <span className="sm:hidden">Shield</span>
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          </motion.div>
        </div>

        {/* ── Hero Main Content ── */}
        <div className="flex-1 flex flex-col justify-center py-2 2xl:py-6">

          {/* RBI Compliance Badge */}
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mb-3 2xl:mb-5"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] 2xl:text-xs font-black uppercase tracking-wider backdrop-blur-md relative overflow-hidden">
              <motion.div
                variants={shimmerVariants}
                animate="animate"
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>RBI Compliant Financial Infrastructure</span>
            </div>
          </motion.div>

          {/* Word-by-Word Heading */}
          <motion.div
            variants={wordContainerVariants}
            initial="hidden"
            animate="visible"
            className="mb-3 2xl:mb-5"
          >
            <div className="text-3xl xl:text-4xl 2xl:text-6xl font-black tracking-tight text-white leading-tight">
              <div className="overflow-hidden">
                {["Manage", "Your"].map((word, i) => (
                  <motion.span key={i} variants={wordChildVariants} className="inline-block mr-3">
                    {word}
                  </motion.span>
                ))}
              </div>
              <div className="overflow-hidden">
                {["Distributor", "Network"].map((word, i) => (
                  <motion.span
                    key={i}
                    variants={wordChildVariants}
                    className="inline-block mr-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent"
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
            Map Retailers · MDR Commission · Float Management · T+0 Settlement
            <span className="block text-slate-400 text-xs xl:text-sm 2xl:text-base font-normal mt-1">
              Centralized enterprise workstation to empower your distribution network.
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
