"use client";

import React from "react";
import { UserCheck, Store, Cpu, Landmark, CheckCircle2, ArrowRight, LucideIcon } from "lucide-react";
import { siteConfig } from "@/config/site-config";

const iconMap: Record<string, LucideIcon> = {
  UserCheck,
  Store,
  Cpu,
  Landmark,
  CheckCircle2,
};

export const RetailerEcosystem: React.FC = () => {
  return (
    <section id="ecosystem" className="py-20 lg:py-28 relative bg-[#060D18]/80 border-y border-slate-800/70 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wide uppercase mb-4">
            {siteConfig.ecosystem.sectionBadge}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Built Around the <span className="gradient-text-gold">Retailer</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            {siteConfig.ecosystem.subtitle}
          </p>
        </div>

        {/* Visual Lifecycle Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 relative">
          {siteConfig.ecosystem.steps.map((item, idx) => {
            const IconComponent = iconMap[item.iconName] || Store;
            const isLast = idx === siteConfig.ecosystem.steps.length - 1;

            return (
              <div key={item.step} className="flex flex-col items-center text-center relative group">
                <div className="w-full glass-panel p-6 rounded-2xl flex flex-col items-center justify-between h-full group-hover:border-blue-500/40 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-md shadow-blue-500/15">
                    <IconComponent size={22} />
                  </div>

                  <span className="font-mono text-xs font-bold text-blue-400 mb-1">
                    Step {item.step}
                  </span>

                  <h3 className="text-sm font-bold text-white mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Right Arrow indicator on desktop */}
                {!isLast && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 items-center justify-center text-slate-400 shadow-md">
                    <ArrowRight size={12} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Value Prop Highlights */}
        <div className="mt-12 glass-panel p-6 sm:p-8 rounded-2xl flex flex-wrap items-center justify-between gap-6 border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
              ✓
            </div>
            <div>
              <div className="font-bold text-white text-sm">Paperless Digital KYC</div>
              <div className="text-xs text-slate-400">Automated verification & fast approval</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
              ⚡
            </div>
            <div>
              <div className="font-bold text-white text-sm">Dedicated Virtual Accounts</div>
              <div className="text-xs text-slate-400">Auto wallet crediting via NEFT/IMPS/UPI</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              🛡
            </div>
            <div>
              <div className="font-bold text-white text-sm">Designated RM Support</div>
              <div className="text-xs text-slate-400">Assigned Relationship Manager for merchant support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
