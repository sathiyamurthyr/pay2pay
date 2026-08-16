"use client";

import React from "react";
import { ArrowRight, ShieldCheck, CheckCircle2, Store } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { EcosystemCanvas } from "./EcosystemCanvas";

export const HeroSection: React.FC = () => {
  return (
    <section id="home" className="relative min-h-[100svh] flex flex-col justify-center pt-24 pb-12 sm:pt-28 sm:pb-14 lg:pt-24 lg:pb-12 overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-cyan-500/5 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col items-start text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/30 mb-3.5">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="text-xs font-bold tracking-wide text-blue-300">
                {siteConfig.hero.badge}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] xl:text-5xl font-black text-white tracking-tight leading-[1.12] mb-4">
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/35 hover:shadow-blue-600/55 hover:brightness-110 active:scale-95 transition-all"
              >
                <span>{siteConfig.hero.primaryCta}</span>
                <ArrowRight size={15} />
              </a>

              <a
                href={process.env.NEXT_PUBLIC_RETAILER_REGISTER_URL || "/retailer/onboarding"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 hover:text-white hover:border-slate-500 font-semibold text-xs sm:text-sm transition-all"
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
            <div className="pt-5 border-t border-slate-800/80 grid grid-cols-3 gap-3 w-full">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">Instant Settlements</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">Bank-Grade TLS 1.3</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">24x7 Digital Rails</span>
              </div>
            </div>
          </div>

          {/* Right Hero Graphic Canvas */}
          <div className="lg:col-span-5 xl:col-span-5 w-full flex items-center justify-center">
            <EcosystemCanvas />
          </div>
        </div>
      </div>
    </section>
  );
};

