import type { Metadata } from "next";
import Link from "next/link";
import { Users, ShieldCheck, Lock, ArrowRight, ArrowLeft, Headphones } from "lucide-react";
import { siteConfig } from "@/config/site-config";

export const metadata: Metadata = {
  title: "Distributor Portal Login | Pay2Pay Enterprise FinTech",
  description:
    "Secure login gateway for authorized Pay2Pay network distributors.",
};

export default function DistributorLoginPage() {
  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36 min-h-[85vh] flex items-center justify-center">
      <div className="max-w-xl w-full mx-auto px-4 sm:px-6">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border-slate-700/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Users size={28} />
            </div>
            <div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                Distribution Network
              </span>
              <h1 className="text-2xl font-extrabold text-white mt-1">
                Distributor Workspace
              </h1>
            </div>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Manage your network of retail merchants, provision wallet liquidity, and monitor regional transaction volumes and commission earnings.
          </p>

          {/* Security Notice */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 space-y-2 mb-8">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <ShieldCheck size={14} />
              <span>Multi-Tier RBAC Protected</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Authorized access only. Session concurrency limits are strictly enforced.
            </p>
          </div>

          {/* Launch Button */}
          <a
            href={process.env.NEXT_PUBLIC_DISTRIBUTOR_PORTAL_URL || "https://distributor.pay2pay.in"}
            className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-95 transition-all mb-4"
          >
            <Lock size={16} />
            <span>Proceed to Distributor Login</span>
            <ArrowRight size={16} />
          </a>

          {/* Onboarding Link */}
          <div className="text-center py-2">
            <Link
              href="/contact?topic=distributor-onboarding"
              className="text-xs text-indigo-400 hover:underline font-semibold"
            >
              Interested in becoming a Pay2Pay Distributor? Inquire here →
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
