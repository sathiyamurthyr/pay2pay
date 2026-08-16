"use client";

import React from "react";
import { ArrowRight, ShieldCheck, CheckCircle2, Store } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { EcosystemCanvas } from "./EcosystemCanvas";

export const HeroSection: React.FC = () => {
  return (
    <section id="home" className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-cyan-500/5 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/30 mb-6">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="text-xs font-bold tracking-wide text-blue-300">
                {siteConfig.hero.badge}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
              Powering the Future of{" "}
              <span className="gradient-text-blue block sm:inline">
                Digital Financial Services
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-xl font-normal">
              {siteConfig.hero.subheading}
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
              <a
                href={process.env.NEXT_PUBLIC_RETAILER_LOGIN_URL || "/retailer-dashboard"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/35 hover:shadow-blue-600/55 hover:brightness-110 active:scale-95 transition-all"
              >
                <span>{siteConfig.hero.primaryCta}</span>
                <ArrowRight size={16} />
              </a>

              <a
                href={process.env.NEXT_PUBLIC_RETAILER_REGISTER_URL || "/retailer/onboarding"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 hover:text-white hover:border-slate-500 font-semibold text-sm transition-all"
              >
                <Store size={16} className="text-blue-400" />
                <span>{siteConfig.hero.secondaryCta}</span>
              </a>

              <a
                href="#services"
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span>{siteConfig.hero.tertiaryCta} ↓</span>
              </a>
            </div>

            {/* Trust Highlights */}
            <div className="mt-10 pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4 w-full">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">Instant Settlements</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">Bank-Grade TLS 1.3</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">24x7 Digital Rails</span>
              </div>
            </div>
          </div>

          {/* Right Hero Graphic Canvas */}
          <div className="lg:col-span-6 w-full">
            <EcosystemCanvas />
          </div>
        </div>
      </div>
    </section>
  );
};
