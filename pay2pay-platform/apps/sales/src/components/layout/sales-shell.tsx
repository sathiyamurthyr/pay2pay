"use client";

import React, { useState } from "react";
import { SalesSidebar } from "./sales-sidebar";
import { SalesHeader } from "./sales-header";
import { SalesMobileNav } from "./sales-mobile-nav";

export const SalesShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex flex-col md:flex-row selection:bg-[#94003A] selection:text-white font-sans">
      {/* Sidebar: Persistent on Desktop, Slide-out Drawer on Mobile */}
      <SalesSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8 bg-[#F5F6FA]">
        <SalesHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 py-5 px-4 sm:px-6 max-w-[1500px] w-full mx-auto overflow-y-auto bg-[#F5F6FA]">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <SalesMobileNav />
    </div>
  );
};
