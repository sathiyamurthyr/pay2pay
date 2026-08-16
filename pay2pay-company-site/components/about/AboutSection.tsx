"use client";

import React from "react";
import { Target, Compass, Cpu, CheckCircle } from "lucide-react";
import { siteConfig } from "@/config/site-config";

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 lg:py-28 relative bg-[#060D18]/70 border-t border-slate-800/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Overview & Corporate Pillars */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wide uppercase mb-4">
              {siteConfig.about.sectionBadge}
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold gradient-text-gold tracking-tight mb-6">
              {siteConfig.about.title}
            </h2>

            <p className="text-slate-300 text-base leading-relaxed mb-8">
              {siteConfig.about.description}
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl glass-panel border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Target size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">Our Mission</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {siteConfig.about.mission}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl glass-panel border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Compass size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">Our Vision</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {siteConfig.about.vision}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Technology Architecture & Facts */}
          <div className="lg:col-span-6">
            <div className="glass-panel p-8 rounded-3xl border-slate-700/60 relative overflow-hidden shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Technology Architecture</h3>
                  <div className="text-xs text-blue-400 font-medium">Built for Speed & Fault-Tolerance</div>
                </div>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {siteConfig.about.technologyApproach}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-800">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-2xl font-black text-blue-400 font-mono mb-1">99.9%</div>
                  <div className="text-xs text-slate-400 font-medium">Core Platform Uptime SLA</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-2xl font-black text-emerald-400 font-mono mb-1">&lt; 1.5s</div>
                  <div className="text-xs text-slate-400 font-medium">Average Clearance Latency</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-2xl font-black text-amber-400 font-mono mb-1">24x7</div>
                  <div className="text-xs text-slate-400 font-medium">Continuous Virtual Settlement</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-2xl font-black text-indigo-400 font-mono mb-1">TLS 1.3</div>
                  <div className="text-xs text-slate-400 font-medium">Encrypted Payload Security</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
