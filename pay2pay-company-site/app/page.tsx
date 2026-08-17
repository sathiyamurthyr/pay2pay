"use client";

import React from "react";
import { HeroSection } from "@/components/hero/HeroSection";
import { BusinessOverview } from "@/components/overview/BusinessOverview";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { RetailerEcosystem } from "@/components/ecosystem/RetailerEcosystem";
import { HowItWorks } from "@/components/workflow/HowItWorks";
import { SecuritySection } from "@/components/security/SecuritySection";
import { RoleLoginSection } from "@/components/auth-portals/RoleLoginSection";
import { AboutSection } from "@/components/about/AboutSection";
import { ContactSection } from "@/components/contact/ContactSection";

export default function HomePage() {
  return (
    <div className="w-full">
      {/* 1. Hero Section with Ecosystem Graph */}
      <HeroSection />

      {/* 2. Business Overview Preview */}
      <BusinessOverview />

      {/* 3. Services Grid Preview */}
      <ServicesGrid />

      {/* 4. Retailer Ecosystem Flow Preview */}
      <RetailerEcosystem />

      {/* 5. How Pay2Pay Works Preview */}
      <HowItWorks />

      {/* 6. Security & Compliance Preview */}
      <SecuritySection />

      {/* 7. Role-Based Login Workspace Preview */}
      <RoleLoginSection />

      {/* 8. About Pay2Pay Preview */}
      <AboutSection />

      {/* 9. Contact Us Preview */}
      <ContactSection />
    </div>
  );
}
