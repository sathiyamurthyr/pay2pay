"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { UserCheck, Store, Users, Network, Cpu, Landmark, ArrowRight, CheckCircle2 } from "lucide-react";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

const ecosystemFlow = [
  { step: "01", name: "Customer", desc: "Assisted counter banking & bill payment access", icon: UserCheck },
  { step: "02", name: "Retailer", desc: "Local point-of-sale merchant workstation", icon: Store },
  { step: "03", name: "Distributor", desc: "Onboards & manages agent network liquidity", icon: Users },
  { step: "04", name: "Super Distributor", desc: "Zonal master franchise territory management", icon: Network },
  { step: "05", name: "Pay2Pay Core", desc: "Intelligent multi-rail routing & real-time ledger", icon: Cpu },
  { step: "06", name: "Banking Rails", desc: "NPCI, sponsor banks & BBPS clearing switches", icon: Landmark },
];

export const RetailerEcosystem: React.FC = () => {
  return (
    <section id="ecosystem" className="py-20 lg:py-28 2xl:py-36 relative bg-[#060D18]/80 border-y border-slate-800/70 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* Section Header */}
        <Pay2PayPageHeader
          eyebrow="Ecosystem Preview"
          titlePrefix="Connected Partner"
          highlightedTitle="Ecosystem"
          description="A structured partner network connecting customers, retailers, distributors and service partners through Pay2Pay."
        />

        {/* Visual & Summary Card */}
        <div className="glass-panel p-6 sm:p-10 2xl:p-12 rounded-3xl border-slate-700/60 shadow-2xl mb-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Enterprise Network Visual */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl group">
              <div className="relative aspect-video w-full">
                <Image
                  src="/images/ecosystem-preview.jpg"
                  alt="Pay2Pay Connected Partner Network"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-mono bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80">
                <span className="text-blue-400 font-bold">Multi-Tier Network</span>
                <span>Transparent Value Distribution</span>
              </div>
            </div>

            {/* Right: Concise Flow Description */}
            <div className="lg:col-span-6 space-y-5">
              <h3 className="text-xl sm:text-2xl 2xl:text-3xl font-extrabold text-white leading-tight">
                Seamless Value Flow from Walk-in Customer to Core Banking Rails
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Pay2Pay orchestrates every tier in real-time. Transactions initiated at retail counters flow through intelligent multi-switch routing, clearing instantly with automated revenue distribution across the partner hierarchy.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                  <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                  <span>Paperless Digital KYC</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>Auto-Credited Virtual Accounts</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                  <CheckCircle2 size={15} className="text-amber-400 shrink-0" />
                  <span>Real-Time Double-Entry Ledger</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                  <CheckCircle2 size={15} className="text-indigo-400 shrink-0" />
                  <span>Assigned RM & Helpline</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/ecosystem"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
                >
                  <span>Explore Ecosystem</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 6-Node Tier Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {ecosystemFlow.map((node) => {
            const IconComp = node.icon;
            return (
              <div
                key={node.step}
                className="glass-panel p-5 rounded-2xl flex flex-col items-center text-center justify-between hover:border-blue-500/40 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <IconComp size={20} />
                </div>
                <span className="font-mono text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                  Tier {node.step}
                </span>
                <h4 className="text-sm font-bold text-white mb-1.5">{node.name}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">{node.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
