"use client";

import React, { useState } from "react";
import { SalesSidebar } from "./sales-sidebar";
import { SalesHeader } from "./sales-header";
import { SalesMobileNav } from "./sales-mobile-nav";

export const SalesShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row selection:bg-indigo-500 selection:text-white">
      {/* Sidebar: Persistent on Desktop, Slide-out Drawer on Mobile */}
      <SalesSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <SalesHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <SalesMobileNav />
    </div>
  );
};
