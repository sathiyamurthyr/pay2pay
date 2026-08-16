"use client";

import React from "react";
import { ArrowRight, ShieldCheck, CheckCircle2, Store } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { EcosystemCanvas } from "./EcosystemCanvas";

export const HeroSection: React.FC = () => {
  return (
    <section
      id="home"
      className="relative min-h-[calc(100svh-72px)] pt-[80px] pb-8 lg:pt-[84px] lg:pb-10 flex flex-col justify-center overflow-hidden"
    >
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-cyan-500/5 blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Hero Content (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/30 mb-3.5">
              <ShieldCheck size={13} className="text-blue-400" />
              <span className="text-[11px] font-bold tracking-wide text-blue-300">
                {siteConfig.hero.badge}
              </span>
            </div>

            {/* Main Headline with responsive clamp sizing */}
            <h1 className="text-3xl sm:text-4xl lg:text-[clamp(2.2rem,3vw,3.4rem)] font-black text-white tracking-tight leading-[1.12] mb-3.5">
              Powering the Future of{" "}
              <span className="gradient-text-blue block sm:inline">
                Digital Financial Services
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6 max-w-xl font-normal">
              {siteConfig.hero.subheading}
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mb-6">
              <a
                href={process.env.NEXT_PUBLIC_RETAILER_LOGIN_URL || "/retailer-dashboard"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:brightness-110 active:scale-95 transition-all"
              >
                <span>{siteConfig.hero.primaryCta}</span>
                <ArrowRight size={15} />
              </a>

              <a
                href={process.env.NEXT_PUBLIC_RETAILER_REGISTER_URL || "/retailer/onboarding"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 hover:text-white hover:border-slate-500 font-semibold text-xs sm:text-sm transition-all"
              >
                <Store size={15} className="text-blue-400" />
                <span>{siteConfig.hero.secondaryCta}</span>
              </a>

              <a
                href="#services"
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span>{siteConfig.hero.tertiaryCta} ↓</span>
              </a>
            </div>

            {/* Trust Highlights */}
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-3 w-full">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                <span className="text-[11px] sm:text-xs font-medium text-slate-300">Instant Settlements</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                <span className="text-[11px] sm:text-xs font-medium text-slate-300">Bank-Grade TLS 1.3</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                <span className="text-[11px] sm:text-xs font-medium text-slate-300">24x7 Digital Rails</span>
              </div>
            </div>
          </div>

          {/* Right Hero Graphic Canvas (5 cols) */}
          <div className="lg:col-span-5 w-full flex items-center justify-center">
            <EcosystemCanvas />
          </div>
        </div>
      </div>
    </section>
  );
};

