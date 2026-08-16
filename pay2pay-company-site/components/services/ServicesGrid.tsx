"use client";

import React from "react";
import { siteConfig } from "@/config/site-config";
import { ServiceCard } from "./ServiceCard";

export const ServicesGrid: React.FC = () => {
  // Only render active services as per configurable requirements
  const activeServices = siteConfig.services.filter((s) => s.active);

  return (
    <section id="services" className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wide uppercase mb-4">
            Configurable Services Portfolio
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Comprehensive Digital Banking & <span className="gradient-text-gold">Payment Services</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Scalable financial modules engineered for high reliability, instant confirmation, and automated revenue reconciliation.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
};
