"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, CheckCircle2, Store } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { EcosystemCanvas } from "./EcosystemCanvas";

export const HeroSection: React.FC = () => {
  return (
    <section id="home" className="relative min-h-[100svh] flex flex-col justify-center pt-24 pb-12 sm:pt-28 sm:pb-14 lg:pt-24 lg:pb-12 overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-cyan-500/5 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24 w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 2xl:gap-16 3xl:gap-24 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-7 3xl:col-span-7 flex flex-col items-start text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 2xl:px-4 2xl:py-1.5 rounded-full bg-blue-600/10 border border-blue-500/30 mb-3.5 2xl:mb-5">
              <ShieldCheck size={14} className="text-blue-400 2xl:w-4 2xl:h-4" />
              <span className="text-xs 2xl:text-sm font-bold tracking-wide text-blue-300">
                {siteConfig.hero.badge}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-[1.6rem] xs:text-2xl sm:text-4xl lg:text-[2.75rem] xl:text-5xl 2xl:text-6xl 3xl:text-7xl font-black gradient-text-gold tracking-tight leading-[1.2] mb-4 2xl:mb-6 max-w-2xl 2xl:max-w-4xl 3xl:max-w-5xl">
              <span className="block">Powering the Future of</span>
              <span className="block">Digital Financial Services</span>
            </h1>

            {/* Subheading */}
            <p className="text-sm sm:text-base 2xl:text-lg 3xl:text-xl text-slate-300 leading-relaxed mb-6 2xl:mb-8 max-w-xl 2xl:max-w-2xl 3xl:max-w-3xl font-normal">
              {siteConfig.hero.subheading}
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 2xl:gap-4 w-full sm:w-auto mb-6 2xl:mb-8">
              <Link
                href="/retailer/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 2xl:h-12 px-5 sm:px-6 2xl:px-8 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm 2xl:text-base shadow-xl shadow-blue-600/35 hover:shadow-blue-600/55 hover:brightness-110 active:scale-95 transition-all"
              >
                <span>{siteConfig.hero.primaryCta}</span>
                <ArrowRight size={15} className="2xl:w-5 2xl:h-5" />
              </Link>

              <Link
                href="/workspaces"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 2xl:h-12 px-5 sm:px-6 2xl:px-8 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 hover:text-white hover:border-slate-500 font-semibold text-xs sm:text-sm 2xl:text-base transition-all"
              >
                <Store size={15} className="text-blue-400 2xl:w-5 2xl:h-5" />
                <span>Partner Workspaces</span>
              </Link>

              <Link
                href="/services"
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 text-xs 2xl:text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span>{siteConfig.hero.tertiaryCta} →</span>
              </Link>
            </div>

            {/* Trust Highlights */}
            <div className="pt-5 2xl:pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-3 2xl:gap-6 w-full">
              <div className="flex items-center gap-2 2xl:gap-3">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0 2xl:w-5 2xl:h-5" />
                <span className="text-xs 2xl:text-sm font-medium text-slate-300">Instant Settlements</span>
              </div>
              <div className="flex items-center gap-2 2xl:gap-3">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0 2xl:w-5 2xl:h-5" />
                <span className="text-xs 2xl:text-sm font-medium text-slate-300">Bank-Grade TLS 1.3</span>
              </div>
              <div className="flex items-center gap-2 2xl:gap-3">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0 2xl:w-5 2xl:h-5" />
                <span className="text-xs 2xl:text-sm font-medium text-slate-300">24x7 Digital Rails</span>
              </div>
            </div>
          </div>

          {/* Right Hero Graphic Canvas */}
          <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-5 3xl:col-span-5 w-full flex items-center justify-center">
            <EcosystemCanvas />
          </div>
        </div>
      </div>
    </section>
  );
};

