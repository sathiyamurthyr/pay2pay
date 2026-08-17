"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Key, Shield, FileSpreadsheet, ArrowRight, CheckCircle2 } from "lucide-react";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

const securityHighlights = [
  {
    title: "Secure Authentication",
    badge: "MFA & MPIN",
    description: "Encrypted 6-digit transaction MPIN and dynamic OTP validation protect all financial terminal sessions.",
    icon: ShieldCheck,
  },
  {
    title: "Role-Based Access",
    badge: "Strict RBAC",
    description: "Granular permissions segregate Retailer, Distributor, Super Distributor, DIT, and Admin operations.",
    icon: Key,
  },
  {
    title: "Data Protection",
    badge: "TLS 1.3 & AES-256",
    description: "End-to-end payload encryption in transit and database encryption at rest safeguard all merchant and customer data.",
    icon: Shield,
  },
  {
    title: "Audit & Monitoring",
    badge: "24x7 Telemetry",
    description: "Immutable chronological audit trails with unique UTR identifiers and automated multi-bank switch failover.",
    icon: FileSpreadsheet,
  },
];

export const SecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-20 lg:py-28 2xl:py-36 relative bg-[#060D18]/70 border-y border-slate-800/70">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* Section Header */}
        <Pay2PayPageHeader
          eyebrow="Security Preview"
          titlePrefix="Security Built Into"
          highlightedTitle="Every Layer"
          description="Engineered with strict enterprise defense controls, end-to-end data encryption, and resilient session safeguards protecting every partner workspace and transaction."
        />

        {/* Visual & Summary Card */}
        <div className="glass-panel p-6 sm:p-10 2xl:p-12 rounded-3xl border-slate-700/60 shadow-2xl mb-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Security Shield Visual */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl group">
              <div className="relative aspect-video w-full">
                <Image
                  src="/images/security-preview.jpg"
                  alt="Pay2Pay Security Architecture"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-mono bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80">
                <span className="text-blue-400 font-bold">Zero-Trust Architecture</span>
                <span>Bank-Grade Safeguards</span>
              </div>
            </div>

            {/* Right: Security Safeguards Highlights */}
            <div className="lg:col-span-6 space-y-5">
              <h3 className="text-xl sm:text-2xl 2xl:text-3xl font-extrabold text-white leading-tight">
                Enterprise Cryptographic Defense & Real-Time Risk Safeguards
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Every transaction and terminal session is protected by cryptographic tokens, device fingerprinting, single-session concurrency controls, and real-time velocity monitoring.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                  <span>Mandatory 6-digit encrypted transaction MPIN on all monetary operations</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Immutable audit trails with actor attribution & Unique Transaction References</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                  <span>24x7 telemetry with automated switch latency monitoring & failover</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/security"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
                >
                  <span>Explore Security</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars Preview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityHighlights.map((item) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.title}
                className="glass-panel p-6 sm:p-7 rounded-2xl relative group overflow-hidden flex flex-col justify-between hover:border-blue-500/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-600/15 border border-blue-500/25 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-md shadow-blue-500/10">
                      <IconComp size={20} />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-[10px] font-bold text-blue-300 font-mono">
                      {item.badge}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                    {item.title}
                  </h4>

                  <p className="text-slate-400 text-xs leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
