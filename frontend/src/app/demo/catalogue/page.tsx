"use client";

import React from "react";
import DemoShell from "@/components/inspel-demo/DemoShell";
import ProductCatalogueGrid from "@/components/inspel-demo/ProductCatalogueGrid";

export default function InspelDemoCataloguePage() {
  return (
    <DemoShell>
      <div className="bg-gradient-to-r from-[#040E2B] to-[#0F1E5C] text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Product Catalogue
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100/90 max-w-2xl">
            Compare all eight INSPEL TECHNOLOGIES SOLUTIONS payment modules side by side. Select any individual product to inspect its 18% GST breakdown and complete your purchase via BankMe Pay-in.
          </p>
        </div>
      </div>

      <ProductCatalogueGrid
        title="All Eight Products Available for Direct Purchase"
        subtitle="Prices below are loaded directly from backend pricing configuration with automated 18% GST calculation in INR."
      />
    </DemoShell>
  );
}
