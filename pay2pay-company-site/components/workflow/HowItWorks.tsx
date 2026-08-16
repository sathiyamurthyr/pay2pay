"use client";

import React from "react";
import { siteConfig } from "@/config/site-config";

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wide uppercase mb-4">
            {siteConfig.workflow.sectionBadge}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            {siteConfig.workflow.title}
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            {siteConfig.workflow.subtitle}
          </p>
        </div>

        {/* 4-Step Timeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {siteConfig.workflow.steps.map((step) => (
            <div
              key={step.number}
              className="glass-panel p-7 rounded-2xl relative flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 font-mono font-black text-lg text-white flex items-center justify-center shadow-lg shadow-blue-600/25 group-hover:scale-105 transition-transform">
                    {step.number}
                  </div>
                  <span className="text-[11px] font-bold text-blue-400 bg-blue-600/15 border border-blue-500/20 px-2.5 py-1 rounded-full">
                    {step.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2.5">
                  {step.title}
                </h3>

                <p className="text-slate-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center text-xs text-slate-500 font-medium">
                <span>Phase {step.number} Completion</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA banner */}
        <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/50 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              Ready to expand your store with assisted banking services?
            </h3>
            <p className="text-sm text-slate-300">
              Start registration now and our team will guide you through instant verification.
            </p>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_RETAILER_REGISTER_URL || "/retailer/onboarding"}
            className="px-6 py-3 rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all shrink-0 shadow-lg"
          >
            Become a Retailer Today →
          </a>
        </div>
      </div>
    </section>
  );
};
