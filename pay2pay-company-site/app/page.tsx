"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/header/Navbar";
import { HeroSection } from "@/components/hero/HeroSection";
import { BusinessOverview } from "@/components/overview/BusinessOverview";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { RetailerEcosystem } from "@/components/ecosystem/RetailerEcosystem";
import { HowItWorks } from "@/components/workflow/HowItWorks";
import { SecuritySection } from "@/components/security/SecuritySection";
import { RoleLoginSection } from "@/components/auth-portals/RoleLoginSection";
import { AboutSection } from "@/components/about/AboutSection";
import { ContactSection } from "@/components/contact/ContactSection";
import { Footer } from "@/components/footer/Footer";
import { LegalModal } from "@/components/legal/LegalModal";

export default function HomePage() {
  const [activeLegalDoc, setActiveLegalDoc] = useState<"terms" | "privacy" | "refund" | null>(null);

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Header Navigation */}
      <Navbar />

      <main className="flex-grow">
        {/* 2. Hero Section with Ecosystem Graph */}
        <HeroSection />

        {/* 3. Business Overview */}
        <BusinessOverview />

        {/* 4. Services Grid */}
        <ServicesGrid />

        {/* 5. Retailer Ecosystem Flow */}
        <RetailerEcosystem />

        {/* 6. How Pay2Pay Works */}
        <HowItWorks />

        {/* 7. Security & Compliance */}
        <SecuritySection />

        {/* 8. Role-Based Login Workspace */}
        <RoleLoginSection />

        {/* 9. About Pay2Pay */}
        <AboutSection />

        {/* 10. Contact Us */}
        <ContactSection />
      </main>

      {/* 11. Footer */}
      <Footer onOpenLegal={(docId) => setActiveLegalDoc(docId)} />

      {/* 12. Dynamic Legal Dialog Modal */}
      <LegalModal
        documentId={activeLegalDoc}
        onClose={() => setActiveLegalDoc(null)}
      />
    </div>
  );
}
