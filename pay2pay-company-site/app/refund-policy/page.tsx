import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCcw, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Pay2Pay Enterprise FinTech",
  description:
    "Review Pay2Pay policies regarding transaction failures, automated wallet reversals, utility bill payment disputes, and settlement refunds.",
};

export default function RefundPolicyPage() {
  const doc = siteConfig.legal.refund;

  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <Pay2PayPageHeader
          eyebrow="Dispute & Settlement"
          titlePrefix="Refund &"
          highlightedTitle="Cancellation"
          titleSuffix="Policy"
          description={`Last Updated: ${doc.lastUpdated} • ${siteConfig.company.legalName}`}
        />

        {/* Summary Callout */}
        <div className="p-6 rounded-2xl bg-blue-950/40 border border-blue-800/50 text-slate-300 text-sm leading-relaxed mb-10 shadow-lg">
          <div className="flex items-center gap-2 font-bold text-blue-400 mb-2">
            <RefreshCcw size={18} />
            <span>Refund Principle</span>
          </div>
          {doc.summary}
        </div>

        {/* Sections */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border-slate-800 space-y-10 mb-12 shadow-2xl">
          {doc.sections.map((sec, idx) => (
            <div key={sec.heading} className="space-y-4 pb-8 border-b border-slate-800/80 last:border-0 last:pb-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-600/15 text-blue-400 text-xs font-mono font-bold flex items-center justify-center">
                  0{idx + 1}
                </span>
                <span>{sec.heading}</span>
              </h2>

              {Array.isArray(sec.content) ? (
                <ul className="list-disc pl-6 space-y-2 text-slate-300 text-sm leading-relaxed">
                  {sec.content.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-300 text-sm leading-relaxed">{sec.content}</p>
              )}
            </div>
          ))}
        </div>

        {/* Navigation / Footer Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl glass-panel border-slate-800">
          <Link
            href="/terms"
            className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1.5"
          >
            <ArrowRight size={14} />
            <span>Read Terms & Conditions</span>
          </Link>
          <Link
            href="/privacy"
            className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1.5"
          >
            <ArrowRight size={14} />
            <span>Read Privacy Policy</span>
          </Link>
          <Link
            href="/contact"
            className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <span>Raise a Transaction Dispute →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
