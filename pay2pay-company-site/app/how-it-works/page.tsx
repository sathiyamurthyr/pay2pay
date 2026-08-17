import type { Metadata } from "next";
import Link from "next/link";
import {
  FilePlus,
  FileCheck,
  UserCheck2,
  Wallet2,
  SlidersHorizontal,
  CreditCard,
  RefreshCw,
  Receipt,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
} from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const metadata: Metadata = {
  title: "How It Works | Pay2Pay Enterprise Digital Financial Services",
  description:
    "Explore the complete 8-step operational flow of Pay2Pay — from partner registration and paperless KYC to real-time transaction processing and instant commission settlement.",
};

const fullWorkflowSteps = [
  {
    number: "01",
    phase: "Registration",
    title: "Partner Registration",
    summary: "Prospective retail and distribution partners submit their initial application through our digital onboarding portal.",
    details: [
      "Submit mobile number and basic business profile details",
      "Select partner role (Retailer, Distributor, Super Distributor)",
      "Provide shop / store establishment address",
      "Instant SMS OTP verification to initiate application",
    ],
    icon: FilePlus,
    badge: "Step 01",
  },
  {
    number: "02",
    phase: "Verification",
    title: "Paperless KYC & Verification",
    summary: "Automated identity verification validates statutory documents in accordance with regulatory banking norms.",
    details: [
      "PAN card verification with automated name-matching",
      "Aadhaar e-KYC validation via secure OTP",
      "Bank account validation via automated penny-drop verification",
      "Shop geolocation and storefront photograph capture",
    ],
    icon: FileCheck,
    badge: "Step 02",
  },
  {
    number: "03",
    phase: "Approval",
    title: "Admin Verification & Approval",
    summary: "Pay2Pay compliance team reviews submitted KYC artifacts and verifies distributor hierarchy assignments.",
    details: [
      "Document authenticity checks against statutory databases",
      "Territory and distributor mapping verification",
      "Risk assessment and operational cap assignment",
      "Account activated within 24 hours of successful submission",
    ],
    icon: UserCheck2,
    badge: "Step 03",
  },
  {
    number: "04",
    phase: "Activation",
    title: "Virtual Account & Workspace Activation",
    summary: "A dedicated virtual account is generated automatically for 24x7 automated wallet funding.",
    details: [
      "Unique Virtual Account Number (VAN) issued per partner",
      "Instant 24x7 auto wallet top-up via IMPS, NEFT, RTGS, and UPI",
      "Secure login credentials and 6-digit MPIN configured",
      "Full access to the web workstation and mobile portal",
    ],
    icon: Wallet2,
    badge: "Step 04",
  },
  {
    number: "05",
    phase: "Setup",
    title: "Service Access & Hardware Pairing",
    summary: "Connect biometric scanners and micro-ATMs to enable high-throughput counter banking services.",
    details: [
      "Plug-and-play RD Service biometric driver support (Mantra, Morpho, Startek)",
      "Bluetooth micro-ATM terminal pairing for debit card cash withdrawals",
      "Activation of Domestic Money Transfer (DMT) beneficiary rails",
      "Activation of 50+ Bharat Bill Payment System (BBPS) utility billers",
    ],
    icon: SlidersHorizontal,
    badge: "Step 05",
  },
  {
    number: "06",
    phase: "Operation",
    title: "Customer Transaction Initiation",
    summary: "Walk-in customers visit the retail counter to perform assisted banking and payment operations.",
    details: [
      "Customer provides mobile number, bank, and transaction details",
      "Biometric fingerprint or OTP authentication performed for cash services",
      "Instant bill fetch and dynamic verification for utility collections",
      "Real-time validation prevents double-debiting or stale requests",
    ],
    icon: CreditCard,
    badge: "Step 06",
  },
  {
    number: "07",
    phase: "Processing",
    title: "Multi-Rail Processing & Verification",
    summary: "Pay2Pay Core intelligent routing engine clears the transaction across authorized sponsor banks.",
    details: [
      "Dynamic multi-switch routing selects the lowest-latency banking rail",
      "Sub-second clearance with instant UTR (Unique Transaction Reference)",
      "Automated fallback routing protects against upstream switch downtime",
      "End-to-end TLS 1.3 payload encryption and anti-tamper signing",
    ],
    icon: RefreshCw,
    badge: "Step 07",
  },
  {
    number: "08",
    phase: "Settlement",
    title: "Instant Settlement & Reconciliation",
    summary: "Commission is instantly credited to the partner wallet with complete audit logging and ledger updates.",
    details: [
      "Instant commission credit to partner wallet upon success",
      "Double-entry cryptographic ledger reconciliation",
      "Printable digital tax invoice and SMS confirmation issued to customer",
      "Seamless daily wallet-to-bank settlement withdrawal available 24x7",
    ],
    icon: Receipt,
    badge: "Step 08",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* 1. Page Header */}
        <Pay2PayPageHeader
          eyebrow="Operational Lifecycle"
          titlePrefix="How"
          highlightedTitle="Pay2Pay Works"
          titleSuffix="Step-by-Step"
          description="A structured, transparent 8-phase operational lifecycle engineered for maximum speed, strict compliance, and automated real-time settlement."
        />

        {/* 2. Overview Banner */}
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border-slate-700/60 mb-16 2xl:mb-24 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase">
                <Sparkles size={14} />
                <span>Zero Latency Operations</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                From Registration to Live Earnings in 24 Hours
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Pay2Pay eliminates paperwork bottlenecks. Our digital verification pipeline processes partner KYC in real-time, auto-provisions dedicated virtual accounts, and activates high-earning financial services instantly upon compliance approval.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
              <Link
                href="/workspaces"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/30 transition-all text-center"
              >
                <span>Access Partner Workspaces</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition-all text-center"
              >
                <span>Inquire About Onboarding</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 3. 8-Step Detailed Lifecycle Cards */}
        <div className="space-y-8 mb-16 2xl:mb-24">
          {fullWorkflowSteps.map((step, idx) => {
            const IconComp = step.icon;
            const isLast = idx === fullWorkflowSteps.length - 1;

            return (
              <div
                key={step.number}
                className="glass-panel p-8 sm:p-10 rounded-3xl border-slate-800 hover:border-blue-500/50 transition-all shadow-xl relative group overflow-hidden"
              >
                {/* Subtle phase number background watermark */}
                <div className="absolute right-6 -bottom-6 font-mono text-8xl font-black text-slate-800/20 select-none pointer-events-none group-hover:text-blue-600/10 transition-colors">
                  {step.number}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
                  {/* Left Column: Number & Title */}
                  <div className="lg:col-span-4 flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-mono font-black text-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/25 group-hover:scale-105 transition-transform">
                      {step.number}
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-blue-400 bg-blue-600/15 border border-blue-500/20 px-2.5 py-0.5 rounded-full inline-block mb-1.5 uppercase tracking-wider">
                        Phase {step.number} • {step.phase}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                        {step.title}
                      </h3>
                    </div>
                  </div>

                  {/* Middle Column: Summary */}
                  <div className="lg:col-span-4">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {step.summary}
                    </p>
                  </div>

                  {/* Right Column: Execution Checklist */}
                  <div className="lg:col-span-4 space-y-2.5 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-4 lg:pt-0 lg:pl-6">
                    {step.details.map((detail, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 size={14} className="text-blue-400 shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Settlement & Commission Guarantee */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border-slate-800 mb-16 2xl:mb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                <Clock size={20} />
              </div>
              <h4 className="text-lg font-bold text-white">Sub-Second Processing</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct IMPS and NPCI API routing ensures transactions clear in under 1.5 seconds under peak concurrency.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                <Zap size={20} />
              </div>
              <h4 className="text-lg font-bold text-white">Instant Margin Credit</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Commissions are credited to your merchant wallet immediately upon transaction confirmation — no batch waiting.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                <ShieldCheck size={20} />
              </div>
              <h4 className="text-lg font-bold text-white">Auto Reconciliation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Comprehensive double-entry ledger bookkeeping guarantees complete accounting clarity and zero discrepancy.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Call to Action Banner */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-slate-900/60 border border-blue-500/30 text-center shadow-2xl">
          <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-black text-white mb-4">
            Ready to Start Operating with Pay2Pay?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
            Select your assigned workspace or connect with our onboarding team to get your store verified and activated today.
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
              Contact Support Desk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
