"use client";

import React from "react";
import Link from "next/link";
import {
  UserCheck,
  Store,
  Users,
  Network,
  Layers,
  Cpu,
  Landmark,
  CheckCircle2,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  Zap,
  Award,
  LucideIcon,
} from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";
import { EcosystemCanvas } from "@/components/hero/EcosystemCanvas";

const iconMap: Record<string, LucideIcon> = {
  UserCheck,
  Store,
  Users,
  Network,
  Layers,
  Cpu,
  Landmark,
};

const ecosystemDetails = [
  {
    step: "01",
    role: "End Customer",
    title: "Neighborhood Walk-in Customers",
    desc: "Customers access assisted digital financial and bill payment services through authorized Pay2Pay retail counters in their local neighborhoods without visiting distant bank branches.",
    icon: UserCheck,
    responsibilities: [
      "Access instant cash withdrawal via AEPS biometric auth",
      "Domestic Money Transfers (DMT) to any bank in India",
      "Instant payment of utility bills with digital receipt",
      "New PAN card applications and mobile top-ups",
    ],
  },
  {
    step: "02",
    role: "Retailer (Merchant)",
    title: "Counter-Service Point of Sale Operator",
    desc: "Retail merchants and local shop owners operate the Pay2Pay Retailer Workstation, earning attractive commissions on every processed transaction with instant virtual wallet crediting.",
    icon: Store,
    responsibilities: [
      "Execute customer transactions with biometric verification",
      "Manage counter cash float and digital wallet balances",
      "Issue branded printed tax receipts and SMS confirmations",
      "Real-time ledger access and instant margin settlement",
    ],
  },
  {
    step: "03",
    role: "Distributor",
    title: "Retailer Network Manager",
    desc: "Authorized distributors onboard, verify, and mentor a network of retail merchants across their designated territory, providing liquidity support and operational guidance.",
    icon: Users,
    responsibilities: [
      "Onboard new retail partners with paperless KYC",
      "Allocate virtual wallet liquidity to retailers",
      "Monitor agent performance and transaction velocity",
      "Earn overriding distribution revenue on network volume",
    ],
  },
  {
    step: "04",
    role: "Super Distributor",
    title: "Master Franchise Regional Hub",
    desc: "Super Distributors manage multi-tier regional networks comprising distributors and retail agents across broad geographical zones, overseeing liquidity allocation and territory growth.",
    icon: Network,
    responsibilities: [
      "Oversee multi-tier distributor hierarchy across zones",
      "Bulk capital allocation and credit balance management",
      "Territory volume analytics and growth planning",
      "Receive master franchise revenue settlements",
    ],
  },
  {
    step: "05",
    role: "DIT",
    title: "Technical Facilitation & Diagnostics",
    desc: "DIT partners access technical network facilitation, integration diagnostics, and operational health telemetry across gateway endpoints.",
    icon: Layers,
    responsibilities: [
      "Technical gateway connectivity facilitation",
      "Service latency telemetry and endpoint verification",
      "Integration diagnostics and API health checks",
      "Operational troubleshooting support",
    ],
  },
  {
    step: "06",
    role: "Pay2Pay Core Platform",
    title: "Transaction Orchestration & Ledger Engine",
    desc: "Pay2Pay Core serves as the central high-speed processing engine, responsible for intelligent multi-rail routing, double-entry ledger bookkeeping, compliance monitoring, and automated reconciliation.",
    icon: Cpu,
    responsibilities: [
      "Intelligent multi-switch transaction routing",
      "Sub-second clearance with failover protection",
      "Double-entry cryptographic ledger reconciliation",
      "Risk velocity rules and automated fraud screening",
    ],
  },
  {
    step: "07",
    role: "Banking & Service Partners",
    title: "Regulated Settlement Rails & Billers",
    desc: "Authorized sponsor banks, NPCI (National Payments Corporation of India), and Bharat Bill Payment System (BBPS) clearing houses execute final interbank settlements.",
    icon: Landmark,
    responsibilities: [
      "Interbank IMPS / NEFT / RTGS settlement rails",
      "NPCI Aadhaar biometric authentication switch",
      "BBPS central utility clearing network",
      "Statutory compliance and settlement guarantees",
    ],
  },
];

