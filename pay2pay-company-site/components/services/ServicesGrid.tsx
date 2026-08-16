"use client";

import React from "react";
import { siteConfig } from "@/config/site-config";
import { ServiceCard } from "./ServiceCard";

import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const ServicesGrid: React.FC = () => {
  // Only render active services as per configurable requirements
  const activeServices = siteConfig.services.filter((s) => s.active);

  return (
    <section id="services" className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <Pay2PayPageHeader
          eyebrow="Our Services"
          titlePrefix="Comprehensive Digital Banking &"
          highlightedTitle="Payment Services"
          description="Scalable financial modules engineered for high reliability, instant confirmation, and automated revenue reconciliation."
        />

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
