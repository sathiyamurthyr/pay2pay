"use client";

import React from "react";
import { LogIn, Check, Shield, Users, Landmark, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site-config";

export const RoleLoginSection: React.FC = () => {
  return (
    <section id="workspaces" className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wide uppercase mb-4">
            Partner Access Hub
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Access Your Pay2Pay Workspace
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Secure, role-segregated operational dashboards connecting authorized partners with banking systems.
          </p>
        </div>

        {/* 3 Prominent Large Cards (Retailer, DIT, SD) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {siteConfig.rolePortals.map((portal) => {
            const isRetailer = portal.id === "retailer";
            const isDit = portal.id === "dit";
            const targetUrl = portal.getUrl();

            return (
              <div
                key={portal.id}
                className={`rounded-3xl p-8 flex flex-col justify-between relative transition-all duration-300 ${
                  portal.highlighted
                    ? "bg-gradient-to-b from-[#0F1E3A] to-[#081120] border-2 border-blue-500 shadow-2xl shadow-blue-500/20 scale-[1.02] md:-translate-y-2 z-10"
                    : "glass-panel bg-[#081220]/80 hover:border-slate-600"
                }`}
              >
                {portal.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-md">
                    Most Popular Portal
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                        isRetailer
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                          : isDit
                          ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                          : "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {isRetailer ? <StoreIcon /> : isDit ? <Users size={22} /> : <Landmark size={22} />}
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
                      {portal.badge}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-white mb-1">
                    {portal.title}
                  </h3>
                  <div className="text-xs font-semibold text-blue-400 mb-4">
                    {portal.subtitle}
                  </div>

                  <p className="text-slate-300 text-sm leading-relaxed mb-6">
                    {portal.description}
                  </p>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 pt-6 border-t border-slate-800 mb-8">
                    {portal.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2.5 text-xs text-slate-200">
                        <div className="w-4 h-4 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                          <Check size={11} />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Login Action CTA */}
                <a
                  href={targetUrl}
                  className={`w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg ${
                    portal.highlighted
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/40 hover:shadow-blue-600/60"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  }`}
                >
                  <LogIn size={16} />
                  <span>{portal.ctaLabel}</span>
                  <ArrowRight size={14} className="opacity-70" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

function StoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
      <path d="M2 7h20"/>
      <path d="M22 7a5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1-5 5 5 5 0 0 1-5-5"/>
    </svg>
  );
}
