"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { HeroSection } from "@/components/hero/HeroSection";
import { BusinessOverview } from "@/components/overview/BusinessOverview";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { RetailerEcosystem } from "@/components/ecosystem/RetailerEcosystem";
import { HowItWorks } from "@/components/workflow/HowItWorks";
import { SecuritySection } from "@/components/security/SecuritySection";
import { RoleLoginSection } from "@/components/auth-portals/RoleLoginSection";

export default function HomePage() {
  return (
    <div className="w-full">
      {/* 01 — HERO */}
      <HeroSection />

      {/* 02 — BUSINESS SNAPSHOT */}
      <BusinessOverview />

      {/* 03 — KEY SERVICES PREVIEW */}
      <ServicesGrid />

      {/* 04 — PAY2PAY ECOSYSTEM PREVIEW */}
      <RetailerEcosystem />

      {/* 05 — HOW IT WORKS PREVIEW */}
      <HowItWorks />

      {/* 06 — SECURITY PREVIEW */}
      <SecuritySection />

      {/* 07 — PARTNER / WORKSPACE PREVIEW */}
      <RoleLoginSection />

      {/* 08 — FINAL CTA */}
      <section className="py-20 lg:py-28 2xl:py-36 relative bg-[#060D18]/90 border-t border-slate-800/80">
        <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
          <div className="p-8 sm:p-14 2xl:p-16 rounded-3xl bg-gradient-to-r from-blue-950/60 via-indigo-950/50 to-slate-900/80 border border-blue-500/30 text-center shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-blue-600/15 rounded-full blur-[100px] pointer-events-none -z-10" />

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles size={14} />
              <span>Get Connected</span>
            </div>

            <h2 className="text-2xl sm:text-4xl 2xl:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
              Ready to Connect With <span className="gradient-text-gold">Pay2Pay</span>?
            </h2>

            <p className="text-slate-300 text-sm sm:text-base 2xl:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Explore our services, partner ecosystem and digital financial platform designed for high reliability and instant settlements.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/services"
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm 2xl:text-base shadow-xl shadow-blue-500/30 hover:brightness-110 active:scale-95 transition-all"
              >
                <span>Explore Services</span>
              </Link>
              <Link
                href="/contact"
                className="px-8 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm 2xl:text-base hover:border-slate-500 transition-all flex items-center gap-2"
              >
                <span>Contact Pay2Pay</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
