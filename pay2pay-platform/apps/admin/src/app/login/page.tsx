"use client";

import React, { useState } from "react";
import { AuthPanel } from "@/components/auth/AuthPanel";
import {
  Shield,
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  Lock,
  Layers,
  Activity,
  CheckCircle2,
  Cpu,
  ArrowRightLeft,
  Sparkles,
  Server,
  KeyRound,
  FileCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const [activeSignal, setActiveSignal] = useState<number>(0);

  return (
    <main className="min-h-[100svh] w-full bg-[#050A15] text-[#F8FAFC] flex flex-col lg:flex-row overflow-x-hidden relative select-none">
      {/* ── Background Enterprise Ambience & Grid ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Deep ambient radial glow orbs */}
        <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-blue-700/15 via-cyan-600/10 to-transparent blur-[120px]" />
        <div className="absolute top-[40%] left-[25%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-indigo-700/10 via-purple-600/10 to-transparent blur-[140px]" />
        <div className="absolute -bottom-[20%] right-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tl from-cyan-600/10 via-blue-900/15 to-transparent blur-[130px]" />

        {/* High-tech matrix dot/grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #93C5FD 1px, transparent 0)`,
            backgroundSize: "clamp(24px, 2vw, 40px) clamp(24px, 2vw, 40px)",
          }}
        />

        {/* Subtle diagonal structural glow line */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))]" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL: Enterprise Operations, Brand & Network Ecosystem (56-60%)
         ───────────────────────────────────────────────────────────── */}
      <section
        className="w-full lg:w-[56%] xl:w-[58%] 2xl:w-[60%] flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-10 xl:p-14 2xl:p-20 relative z-10 border-b lg:border-b-0 lg:border-r border-slate-800/60"
        style={{
          paddingTop: "clamp(1.5rem, 3.5vw, 4.5rem)",
          paddingBottom: "clamp(1.5rem, 3.5vw, 4.5rem)",
          paddingLeft: "clamp(1.5rem, 4vw, 5.5rem)",
          paddingRight: "clamp(1.5rem, 4vw, 5rem)",
        }}
      >
        {/* ── 1. Top Enterprise Brand & Positioning ── */}
        <div className="space-y-3 2xl:space-y-4">
          {/* Platform Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            <span className="text-[11px] 2xl:text-[13px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Pay2Pay Enterprise Platform
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[10px] 2xl:text-[12px] font-bold text-slate-400">
              v2.8 Production Architecture
            </span>
          </div>

          {/* Company Title */}
          <div className="space-y-1 2xl:space-y-2">
            <h1
              className="font-black tracking-tight text-white leading-[1.08]"
              style={{ fontSize: "clamp(1.85rem, 2.8vw, 4rem)" }}
            >
              PAY2PAY{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                COMPANY ADMIN
              </span>
            </h1>

            <p
              className="font-semibold text-cyan-300/90 tracking-wide"
              style={{ fontSize: "clamp(1.05rem, 1.35vw, 1.85rem)" }}
            >
              Enterprise Operations & Security Platform
            </p>
          </div>

          {/* Mission statement */}
          <p
            className="text-slate-400 font-normal leading-relaxed max-w-2xl"
            style={{ fontSize: "clamp(0.85rem, 0.92vw, 1.2rem)" }}
          >
            Manage multi-tier tenants, verification pipelines, partner lifecycle,
            financial reconciliation, and platform security controls from a unified,
            RBI-compliant enterprise workspace.
          </p>
        </div>

        {/* ── 2. Center: Fintech & Security Network Ecosystem Visualization ── */}
        <div className="my-6 lg:my-8 2xl:my-12 w-full relative flex items-center justify-center">
          <div className="w-full max-w-2xl xl:max-w-3xl 2xl:max-w-4xl aspect-[16/10] sm:aspect-[16/9] relative rounded-3xl bg-gradient-to-b from-slate-900/60 via-slate-950/80 to-[#050A15]/90 border border-slate-800/80 p-4 sm:p-6 lg:p-8 shadow-2xl backdrop-blur-xl overflow-hidden group">
            {/* Ambient inner glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Specular Top Glow Line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            {/* Header / Network Status Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-slate-300 tracking-wider text-[11px] 2xl:text-xs uppercase">
                  Ecosystem Topology
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] 2xl:text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                  256-Bit TLS Active
                </span>
                <span className="text-[10px] 2xl:text-[11px] px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold">
                  Zero Trust RBAC
                </span>
              </div>
            </div>

            {/* SVG Interactive Topology Diagram */}
            <div className="relative w-full h-[calc(100%-2.25rem)] pt-2 flex items-center justify-center">
              <svg
                viewBox="0 0 800 460"
                className="w-full h-full object-contain overflow-visible"
                style={{ filter: "drop-shadow(0 0 20px rgba(14, 165, 233, 0.15))" }}
              >
                <defs>
                  {/* Gradients for flow lines */}
                  <linearGradient id="grad-core-bank" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                  <linearGradient id="grad-core-retailer" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="grad-core-dist" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                  <linearGradient id="grad-bank-tx" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <linearGradient id="grad-retailer-tx" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <linearGradient id="grad-dist-tx" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>

                  {/* Pulsing glow filter */}
                  <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* ── Connecting Pathways (Curved Geometric Network Lines) ── */}
                <g className="stroke-slate-700/60" strokeWidth="2" fill="none">
                  {/* Core -> Bank (Vertical Center) */}
                  <path d="M 400 90 L 400 230" stroke="url(#grad-core-bank)" strokeWidth="2.5" />

                  {/* Core -> Retailer (Top Left Diagonal) */}
                  <path d="M 370 85 C 260 110, 190 150, 160 220" stroke="url(#grad-core-retailer)" strokeWidth="2.5" />

                  {/* Core -> Distributor (Top Right Diagonal) */}
                  <path d="M 430 85 C 540 110, 610 150, 640 220" stroke="url(#grad-core-dist)" strokeWidth="2.5" />

                  {/* Retailer -> Bank (Horizontal Left) */}
                  <path d="M 190 235 L 350 235" stroke="#334155" strokeDasharray="4 4" />

                  {/* Bank -> Distributor (Horizontal Right) */}
                  <path d="M 450 235 L 610 235" stroke="#334155" strokeDasharray="4 4" />

                  {/* Retailer -> Transaction (Bottom Left Diagonal) */}
                  <path d="M 160 255 C 190 325, 260 365, 370 390" stroke="url(#grad-retailer-tx)" strokeWidth="2.5" />

                  {/* Bank -> Transaction (Vertical Center Bottom) */}
                  <path d="M 400 245 L 400 380" stroke="url(#grad-bank-tx)" strokeWidth="2.5" />

                  {/* Distributor -> Transaction (Bottom Right Diagonal) */}
                  <path d="M 640 255 C 610 325, 540 365, 430 390" stroke="url(#grad-dist-tx)" strokeWidth="2.5" />
                </g>

                {/* ── Animated Data Particles (Pure CSS / SVG Dash Motion) ── */}
                <g fill="none" strokeWidth="3">
                  <path
                    d="M 400 90 L 400 230"
                    stroke="#38BDF8"
                    strokeDasharray="8 80"
                    className="animate-flow-vertical"
                  />
                  <path
                    d="M 370 85 C 260 110, 190 150, 160 220"
                    stroke="#60A5FA"
                    strokeDasharray="8 90"
                    className="animate-flow-diagonal"
                  />
                  <path
                    d="M 430 85 C 540 110, 610 150, 640 220"
                    stroke="#A855F7"
                    strokeDasharray="8 90"
                    className="animate-flow-diagonal-rev"
                  />
                  <path
                    d="M 400 245 L 400 380"
                    stroke="#F59E0B"
                    strokeDasharray="8 80"
                    className="animate-flow-vertical"
                  />
                </g>

                {/* ── NODE 1: PAY2PAY CORE (TOP CENTER) ── */}
                <g transform="translate(400, 70)" className="cursor-default">
                  {/* Outer Pulsing Aura Ring */}
                  <circle r="36" fill="none" stroke="#0284C7" strokeWidth="1" opacity="0.4" className="animate-ping" />
                  <circle r="30" fill="#0B132B" stroke="#38BDF8" strokeWidth="2.5" filter="url(#glow-cyan)" />
                  <circle r="14" fill="#0284C7" />
                  <circle r="6" fill="#F8FAFC" />
                  <text x="0" y="-38" textAnchor="middle" fill="#38BDF8" fontSize="13" fontWeight="900" letterSpacing="1.5">
                    PAY2PAY CORE
                  </text>
                  <text x="0" y="-24" textAnchor="middle" fill="#94A3B8" fontSize="9" fontWeight="700">
                    MASTER GOVERNANCE
                  </text>
                </g>

                {/* ── NODE 2: RETAILER (MIDDLE LEFT) ── */}
                <g transform="translate(145, 235)" className="cursor-default">
                  <circle r="26" fill="#0B132B" stroke="#60A5FA" strokeWidth="2" />
                  <circle r="10" fill="#2563EB" />
                  <text x="0" y="44" textAnchor="middle" fill="#93C5FD" fontSize="12" fontWeight="800">
                    RETAILER
                  </text>
                  <text x="0" y="56" textAnchor="middle" fill="#64748B" fontSize="8.5" fontWeight="600">
                    POS & WORKSTATION
                  </text>
                </g>

                {/* ── NODE 3: BANK / NPCI (CENTER) ── */}
                <g transform="translate(400, 235)" className="cursor-default">
                  <circle r="28" fill="#051D14" stroke="#10B981" strokeWidth="2" />
                  <circle r="12" fill="#059669" />
                  <text x="0" y="44" textAnchor="middle" fill="#6EE7B7" fontSize="12" fontWeight="800">
                    BANK / CLEARING
                  </text>
                  <text x="0" y="56" textAnchor="middle" fill="#64748B" fontSize="8.5" fontWeight="600">
                    NPCI · IMPS · AEPS
                  </text>
                </g>

                {/* ── NODE 4: DISTRIBUTOR (MIDDLE RIGHT) ── */}
                <g transform="translate(655, 235)" className="cursor-default">
                  <circle r="26" fill="#180B2B" stroke="#A855F7" strokeWidth="2" />
                  <circle r="10" fill="#7C3AED" />
                  <text x="0" y="44" textAnchor="middle" fill="#D8B4FE" fontSize="12" fontWeight="800">
                    DISTRIBUTOR
                  </text>
                  <text x="0" y="56" textAnchor="middle" fill="#64748B" fontSize="8.5" fontWeight="600">
                    CHANNEL HIERARCHY
                  </text>
                </g>

                {/* ── NODE 5: TRANSACTION / SETTLEMENT (BOTTOM CENTER) ── */}
                <g transform="translate(400, 400)" className="cursor-default">
                  <circle r="26" fill="#1F1303" stroke="#F59E0B" strokeWidth="2.5" filter="url(#glow-gold)" />
                  <circle r="11" fill="#D97706" />
                  <text x="0" y="42" textAnchor="middle" fill="#FCD34D" fontSize="12" fontWeight="800">
                    TRANSACTION LEDGER
                  </text>
                  <text x="0" y="54" textAnchor="middle" fill="#64748B" fontSize="8.5" fontWeight="600">
                    REAL-TIME SETTLEMENT
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* ── 3. Bottom: 4 Product Capabilities + Static Security Indicator ── */}
        <div className="space-y-5 2xl:space-y-6">
          {/* 4 Capabilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 2xl:gap-4">
            {/* Card 1: Tenant Management */}
            <div className="p-3.5 2xl:p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/40 transition-all backdrop-blur-md group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 2xl:w-10 2xl:h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 2xl:w-5 2xl:h-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-xs 2xl:text-sm font-extrabold text-white tracking-wide">
                    TENANT MANAGEMENT
                  </h4>
                  <p className="text-[11px] 2xl:text-xs text-slate-400 mt-0.5">
                    Retailer, SD & Distributor lifecycle controls
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Verification */}
            <div className="p-3.5 2xl:p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-blue-500/40 transition-all backdrop-blur-md group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 2xl:w-10 2xl:h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4 2xl:w-5 2xl:h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs 2xl:text-sm font-extrabold text-white tracking-wide">
                    VERIFICATION
                  </h4>
                  <p className="text-[11px] 2xl:text-xs text-slate-400 mt-0.5">
                    KYC, biometric & compliance approvals
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Financial Control */}
            <div className="p-3.5 2xl:p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-amber-500/40 transition-all backdrop-blur-md group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 2xl:w-10 2xl:h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 2xl:w-5 2xl:h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs 2xl:text-sm font-extrabold text-white tracking-wide">
                    FINANCIAL CONTROL
                  </h4>
                  <p className="text-[11px] 2xl:text-xs text-slate-400 mt-0.5">
                    Settlement, wallet ledger & payout limits
                  </p>
                </div>
              </div>
            </div>

            {/* Card 4: Security */}
            <div className="p-3.5 2xl:p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 transition-all backdrop-blur-md group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 2xl:w-10 2xl:h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 2xl:w-5 2xl:h-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs 2xl:text-sm font-extrabold text-white tracking-wide">
                    SECURITY
                  </h4>
                  <p className="text-[11px] 2xl:text-xs text-slate-400 mt-0.5">
                    Enterprise RBAC, audit trails & session controls
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Static Product Security Indicators Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 2xl:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/70 text-xs font-semibold">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-extrabold uppercase tracking-wider text-[11px] 2xl:text-xs">
                SYSTEM SECURE
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-300 text-[11px] 2xl:text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Identity Protected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Tenant Access Controlled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Financials Governed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Audit Enabled
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: Vertically-Centered Enterprise Login Card (40-44%)
         ───────────────────────────────────────────────────────────── */}
      <section
        className="w-full lg:w-[44%] xl:w-[42%] 2xl:w-[40%] flex flex-col justify-center items-center p-4 sm:p-8 md:p-12 lg:p-8 xl:p-12 2xl:p-16 relative z-10 bg-gradient-to-b from-[#080E1E]/90 via-[#060B18]/95 to-[#040812] backdrop-blur-2xl"
        style={{
          minHeight: "100svh",
        }}
      >
        {/* Subtle right-side ambient accent glow */}
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── Admin Login Card Container (Centered in Right Panel, Responsive Width) ── */}
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-[520px] xl:max-w-[580px] 2xl:max-w-[640px] 3xl:max-w-[700px] my-auto">
          {/* Top Security Header for Login Section */}
          <div className="mb-4 text-center hidden sm:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Authentication Gateway</span>
            </div>
          </div>

          {/* Embedded AuthPanel with Full Authentication Capabilities */}
          <AuthPanel
            portalRole="ADMIN"
            embedded={true}
            className="w-full"
          />
        </div>

        {/* ── Enterprise Footer / Legal ── */}
        <footer className="w-full mt-6 text-center text-[11px] 2xl:text-xs text-slate-500 space-y-1">
          <p>© 2026 Pay2Pay Financial Technologies Ltd. All rights reserved.</p>
          <p className="text-slate-600 text-[10px]">
            Restricted System · Unauthorized access attempts are monitored and logged.
          </p>
        </footer>
      </section>

      {/* ── CSS Styles for GPU-accelerated flow animations & reduced-motion ── */}
      <style jsx global>{`
        @keyframes flowVertical {
          0% {
            stroke-dashoffset: 88;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes flowDiagonal {
          0% {
            stroke-dashoffset: 98;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes flowDiagonalRev {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 98;
          }
        }

        .animate-flow-vertical {
          animation: flowVertical 2.2s linear infinite;
        }
        .animate-flow-diagonal {
          animation: flowDiagonal 2.8s linear infinite;
        }
        .animate-flow-diagonal-rev {
          animation: flowDiagonalRev 2.8s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-flow-vertical,
          .animate-flow-diagonal,
          .animate-flow-diagonal-rev,
          .animate-ping,
          .animate-pulse {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
