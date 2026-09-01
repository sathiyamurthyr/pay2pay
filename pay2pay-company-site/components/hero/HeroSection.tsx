"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, CheckCircle2, Store, Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { EcosystemCanvas } from "./EcosystemCanvas";

export const HeroSection: React.FC = () => {
  return (
    <section id="home" className="relative min-h-[100svh] flex flex-col justify-center pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-28 lg:pb-16 overflow-hidden">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-cyan-500/10 blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-blue-900/15 blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-0 w-[350px] h-[350px] bg-indigo-900/10 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24 w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 2xl:gap-16 3xl:gap-24 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-7 3xl:col-span-7 flex flex-col items-start text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 2xl:px-5 2xl:py-2 rounded-full bg-blue-600/15 border border-blue-500/35 mb-5 2xl:mb-7 shadow-lg shadow-blue-500/10 backdrop-blur-xl">
              <ShieldCheck size={15} className="text-blue-400 2xl:w-5 2xl:h-5 shrink-0" />
              <span className="text-xs 2xl:text-sm font-bold tracking-wide text-blue-300">
                {siteConfig.hero.badge}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-[3.2rem] xl:text-[3.6rem] 2xl:text-6xl 3xl:text-7xl font-black tracking-tight leading-[1.12] mb-5 2xl:mb-7 max-w-2xl 2xl:max-w-4xl 3xl:max-w-5xl">
              <span className="block gradient-text-primary">Powering the Future of</span>
              <span className="block gradient-text-blue mt-1">Digital Financial Services</span>
            </h1>

            {/* Subheading */}
            <p className="text-sm sm:text-base 2xl:text-lg 3xl:text-xl text-slate-300 leading-relaxed mb-7 2xl:mb-9 max-w-xl 2xl:max-w-2xl 3xl:max-w-3xl font-normal">
              {siteConfig.hero.subheading}
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 2xl:gap-4 w-full sm:w-auto mb-8 2xl:mb-10">
              <a
                href="https://retailer.pay2pay.in/retailer/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-12 2xl:h-14 px-6 sm:px-8 2xl:px-10 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm 2xl:text-base shadow-xl shadow-blue-600/35 hover:shadow-blue-600/55 hover:brightness-110 active:scale-95 transition-all border border-white/20"
              >
                <span>{siteConfig.hero.primaryCta}</span>
                <ArrowRight size={16} className="2xl:w-5 2xl:h-5" />
              </a>

              <Link
                href="/workspaces"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 2xl:h-14 px-6 sm:px-8 2xl:px-10 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-slate-100 hover:text-white hover:border-slate-500 font-semibold text-sm 2xl:text-base transition-all shadow-lg hover:shadow-slate-800/50 active:scale-95"
              >
                <Store size={16} className="text-blue-400 2xl:w-5 2xl:h-5" />
                <span>Partner Workspaces</span>
              </Link>

              <Link
                href="/services"
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 text-xs sm:text-sm 2xl:text-base font-semibold text-slate-400 hover:text-blue-300 transition-colors"
              >
                <span>{siteConfig.hero.tertiaryCta} →</span>
              </Link>
            </div>

            {/* Trust Highlights — Responsive Grid */}
            <div className="pt-6 2xl:pt-8 border-t border-slate-800/80 grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3 2xl:gap-6 w-full">
              <div className="flex items-center gap-2.5 2xl:gap-3 p-2 xs:p-0">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 2xl:w-5 2xl:h-5" />
                <span className="text-xs 2xl:text-sm font-medium text-slate-200">Instant Settlements</span>
              </div>
              <div className="flex items-center gap-2.5 2xl:gap-3 p-2 xs:p-0">
                <CheckCircle2 size={16} className="text-blue-400 shrink-0 2xl:w-5 2xl:h-5" />
                <span className="text-xs 2xl:text-sm font-medium text-slate-200">Bank-Grade TLS 1.3</span>
              </div>
              <div className="flex items-center gap-2.5 2xl:gap-3 p-2 xs:p-0">
                <CheckCircle2 size={16} className="text-indigo-400 shrink-0 2xl:w-5 2xl:h-5" />
                <span className="text-xs 2xl:text-sm font-medium text-slate-200">24x7 Digital Rails</span>
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

