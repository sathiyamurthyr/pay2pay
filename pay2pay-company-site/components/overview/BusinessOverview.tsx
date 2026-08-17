"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Zap, ShieldCheck } from "lucide-react";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const BusinessOverview: React.FC = () => {
  return (
    <section id="overview" className="py-20 lg:py-28 2xl:py-36 relative bg-[#060D18]/70 border-y border-slate-800/60">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* Section Header */}
        <Pay2PayPageHeader
          eyebrow="Business Snapshot"
          titlePrefix="One Platform."
          highlightedTitle="Connected Financial Services."
          description="Pay2Pay brings supported financial and utility services together through a connected partner ecosystem designed for efficient, secure and transparent operations."
        />

        {/* Visual & Summary Card */}
        <div className="glass-panel p-6 sm:p-10 2xl:p-12 rounded-3xl border-slate-700/60 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Visual Image */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl group bg-slate-900/60">
              <div className="relative w-full overflow-hidden">
                <Image
                  src="/images/business-snapshot.jpg"
                  alt="Pay2Pay Connected Financial Platform"
                  width={720}
                  height={405}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
                  priority
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none rounded-2xl" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-mono bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80">
                <span className="text-blue-400 font-bold">Pay2Pay Core Mesh</span>
                <span>High-Speed Transaction Rails</span>
              </div>
            </div>

            {/* Right: Key Highlights & Concise Pillars */}
            <div className="lg:col-span-6 space-y-6">
              <h3 className="text-xl sm:text-2xl 2xl:text-3xl font-extrabold text-white leading-tight">
                High-Reliability Digital Rails for Modern Retail Counters
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Our multi-tier distribution network links local retail merchants to core sponsor banking rails and billers, enabling instant money transfers, biometric cash withdrawals, and utility collections with real-time margin crediting.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-200">
                  <Zap size={16} className="text-blue-400 shrink-0" />
                  <span>Sub-Second Response Latency</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-200">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <span>Bank-Grade Data Encryption</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-200">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                  <span>Automated Wallet Settlements</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-200">
                  <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                  <span>24x7 Dedicated RM Support</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
                >
                  <span>Learn About Pay2Pay</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
