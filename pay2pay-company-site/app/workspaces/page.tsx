import type { Metadata } from "next";
import Link from "next/link";
import {
  Store,
  Users,
  Network,
  Layers,
  ShieldCheck,
  LogIn,
  Check,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Shield,
  HelpCircle,
} from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const metadata: Metadata = {
  title: "Partner Workspaces | Pay2Pay Enterprise FinTech",
  description:
    "Select and access your dedicated Pay2Pay workspace — Retailer Point of Sale, Distributor Management, Super Distributor Franchise, DIT Operations, or Company Admin.",
};

const workspacesList = [
  {
    id: "retailer",
    role: "Retailer Workspace",
    badge: "Primary Workstation",
    subtitle: "Point of Sale & Assisted Banking Counter",
    description:
      "Dedicated terminal for retail shop owners to provide walk-in customers with money transfers, cash withdrawals, bill payments, and recharge services.",
    route: "/retailer/login",
    highlighted: true,
    features: [
      "Domestic Money Transfer (DMT) workstation with instant IMPS/NEFT",
      "Aadhaar Enabled Payment System (AEPS) biometric cash withdrawals",
      "50+ Bharat Bill Payment System (BBPS) utility collections",
      "Real-time virtual account wallet with instant margin crediting",
      "Printable digital tax invoices and thermal slip generation",
      "Direct ledger bookkeeping and 24x7 settlement withdrawals",
    ],
    ctaLabel: "Launch Retailer Portal",
    onboardingLink: "/contact?topic=retailer-onboarding",
    onboardingText: "New Retailer? Register here →",
  },
  {
    id: "distributor",
    role: "Distributor Workspace",
    badge: "Distribution Network",
    subtitle: "Agent Network Management & Liquidity Hub",
    description:
      "Operational portal for authorized distributors to onboard retail merchants, allocate wallet liquidity, and monitor regional transaction volume.",
    route: "/distributor/login",
    highlighted: false,
    features: [
      "Retailer network onboarding and digital document verification",
      "Real-time retailer liquidity top-ups and balance allocation",
      "Territory volume analytics and agent activity telemetry",
      "Automated overriding commission accounting and settlements",
      "Agent performance reports and statement exports",
    ],
    ctaLabel: "Launch Distributor Portal",
    onboardingLink: "/contact?topic=distributor-onboarding",
    onboardingText: "Become a Distributor →",
  },
  {
    id: "super-distributor",
    role: "Super Distributor Workspace",
    badge: "Master Franchise",
    subtitle: "Regional Hierarchy & Zonal Master Franchise",
    description:
      "Executive management console for Super Distributors managing multi-tier distribution hierarchies across state and district zones.",
    route: "/super-distributor/login",
    highlighted: false,
    features: [
      "Multi-tier hierarchy oversight (Distributors and Retailers)",
      "Bulk capital allocation and virtual credit distribution",
      "Zonal commission settlements and margin configuration",
      "Advanced territory revenue analytics and growth forecasting",
      "Direct relationship manager support channel",
    ],
    ctaLabel: "Launch Super-Distributor Portal",
    onboardingLink: "/contact?topic=super-distributor-onboarding",
    onboardingText: "Franchise Partnership →",
  },
  {
    id: "dit",
    role: "DIT Workspace",
    badge: "Technical Operations",
    subtitle: "Network Facilitation & Gateway Telemetry",
    description:
      "Technical operational hub for DIT partners to monitor switch latencies, perform gateway diagnostics, and oversee network health.",
    route: "/dit/login",
    highlighted: false,
    features: [
      "Technical gateway connectivity and routing telemetry",
      "Real-time switch latency monitoring across sponsor banks",
      "Endpoint integration diagnostics and error-rate monitoring",
      "Operational troubleshooting and incident resolution tools",
    ],
    ctaLabel: "Launch DIT Portal",
    onboardingLink: "/contact?topic=technical-support",
    onboardingText: "Technical Inquiries →",
  },
  {
    id: "admin",
    role: "Company Admin Workspace",
    badge: "Enterprise Control",
    subtitle: "Corporate Governance & Compliance Operations",
    description:
      "Central command center for authorized Pay2Pay enterprise personnel to audit compliance, approve KYC, manage banking switches, and enforce policies.",
    route: "/company-admin/login",
    highlighted: false,
    features: [
      "Retailer & Distributor KYC verification and approval desk",
      "Platform configuration, fee structures, and commission rules",
      "Banking switch management and automated failover controls",
      "Comprehensive chronological audit logs and regulatory reporting",
    ],
    ctaLabel: "Launch Enterprise Admin",
    onboardingLink: "/contact?topic=corporate",
    onboardingText: "Enterprise Inquiries →",
  },
];

