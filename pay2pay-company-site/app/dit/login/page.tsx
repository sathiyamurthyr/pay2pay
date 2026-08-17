import type { Metadata } from "next";
import Link from "next/link";
import { Layers, ShieldCheck, Lock, ArrowRight, ArrowLeft, Headphones } from "lucide-react";
import { siteConfig } from "@/config/site-config";

export const metadata: Metadata = {
  title: "DIT Portal Login | Pay2Pay Enterprise FinTech",
  description:
    "Secure login gateway for authorized Pay2Pay DIT partners and technical operators.",
};

export default function DitLoginPage() {
  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36 min-h-[85vh] flex items-center justify-center">
      <div className="max-w-xl w-full mx-auto px-4 sm:px-6">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border-slate-700/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-600/20">
              <Layers size={28} />
            </div>
            <div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
                Technical Operations
              </span>
              <h1 className="text-2xl font-extrabold text-white mt-1">
                DIT Workspace
              </h1>
            </div>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Technical operational portal for gateway diagnostics, switch latency telemetry, and service routing facilitation.
          </p>

          {/* Security Notice */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 space-y-2 mb-8">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <ShieldCheck size={14} />
              <span>Technical Operator Access</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              IP whitelisting and multi-factor validation active.
            </p>
          </div>

          {/* Launch Button */}
          <a
            href={process.env.NEXT_PUBLIC_DIT_PORTAL_URL || "https://dit.pay2pay.in"}
            className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/30 active:scale-95 transition-all mb-4"
          >
            <Lock size={16} />
            <span>Proceed to DIT Login</span>
            <ArrowRight size={16} />
          </a>

          {/* Help Link */}
          <div className="text-center py-2">
            <Link
              href="/contact?topic=technical-support"
              className="text-xs text-cyan-400 hover:underline font-semibold"
            >
              Need Technical or Gateway Integration Support? →
            </Link>
          </div>

          {/* Quick Help & Other Roles */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <Link
              href="/workspaces"
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Switch Workspace</span>
            </Link>
            <Link
              href="/contact"
              className="hover:text-blue-400 flex items-center gap-1.5 transition-colors"
            >
              <Headphones size={13} className="text-blue-400" />
              <span>Helpline: {siteConfig.company.tollFree}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
