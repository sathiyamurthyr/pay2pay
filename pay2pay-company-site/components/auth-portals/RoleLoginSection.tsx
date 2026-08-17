"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Store, Users, Network, Layers, ShieldCheck, ArrowRight } from "lucide-react";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

const workspacePreviews = [
  {
    id: "retailer",
    role: "Retailer Workspace",
    badge: "Merchant POS",
    description: "Assisted DMT, AEPS biometric cash, and BBPS utility collection workstation.",
    route: "/retailer/login",
    icon: Store,
    highlighted: true,
  },
  {
    id: "distributor",
    role: "Distributor Workspace",
    badge: "Network Hub",
    description: "Retailer onboarding, real-time liquidity top-ups, and network commission tracking.",
    route: "/distributor/login",
    icon: Users,
    highlighted: false,
  },
  {
    id: "super-distributor",
    role: "Super Distributor",
    badge: "Master Franchise",
    description: "Zonal distribution oversight, multi-tier credit management, and franchise margin payouts.",
    route: "/super-distributor/login",
    icon: Network,
    highlighted: false,
  },
  {
    id: "dit",
    role: "DIT Workspace",
    badge: "Operations",
    description: "Technical gateway connectivity, switch latency telemetry, and service diagnostics.",
    route: "/dit/login",
    icon: Layers,
    highlighted: false,
  },
  {
    id: "admin",
    role: "Company Admin",
    badge: "Enterprise",
    description: "Enterprise compliance audit, KYC approvals, settlement rules, and switch routing.",
    route: "/company-admin/login",
    icon: ShieldCheck,
    highlighted: false,
  },
];

export const RoleLoginSection: React.FC = () => {
  return (
    <section id="workspaces" className="py-20 lg:py-28 2xl:py-36 relative">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* Section Header */}
        <Pay2PayPageHeader
          eyebrow="Role-Based Portals"
          titlePrefix="One Platform."
          highlightedTitle="Multiple Workspaces."
          description="Dedicated, role-segregated operational dashboards connecting authorized partners with banking systems across India."
        />

        {/* Visual & Summary Card */}
        <div className="glass-panel p-6 sm:p-10 2xl:p-12 rounded-3xl border-slate-700/60 shadow-2xl mb-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Workspaces Visual Image */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl group">
              <div className="relative aspect-video w-full">
                <Image
                  src="/images/workspaces-preview.jpg"
                  alt="Pay2Pay Enterprise Workspaces"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-mono bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80">
                <span className="text-blue-400 font-bold">Role-Segregated Workstations</span>
                <span>Encrypted Session Control</span>
              </div>
            </div>

            {/* Right: Operational Summary */}
            <div className="lg:col-span-6 space-y-5">
              <h3 className="text-xl sm:text-2xl 2xl:text-3xl font-extrabold text-white leading-tight">
                Tailored Dashboards Engineered for Every Operational Tier
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Whether you operate a neighborhood retail counter, coordinate regional distributor liquidity, or oversee enterprise banking switches, Pay2Pay delivers dedicated tooling tailored to your business functions.
              </p>

              <div className="pt-2">
                <Link
                  href="/workspaces"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
                >
                  <span>Explore Workspaces</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Workspace Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 items-stretch">
          {workspacePreviews.map((ws) => {
            const IconComp = ws.icon;
            return (
              <div
                key={ws.id}
                className={`rounded-2xl p-6 flex flex-col justify-between relative transition-all duration-300 ${
                  ws.highlighted
                    ? "bg-gradient-to-b from-[#0F1E3A] to-[#081120] border-2 border-blue-500/80 shadow-xl shadow-blue-500/15"
                    : "glass-panel bg-[#081220]/80 hover:border-slate-600 shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        ws.highlighted
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                          : "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      <IconComp size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
                      {ws.badge}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white mb-2">{ws.role}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {ws.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <Link
                    href={ws.route}
                    className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                      ws.highlighted
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
                        : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                    }`}
                  >
                    <span>Launch Portal</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
