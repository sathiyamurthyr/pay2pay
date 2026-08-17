import type { Metadata } from "next";
import Link from "next/link";
import { Target, Compass, Cpu, ShieldCheck, CheckCircle2, Award, Zap, Users, Store, Landmark, ArrowRight, Building2, PhoneCall } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const metadata: Metadata = {
  title: "About Us | Pay2Pay Enterprise Digital Financial Services",
  description:
    "Learn about Pay2Pay, our corporate mission, vision, scalable technology architecture, and partner-centric digital financial services network.",
};

export default function AboutPage() {
  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* 1. Page Header */}
        <Pay2PayPageHeader
          eyebrow="Company Overview"
          titlePrefix="About"
          highlightedTitle="Pay2Pay"
          description={siteConfig.about.description}
        />

        {/* 2. Mission & Vision Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 2xl:gap-12 mb-16 2xl:mb-24">
          <div className="glass-panel p-8 sm:p-10 rounded-3xl relative overflow-hidden group hover:border-blue-500/50 transition-all shadow-2xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg shadow-blue-500/20">
              <Target size={28} />
            </div>
            <h3 className="text-2xl 2xl:text-3xl font-extrabold text-white mb-4">Our Mission</h3>
            <p className="text-slate-300 text-sm sm:text-base 2xl:text-lg leading-relaxed">
              {siteConfig.about.mission}
            </p>
            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center gap-2 text-xs font-semibold text-blue-400">
              <CheckCircle2 size={16} />
              <span>Dedicated to grassroots financial empowerment</span>
            </div>
          </div>

          <div className="glass-panel p-8 sm:p-10 rounded-3xl relative overflow-hidden group hover:border-indigo-500/50 transition-all shadow-2xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg shadow-indigo-500/20">
              <Compass size={28} />
            </div>
            <h3 className="text-2xl 2xl:text-3xl font-extrabold text-white mb-4">Our Vision</h3>
            <p className="text-slate-300 text-sm sm:text-base 2xl:text-lg leading-relaxed">
              {siteConfig.about.vision}
            </p>
            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <CheckCircle2 size={16} />
              <span>Pioneering secure, resilient payment rails across India</span>
            </div>
          </div>
        </div>

        {/* 3. Platform Capabilities & Architecture */}
        <div className="glass-panel p-8 sm:p-12 2xl:p-16 rounded-3xl border-slate-700/60 mb-16 2xl:mb-24 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Cpu size={14} />
                <span>Enterprise Architecture</span>
              </div>
              <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Engineered for High Throughput, Fault-Tolerance & Low Latency
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {siteConfig.about.technologyApproach}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Our multi-rail routing engine automatically distributes transaction volume across multiple sponsor banks and clearing switches, guaranteeing minimal downtime and sub-second clearance for Domestic Money Transfers and AEPS cash operations.
              </p>

              <div className="pt-4 flex flex-wrap gap-4">
                <Link
                  href="/security"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white text-xs font-bold transition-all"
                >
                  <ShieldCheck size={16} />
                  <span>Security & Risk Controls →</span>
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
                >
                  <span>Explore Supported Services →</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 gap-4 sm:gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg">
                <div className="text-3xl 2xl:text-4xl font-black text-blue-400 font-mono mb-2">99.9%</div>
                <div className="text-xs sm:text-sm font-bold text-white mb-1">Core Platform Uptime SLA</div>
                <div className="text-[11px] text-slate-400">High-availability redundant server clusters</div>
              </div>
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg">
                <div className="text-3xl 2xl:text-4xl font-black text-emerald-400 font-mono mb-2">&lt; 1.5s</div>
                <div className="text-xs sm:text-sm font-bold text-white mb-1">Average Response Latency</div>
                <div className="text-[11px] text-slate-400">Optimized direct IMPS/NEFT routing</div>
              </div>
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg">
                <div className="text-3xl 2xl:text-4xl font-black text-amber-400 font-mono mb-2">24x7</div>
                <div className="text-xs sm:text-sm font-bold text-white mb-1">Continuous Virtual Settlement</div>
                <div className="text-[11px] text-slate-400">Real-time ledger and wallet updates</div>
              </div>
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg">
                <div className="text-3xl 2xl:text-4xl font-black text-indigo-400 font-mono mb-2">TLS 1.3</div>
                <div className="text-xs sm:text-sm font-bold text-white mb-1">Encrypted Payload Security</div>
                <div className="text-[11px] text-slate-400">AES-256 at-rest database protection</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Why Pay2Pay / Partner-Centric Approach */}
        <div className="mb-16 2xl:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold text-white tracking-tight mb-4">
              Why Retailers & Distributors Choose <span className="gradient-text-gold">Pay2Pay</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Built specifically to empower local retail merchants with seamless, commission-earning digital banking and utility payment capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 2xl:gap-8">
            <div className="glass-panel p-8 rounded-2xl border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-600/15 text-blue-400 flex items-center justify-center mb-5">
                  <Store size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">All-In-One Counter Workstation</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Offer DMT money transfers, AEPS biometric cash withdrawals, PAN applications, and 50+ utility bill payments from a single unified portal.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-blue-400 font-semibold">
                Instant Commission Crediting
              </div>
            </div>

            <div className="glass-panel p-8 rounded-2xl border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center mb-5">
                  <Zap size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Dedicated Virtual Accounts</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Auto wallet top-ups via individual virtual bank accounts (NEFT/RTGS/IMPS/UPI) ensuring zero transaction delays or manual reconciliation.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-indigo-400 font-semibold">
                Automated 24x7 Liquidity
              </div>
            </div>

            <div className="glass-panel p-8 rounded-2xl border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-600/15 text-emerald-400 flex items-center justify-center mb-5">
                  <Award size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Dedicated Partner Desk</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Direct toll-free merchant helpline, WhatsApp onboarding desk, and relationship manager support for priority operational resolution.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-emerald-400 font-semibold">
                Fast Dispute Resolution
              </div>
            </div>
          </div>
        </div>

        {/* 5. Corporate Verification & Compliance */}
        <div className="glass-panel p-8 rounded-2xl border-slate-800 mb-16 2xl:mb-24 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="font-bold text-white text-base sm:text-lg">
                {siteConfig.company.legalName}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                CIN: {siteConfig.company.cin} | GSTIN: {siteConfig.company.gstin}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors border border-slate-700"
            >
              Contact Desk
            </Link>
            <Link
              href="/terms"
              className="px-5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-semibold text-xs transition-colors border border-blue-500/30"
            >
              Legal & Terms
            </Link>
          </div>
        </div>

        {/* 6. Call to Action */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-slate-900/60 border border-blue-500/30 text-center shadow-2xl">
          <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-black text-white mb-4">
            Ready to Join the Pay2Pay Network?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
            Access your dedicated partner workspace or get in touch with our enterprise onboarding desk to activate your retail counter.
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
              Contact Corporate Desk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