export default function WorkspacesPage() {
  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* 1. Page Header */}
        <Pay2PayPageHeader
          eyebrow="Role-Based Portals"
          titlePrefix="Select Your"
          highlightedTitle="Pay2Pay Partner"
          titleSuffix="Workspace"
          description="Secure, role-segregated operational dashboards connecting authorized partners with banking systems across India."
        />

        {/* 2. Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 2xl:gap-8 mb-16 2xl:mb-24 items-stretch">
          {workspacesList.map((workspace) => {
            const isRetailer = workspace.id === "retailer";
            const isDistributor = workspace.id === "distributor";
            const isSd = workspace.id === "super-distributor";
            const isDit = workspace.id === "dit";
            const isAdmin = workspace.id === "admin";

            return (
              <div
                key={workspace.id}
                className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative transition-all duration-300 ${
                  workspace.highlighted
                    ? "bg-gradient-to-b from-[#0F1E3A] to-[#081120] border-2 border-blue-500 shadow-2xl shadow-blue-500/20 scale-[1.02] md:-translate-y-2 z-10"
                    : "glass-panel bg-[#081220]/80 hover:border-slate-600 shadow-xl"
                }`}
              >
                {workspace.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-md whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <div>
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                        isRetailer
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                          : isDistributor
                          ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                          : isSd
                          ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                          : isDit
                          ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30"
                          : "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                      }`}
                    >
                      {isRetailer ? (
                        <Store size={22} />
                      ) : isDistributor ? (
                        <Users size={22} />
                      ) : isSd ? (
                        <Network size={22} />
                      ) : isDit ? (
                        <Layers size={22} />
                      ) : (
                        <ShieldCheck size={22} />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
                      {workspace.badge}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white mb-1">
                    {workspace.role}
                  </h3>
                  <div className="text-xs font-semibold text-blue-400 mb-4">
                    {workspace.subtitle}
                  </div>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                    {workspace.description}
                  </p>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 pt-6 border-t border-slate-800 mb-8">
                    {workspace.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2.5 text-xs text-slate-200">
                        <div className="w-4 h-4 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={11} />
                        </div>
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                  <Link
                    href={workspace.route}
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg active:scale-95 ${
                      workspace.highlighted
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/35 hover:shadow-blue-600/50"
                        : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <LogIn size={15} />
                    <span>{workspace.ctaLabel}</span>
                  </Link>

                  <div className="text-center">
                    <Link
                      href={workspace.onboardingLink}
                      className="text-[11px] text-blue-400 hover:underline font-medium"
                    >
                      {workspace.onboardingText}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Partner Access Directory Link */}
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border-slate-800 mb-16 2xl:mb-24 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              Looking for our dedicated Partner Portals Hub?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Browse detailed access criteria, registration workflows, and portal documentation in our central directory.
            </p>
          </div>
          <Link
            href="/partner-portals"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all shrink-0"
          >
            Visit Partner Portals Hub →
          </Link>
        </div>

        {/* 4. Help & Support */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-slate-900/60 border border-blue-500/30 text-center shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
            Need Assistance Logging into Your Workspace?
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto mb-8">
            Contact our merchant helpdesk for password resets, MPIN updates, or portal authorization assistance.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-blue-500/30 hover:brightness-110 active:scale-95 transition-all"
            >
              Contact Support Desk →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
