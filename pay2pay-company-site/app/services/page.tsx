"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Send,
  Fingerprint,
  FileText,
  Shield,
  Receipt,
  Zap,
  Droplets,
  Flame,
  Smartphone,
  Tv,
  Wallet,
  CheckCircle,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Check,
  LucideIcon,
} from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { ServiceItem } from "@/types/site";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

const iconMap: Record<string, LucideIcon> = {
  Send,
  Fingerprint,
  FileText,
  Shield,
  Receipt,
  Zap,
  Droplets,
  Flame,
  Smartphone,
  Tv,
  Wallet,
};

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "financial" | "bill_payment">("all");

  const filteredServices = siteConfig.services.filter((service) => {
    if (!service.active) return false;
    if (selectedCategory === "all") return true;
    return service.category === selectedCategory;
  });

  const financialServices = siteConfig.services.filter((s) => s.active && s.category === "financial");
  const billPaymentServices = siteConfig.services.filter((s) => s.active && s.category === "bill_payment");

  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* 1. Page Header */}
        <Pay2PayPageHeader
          eyebrow="Services Catalogue"
          titlePrefix="Comprehensive"
          highlightedTitle="Financial & Utility"
          titleSuffix="Services"
          description="High-availability digital financial services and utility collections engineered for retail counters and merchant workstations across India."
        />

        {/* 2. Category Filter Tabs */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-12 flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                : "glass-panel text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            All Services ({siteConfig.services.filter((s) => s.active).length})
          </button>
          <button
            onClick={() => setSelectedCategory("financial")}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              selectedCategory === "financial"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                : "glass-panel text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            Financial Services ({financialServices.length})
          </button>
          <button
            onClick={() => setSelectedCategory("bill_payment")}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              selectedCategory === "bill_payment"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                : "glass-panel text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            Bill Payments & Utilities ({billPaymentServices.length})
          </button>
        </div>

        {/* 3. Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 2xl:gap-8 mb-16 2xl:mb-24">
          {filteredServices.map((service) => {
            const IconComponent = iconMap[service.iconName] || Send;
            const isFinancial = service.category === "financial";

            return (
              <div
                key={service.id}
                className="glass-panel p-7 rounded-3xl flex flex-col justify-between group relative overflow-hidden hover:border-blue-500/50 transition-all shadow-xl hover:shadow-2xl hover:shadow-blue-500/10"
              >
                {/* Glow accent */}
                <div className="absolute -right-10 -top-10 w-28 h-28 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/25 transition-all pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-13 h-13 rounded-2xl bg-blue-600/15 border border-blue-500/25 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-md shadow-blue-500/15 p-3">
                      <IconComponent size={24} />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-[11px] font-semibold text-slate-300">
                      {service.badge || (isFinancial ? "Banking" : "Utility")}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
                    {service.title}
                  </h3>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                    {service.description}
                  </p>

                  {/* Feature List */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-800/80 mb-6">
                    {service.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2.5 text-xs text-slate-300">
                        <div className="w-4 h-4 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                          <Check size={11} />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/contact?service=${service.id}`}
                  className="inline-flex items-center justify-between w-full py-3 px-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white hover:border-blue-500/50 hover:bg-blue-600/20 transition-all group-hover:border-slate-700"
                >
                  <span>Partner Inquiry</span>
                  <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            );
          })}
        </div>

        {/* 4. Operational Assurances & Standards */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border-slate-800 mb-16 2xl:mb-24">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl font-bold text-white mb-2">Platform Assurance & Reliability</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Every service in our catalogue is backed by automated reconciliation, instant transaction receipts, and direct sponsor bank connectivity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-blue-400 font-bold text-sm mb-1">Instant Settlement</div>
              <p className="text-xs text-slate-400">Commissions credited to your virtual wallet instantly upon transaction completion.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-emerald-400 font-bold text-sm mb-1">Automated Receipts</div>
              <p className="text-xs text-slate-400">Generate branded digital tax invoices and thermal print slips for walk-in customers.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-amber-400 font-bold text-sm mb-1">BBPS Validated</div>
              <p className="text-xs text-slate-400">Direct integration with Bharat Bill Payment System ensuring reliable utility bill clearance.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-indigo-400 font-bold text-sm mb-1">Smart Failover</div>
              <p className="text-xs text-slate-400">Dynamic routing automatically redirects traffic if any sponsor bank switch experiences latency.</p>
            </div>
          </div>
        </div>

        {/* 5. Call to Action Banner */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-slate-900/60 border border-blue-500/30 text-center shadow-2xl">
          <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-black text-white mb-4">
            Activate These Services for Your Store
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
            Complete quick digital KYC verification to start offering banking, money transfer, and utility services to your local customers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/workspaces"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-blue-500/30 hover:brightness-110 active:scale-95 transition-all"
            >
              Access Retailer Workspace →
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm hover:border-slate-500 transition-all"
            >
              Contact Sales Team
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
