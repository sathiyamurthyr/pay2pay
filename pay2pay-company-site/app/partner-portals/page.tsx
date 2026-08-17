import type { Metadata } from "next";
import Link from "next/link";
import {
  Store,
  Users,
  Network,
  Layers,
  ShieldCheck,
  LogIn,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  PhoneCall,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const metadata: Metadata = {
  title: "Partner Portals Hub | Pay2Pay Enterprise FinTech",
  description:
    "Dedicated access hub for all Pay2Pay partner portals — Retailer POS, Distributor Management, Super Distributor Franchise, DIT Operations, and Enterprise Administration.",
};

const portalCards = [
  {
    id: "retailer",
    name: "Retailer Portal",
    badge: "Merchant Terminal",
    tagline: "Point of Sale & Assisted Banking Counter",
    description:
      "Designed for retail merchants and shop owners across India to provide assisted domestic money transfers, AEPS biometric cash withdrawals, BBPS bill payments, and mobile top-ups.",
    targetUrl: "/retailer/login",
    registerUrl: "/contact?topic=retailer-onboarding",
    canRegister: true,
    features: [
      "Assisted DMT Money Transfers with instant IMPS settlement",
      "Aadhaar Biometric AEPS Cash Withdrawal & Balance Enquiry",
      "BBPS Utility Payments (Electricity, Water, Gas, DTH, Mobile)",
      "Instant virtual account wallet funding & margin settlement",
      "Branded thermal print receipts and SMS notifications",
    ],
    highlighted: true,
    icon: Store,
  },
  {
    id: "distributor",
    name: "Distributor Portal",
    badge: "Network Manager",
    tagline: "Agent Onboarding & Territory Liquidity Management",
    description:
      "Operational control center for authorized distributors to onboard new retail merchants, allocate virtual wallet balances, and track daily transaction volume.",
    targetUrl: "/distributor/login",
    registerUrl: "/contact?topic=distributor-onboarding",
    canRegister: true,
    features: [
      "Retailer onboarding and digital KYC document submission",
      "Instant retailer wallet top-ups and credit line allocation",
      "Territory volume analytics and agent activity tracking",
      "Automated overriding commission accounting and ledger exports",
    ],
    highlighted: false,
    icon: Users,
  },
  {
    id: "super-distributor",
    name: "Super Distributor Portal",
    badge: "Master Franchise",
    tagline: "Regional Hierarchy & Zonal Franchise Administration",
    description:
      "Executive management console for Super Distributors to oversee state and district distribution hierarchies, bulk liquidity allocation, and revenue analytics.",
    targetUrl: "/super-distributor/login",
    registerUrl: "/contact?topic=super-distributor-onboarding",
    canRegister: true,
    features: [
      "Multi-tier hierarchy oversight across distributors and retailers",
      "Bulk capital allocation and virtual credit distribution",
      "Zonal commission settlements and margin configuration",
      "Territory performance analytics and growth telemetry",
    ],
    highlighted: false,
    icon: Network,
  },
  {
    id: "dit",
    name: "DIT Portal",
    badge: "Operations Support",
    tagline: "Technical Facilitation & Gateway Telemetry",
    description:
      "Technical operational console for DIT partners to monitor switch latencies, gateway health, and integration diagnostics.",
    targetUrl: "/dit/login",
    registerUrl: "/contact?topic=technical-support",
    canRegister: false,
    features: [
      "Technical gateway connectivity and routing telemetry",
      "Real-time switch latency monitoring across sponsor banks",
      "Endpoint integration diagnostics and error-rate monitoring",
      "Incident logging and operational health dashboards",
    ],
    highlighted: false,
    icon: Layers,
  },
  {
    id: "admin",
    name: "Company Admin Portal",
    badge: "Enterprise Control",
    tagline: "Corporate Governance & Compliance Oversight",
    description:
      "Central command hub for authorized Pay2Pay enterprise personnel to audit compliance, verify KYC applications, manage banking switches, and enforce policies.",
    targetUrl: "/company-admin/login",
    registerUrl: "/contact?topic=corporate",
    canRegister: false,
    features: [
      "Retailer & Distributor KYC verification and approval desk",
      "Platform configuration, fee structures, and commission rules",
      "Banking switch management and automated failover controls",
      "Chronological audit logs and compliance reporting",
    ],
    highlighted: false,
    icon: ShieldCheck,
  },
];

export default function PartnerPortalsPage() {
  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* 1. Page Header */}
        <Pay2PayPageHeader
          eyebrow="Access Hub"
          titlePrefix="Pay2Pay"
          highlightedTitle="Partner Portals"
          titleSuffix="Directory"
          description="A dedicated access hub connecting retailers, distributors, super-distributors, DIT operations, and enterprise administrators to their respective operational workstations."
        />

        {/* 2. Portals Directory Grid */}
        <div className="space-y-8 mb-16 2xl:mb-24">
          {portalCards.map((portal) => {
            const IconComp = portal.icon;

            return (
              <div
                key={portal.id}
                className={`rounded-3xl p-8 sm:p-10 border transition-all duration-300 shadow-xl ${
                  portal.highlighted
                    ? "bg-gradient-to-b from-[#0F1E3A] to-[#081120] border-blue-500/80 shadow-blue-500/10 scale-[1.01]"
                    : "glass-panel bg-[#081220]/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Col 1: Icon, Title & Description (Span 7) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold ${
                          portal.id === "retailer"
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                            : portal.id === "distributor"
                            ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                            : portal.id === "super-distributor"
                            ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                            : portal.id === "dit"
                            ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30"
                            : "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                        }`}
                      >
                        <IconComp size={26} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-2xl font-extrabold text-white">
                            {portal.name}
                          </h3>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                            {portal.badge}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-blue-400">
                          {portal.tagline}
                        </div>
                      </div>
                    </div>

                    <p className="text-slate-300 text-sm leading-relaxed">
                      {portal.description}
                    </p>

                    {/* Features checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {portal.features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 size={13} className="text-blue-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Col 2: Action Box (Span 5) */}
                  <div className="lg:col-span-5 flex flex-col justify-center items-stretch sm:items-end gap-3 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-6 lg:pt-0 lg:pl-8">
                    <Link
                      href={portal.targetUrl}
                      className={`w-full sm:w-64 inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 text-center ${
                        portal.highlighted
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/35 hover:shadow-blue-600/50"
                          : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <LogIn size={16} />
                      <span>Login to {portal.name}</span>
                    </Link>

                    {portal.canRegister && (
                      <Link
                        href={portal.registerUrl}
                        className="w-full sm:w-64 inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-all text-center"
                      >
                        <span>Apply for Registration →</span>
                      </Link>
                    )}

                    <div className="text-[11px] text-slate-500 text-center sm:text-right w-full sm:w-64">
                      Encrypted TLS 1.3 Session Binding
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Onboarding & Help Section */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border-slate-800 mb-16 2xl:mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase">
                <HelpCircle size={14} />
                <span>Partner Assistance</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Need Portal Login or Account Activation Support?</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                If you have registered but have not received your login credentials, or require assistance resetting your 6-digit MPIN or updating your registered device, reach out to our partner desk.
              </p>
              <div className="text-xs text-slate-400 pt-2 flex flex-wrap items-center gap-6">
                <div>Toll-Free: <span className="text-white font-bold">{siteConfig.company.tollFree}</span></div>
                <div>WhatsApp: <span className="text-emerald-400 font-bold">{siteConfig.company.whatsapp}</span></div>
                <div>Email: <span className="text-blue-400 font-bold">{siteConfig.company.supportEmail}</span></div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3">
              <Link
                href="/contact"
                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all text-center"
              >
                Contact Partner Support Desk →
              </Link>
              <Link
                href="/how-it-works"
                className="px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-all text-center"
              >
                View 8-Step Onboarding Guide
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