export default function EcosystemPage() {
  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* 1. Page Header */}
        <Pay2PayPageHeader
          eyebrow="Partner Ecosystem"
          titlePrefix="Connected"
          highlightedTitle="7-Stage Multi-Tier"
          titleSuffix="Ecosystem"
          description="A connected multi-tier partner ecosystem designed to support secure digital financial service operations and transparent value distribution across India."
        />

        {/* 2. Interactive Ecosystem Canvas Visualization */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border-slate-700/60 mb-16 2xl:mb-24 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Zap size={14} />
                <span>Interconnected Mesh</span>
              </div>
              <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold text-white leading-tight">
                Seamless Flow from Walk-in Customer to Core Banking Rails
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Pay2Pay synchronizes all ecosystem participants in real-time. Every transaction initiated at a retailer counter flows through multi-rail switches, verified instantly, with commissions distributed throughout the hierarchy automatically.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href="/workspaces"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/25"
                >
                  <span>Select Your Workspace</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
                >
                  <span>Operational Flow →</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 w-full flex items-center justify-center">
              <EcosystemCanvas />
            </div>
          </div>
        </div>

        {/* 3. Detailed Step-by-Step Hierarchy Breakdown */}
        <div className="mb-16 2xl:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold text-white tracking-tight mb-4">
              Roles & Responsibilities Across the Network
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Each participant plays a well-defined role with dedicated tooling, role-segregated security, and automated commission accounting.
            </p>
          </div>

          <div className="space-y-6">
            {ecosystemDetails.map((tier, idx) => {
              const IconComp = tier.icon;
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={tier.step}
                  className="glass-panel p-6 sm:p-8 rounded-3xl border-slate-800 hover:border-blue-500/40 transition-all shadow-xl"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Tier Header */}
                    <div className="lg:col-span-4 flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/10 p-3">
                        <IconComp size={26} />
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                          Tier {tier.step} • {tier.role}
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                          {tier.title}
                        </h3>
                      </div>
                    </div>

                    {/* Tier Description */}
                    <div className="lg:col-span-4">
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                        {tier.desc}
                      </p>
                    </div>

                    {/* Tier Checklist */}
                    <div className="lg:col-span-4 space-y-2 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-4 lg:pt-0 lg:pl-6">
                      {tier.responsibilities.map((resp, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                          <CheckCircle2 size={13} className="text-blue-400 shrink-0" />
                          <span>{resp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Value Proposition Highlights */}
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border-slate-800 mb-16 2xl:mb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg shrink-0">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-white text-base mb-1">Paperless Digital KYC</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fast merchant onboarding with automated Aadhaar OTP and PAN validation. Approvals completed within 24 hours.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg shrink-0">
                ⚡
              </div>
              <div>
                <h4 className="font-bold text-white text-base mb-1">Dedicated Virtual Accounts</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automatic 24x7 wallet top-ups via individual virtual account numbers (NEFT/RTGS/IMPS/UPI) with zero manual delay.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg shrink-0">
                🛡
              </div>
              <div>
                <h4 className="font-bold text-white text-base mb-1">Designated RM & Helpdesk</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Assigned Relationship Manager, dedicated toll-free helpline, and WhatsApp support desk for rapid dispute resolution.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Call to Action */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-slate-900/60 border border-blue-500/30 text-center shadow-2xl">
          <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-black text-white mb-4">
            Become a Part of the Pay2Pay Ecosystem
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
            Whether you run a local retail counter or manage a multi-state distribution franchise, Pay2Pay provides the technology and liquidity tools you need to succeed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/workspaces"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-blue-500/30 hover:brightness-110 active:scale-95 transition-all"
            >
              Access Partner Workspaces →
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm hover:border-slate-500 transition-all"
            >
              Partner Onboarding Inquiry
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
