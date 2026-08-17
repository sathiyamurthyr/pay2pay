"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Send, Fingerprint, Receipt, Zap, Smartphone, Tv, ArrowRight } from "lucide-react";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

const keyServices = [
  {
    id: "dmt",
    title: "Domestic Money Transfer",
    category: "Financial Services",
    description: "Instant 24x7 IMPS/NEFT fund transfers to any verified bank account in India with sub-second clearance.",
    icon: Send,
    badge: "Instant 24x7",
  },
  {
    id: "aeps",
    title: "AEPS Cash Operations",
    category: "Financial Services",
    description: "Aadhaar biometric cash withdrawal, balance enquiry, and mini statements using approved RD scanners.",
    icon: Fingerprint,
    badge: "Biometric Auth",
  },
  {
    id: "bbps",
    title: "Bharat Bill Payments",
    category: "Bill Payments",
    description: "Centralized BBPS bill payments for electricity, water, LPG piped gas, and municipal charges with instant receipts.",
    icon: Receipt,
    badge: "BBPS Validated",
  },
  {
    id: "mobile-recharge",
    title: "Mobile Prepaid Recharge",
    category: "Utility Payments",
    description: "Instant plan fetch and high-speed prepaid mobile recharge across all major Indian telecom networks.",
    icon: Smartphone,
    badge: "Fast Clearance",
  },
  {
    id: "dth",
    title: "DTH Satellite Recharge",
    category: "Utility Payments",
    description: "Instant top-ups and customer info verification for all major direct-to-home satellite television operators.",
    icon: Tv,
    badge: "Direct Validation",
  },
  {
    id: "electricity",
    title: "Electricity Collections",
    category: "Utility Payments",
    description: "Real-time state electricity board bill lookup and secure clearance with automated consumer SMS alerts.",
    icon: Zap,
    badge: "Pan-India Boards",
  },
];

export const ServicesGrid: React.FC = () => {
  return (
    <section id="services" className="py-20 lg:py-28 2xl:py-36 relative">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* Section Header */}
        <Pay2PayPageHeader
          eyebrow="Key Services"
          titlePrefix="Comprehensive Digital Banking &"
          highlightedTitle="Payment Services"
          description="High-availability digital financial services and utility collections engineered for retail counters and merchant workstations across India."
        />

        {/* Visual Hero Banner for Services */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border-slate-700/60 mb-12 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-[11px] font-bold text-blue-400 bg-blue-600/15 border border-blue-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                Multi-Service Counter
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Empower Your Store with All-in-One Assisted Banking
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Offer domestic money transfer, biometric cash withdrawal, and 50+ utility bill payments directly from a single unified merchant dashboard.
              </p>
              <div className="pt-2">
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
                >
                  <span>Explore All Services</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl group bg-slate-900/60">
              <div className="relative w-full overflow-hidden">
                <Image
                  src="/images/services-preview.jpg"
                  alt="Pay2Pay Digital Services Ecosystem"
                  width={720}
                  height={405}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none rounded-2xl" />
            </div>
          </div>
        </div>

        {/* 6 Key Service Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 2xl:gap-8">
          {keyServices.map((service) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.id}
                className="glass-panel p-6 sm:p-7 rounded-2xl relative group overflow-hidden flex flex-col justify-between hover:border-blue-500/50 transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-md shadow-blue-500/10">
                      <IconComponent size={22} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-full">
                      {service.badge}
                    </span>
                  </div>

                  <div className="text-[11px] font-semibold text-blue-400 mb-1">
                    {service.category}
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                    {service.title}
                  </h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <Link
                    href={`/services`}
                    className="text-xs font-semibold text-blue-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>View Service Details</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explore Full Catalogue CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-105"
          >
            <span>Explore Complete Services Catalogue (Financial & Bill Payments)</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
};
