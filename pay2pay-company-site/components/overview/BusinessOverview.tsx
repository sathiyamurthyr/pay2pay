"use client";

import React from "react";
import { CreditCard, Store, ArrowLeftRight, Receipt, Wallet, LucideIcon } from "lucide-react";
import { siteConfig } from "@/config/site-config";

const iconMap: Record<string, LucideIcon> = {
  CreditCard,
  Store,
  ArrowLeftRight,
  Receipt,
  Wallet,
};

import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const BusinessOverview: React.FC = () => {
  return (
    <section id="overview" className="py-20 lg:py-28 2xl:py-36 relative bg-[#060D18]/70 border-y border-slate-800/60">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* Section Header */}
        <Pay2PayPageHeader
          eyebrow="Company Overview"
          titlePrefix="Empowering India's Next-Generation"
          highlightedTitle="Digital Banking"
          titleSuffix="Infrastructure"
          description={siteConfig.overview.subtitle}
        />

        {/* Feature Pillar Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 2xl:gap-8 3xl:gap-10">
          {siteConfig.overview.pillars.map((pillar, idx) => {
            const IconComponent = iconMap[pillar.iconName] || CreditCard;
            return (
              <div
                key={pillar.title}
                className="glass-panel p-7 rounded-2xl relative group overflow-hidden flex flex-col justify-between"
              >
                {/* Accent Top Border Highlight */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <IconComponent size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2.5">
                    {pillar.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono font-semibold">0{idx + 1}</span>
                  <span className="text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
                    Enterprise Standard →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
