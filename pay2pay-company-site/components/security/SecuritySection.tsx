"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, FileCheck, Key, Activity, FileSpreadsheet, Shield, LucideIcon } from "lucide-react";
import { siteConfig } from "@/config/site-config";

const iconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  Lock,
  FileCheck,
  Key,
  Activity,
  FileSpreadsheet,
  Shield,
};

import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const SecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-20 lg:py-28 2xl:py-36 relative bg-[#060D18]/70 border-y border-slate-800/70">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* Section Header */}
        <Pay2PayPageHeader
          eyebrow="Security"
          titlePrefix="Security &"
          highlightedTitle="Operational Integrity"
          description={siteConfig.security.subtitle}
        />

        {/* Security Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 2xl:gap-6">
          {siteConfig.security.pillars.map((pillar) => {
            const IconComponent = iconMap[pillar.iconName] || ShieldCheck;
            return (
              <div
                key={pillar.title}
                className="glass-panel p-6 rounded-2xl relative group overflow-hidden flex flex-col justify-between hover:border-blue-500/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-600/15 border border-blue-500/25 text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-md shadow-blue-500/10">
                      <IconComponent size={20} />
                    </div>
                    {pillar.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-[10px] font-bold text-blue-300 font-mono">
                        {pillar.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                    {pillar.title}
                  </h3>

                  <p className="text-slate-400 text-xs leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explore Security CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/security"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-blue-500/10"
          >
            <span>Explore Complete Enterprise Security Architecture</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
